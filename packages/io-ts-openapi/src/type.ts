import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Alt';
import * as E from 'fp-ts/Either';
import * as RE from 'fp-ts/ReaderEither';
import { OpenAPIV3_1 } from 'openapi-types';
import { InitializerExpressionGetableNode, Node, Type, TypeFlags } from 'ts-morph';

import { toOpenAPISchema as parseExpression } from './expression';

type Primitive = Exclude<OpenAPIV3_1.NonArraySchemaObjectType, 'object'>;

const LiteralTypes: { [K in Primitive]: TypeFlags } = {
  string: TypeFlags.StringLiteral,
  number: TypeFlags.NumberLiteral,
  integer: TypeFlags.BigIntLiteral,
  boolean: TypeFlags.BooleanLiteral,
  null: TypeFlags.Null,
};

const PrimitiveTypes: { [K in Primitive]: TypeFlags } = {
  string: TypeFlags.String,
  number: TypeFlags.Number,
  integer: TypeFlags.BigInt,
  boolean: TypeFlags.Boolean,
  null: TypeFlags.Null,
};

type ParseError = string;

type ParseUnrepresentable = {
  type: 'unrepresentable';
  meaning: 'undefined' | 'symbol';
};

type ParseSchema = {
  type: 'schema';
  schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
  required: boolean;
};

type ParseResult = ParseSchema | ParseUnrepresentable;

type ParseEnv = {
  location: Node;
  type: Type;
  memo: any;
};

type ParseStep = RE.ReaderEither<ParseEnv, ParseError, ParseResult>;

const parseFatal = (error: string) => E.left<ParseError>(error);
const parseUnrepresentable = (meaning: ParseUnrepresentable['meaning']) =>
  E.right<never, ParseUnrepresentable>({ type: 'unrepresentable', meaning });
const parseAccept = (
  schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
  required: boolean = true,
) => E.right<never, ParseSchema>({ type: 'schema', schema, required });

export const isReferenceObject = (
  o: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
): o is OpenAPIV3_1.ReferenceObject => o.hasOwnProperty('$ref');

export const isSchemaObject = (
  o: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
): o is OpenAPIV3_1.SchemaObject => o.hasOwnProperty('properties');

export const parseUndefined: ParseStep = (ctx) =>
  ctx.type.isUndefined()
    ? parseUnrepresentable('undefined')
    : parseFatal('type not undefined');

export const parseSymbol: ParseStep = (ctx) =>
  ctx.type.getFlags() & TypeFlags.UniqueESSymbol
    ? parseUnrepresentable('symbol')
    : parseFatal('type not symbol');

export const parseUnknown: ParseStep = (ctx) =>
  ctx.type.isUnknown()
    ? parseAccept({ title: 'unknown' })
    : parseFatal('type not unknown');

export const parsePrimitive: ParseStep = (ctx) => {
  const { type: t } = ctx;
  for (const [type, flag] of Object.entries(PrimitiveTypes)) {
    if (t.getFlags() & flag) {
      return parseAccept({
        type: type as Primitive,
      });
    }
  }
  return parseFatal('type not primitive');
};

export const parseLiteral: ParseStep = (ctx) => {
  const { type: t } = ctx;
  if (!t.isLiteral()) {
    return parseFatal('type not literal');
  }
  for (const [type, flag] of Object.entries(LiteralTypes)) {
    if (t.getFlags() & flag) {
      const value = t.getLiteralValue();
      if (value === undefined) {
        return parseFatal('could not read literal value');
      }
      return parseAccept({
        type: type as Primitive,
        enum: [String(value)],
      });
    }
  }
  return parseFatal('type not literal');
};

export const parseBooleanLiteral: ParseStep = (ctx) => {
  const { type: t } = ctx;
  if (!t.isBooleanLiteral()) {
    return parseFatal('type not boolean literal');
  }
  // TODO: Why does `getLiteralValue` not work for booleans and is there
  // a way to check for true/false via flags.
  return parseAccept({
    type: 'boolean',
    enum: [t.getText()],
  });
};

export const parseArray: ParseStep = (ctx) => {
  const { type: t } = ctx;
  if (!t.isArray()) {
    return parseFatal('type not array');
  }
  const innerType = t.getArrayElementType();
  if (innerType === undefined) {
    return parseFatal('could not read array type');
  }
  return pipe(
    parseType({ ...ctx, type: innerType }),
    E.chainW((result) =>
      result.type === 'schema'
        ? parseAccept({
            type: 'array',
            items: result.schema,
          })
        : parseFatal('unrepresentable array type'),
    ),
  );
};

export const parseObject: ParseStep = (ctx) => {
  const { location, memo, type: t } = ctx;
  if (t.isArray() || !t.isObject()) {
    return parseFatal('type not object');
  }

  const result: OpenAPIV3_1.SchemaObject = {
    type: 'object',
    required: [],
    properties: {},
  };

  for (const propSym of t.getProperties()) {
    const name = propSym.getName();
    const propType = propSym.getTypeAtLocation(location);

    const decls = propSym.getDeclarations();
    const idx = decls.findIndex((d) => Node.isInitializerExpressionGetable(d));

    let propResultE: E.Either<string, ParseResult> = E.left('uninit');
    if (idx >= 0) {
      propResultE = pipe(
        E.fromNullable('no initializer')(
          (decls[idx] as InitializerExpressionGetableNode & Node).getInitializer(),
        ),
        E.chain((expr) => parseExpression(expr)({ memo })),
        E.map((schema) => ({ type: 'schema', ...schema } as const)),
        E.orElse(() => parseType({ ...ctx, type: propType })),
      );
    } else {
      propResultE = parseType({ ...ctx, type: propType });
    }
    if (E.isLeft(propResultE)) {
      return propResultE;
    }

    const propResult = E.getOrElseW(() => {
      throw new Error('Unwrapping checked left');
    })(propResultE);
    if (propResult.type === 'unrepresentable') {
      if (propResult.meaning === 'undefined') {
        return parseFatal('unrepresentable object property');
      } else {
        return parseUnrepresentable('symbol');
      }
    }
    if (propResult.required) {
      result.required?.push(name);
    }
    result.properties![name] = propResult.schema;
  }

  const indexType = t.getStringIndexType();
  if (indexType !== undefined) {
    const indexSchemaE = parseType({ ...ctx, type: indexType });
    if (E.isLeft(indexSchemaE)) {
      return indexSchemaE;
    }
    const indexSchema = E.getOrElseW(() => {
      throw new Error('Unwrapping checked left ');
    })(indexSchemaE);
    if (indexSchema.type === 'unrepresentable') {
      return parseFatal('unrepresentable string record type');
    }
    result.additionalProperties = indexSchema.schema;
  }

  if (result.required?.length === 0) {
    delete result.required;
  }

  return parseAccept(result);
};

export const parseIntersection: ParseStep = (ctx) => {
  const { type: t } = ctx;
  if (!t.isIntersection()) {
    return parseFatal('type not intersection');
  }

  // Initialize this with an empty schema object `{}` that will be used to
  // aggregate together all the properties of the inner types so long as they
  // are also plain schema objects (so not refs, unions, etc)
  let allOf: [
    OpenAPIV3_1.SchemaObject,
    ...(OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject)[]
  ] = [{}];

  for (const innerType of t.getIntersectionTypes()) {
    const innerResultE = parseType({ ...ctx, type: innerType });
    if (E.isLeft(innerResultE)) {
      return innerResultE;
    }
    const innerResult = E.getOrElseW(() => {
      throw new Error('Unwrapping checked left');
    })(innerResultE);
    if (innerResult.type === 'unrepresentable') {
      if (innerResult.meaning === 'undefined') {
        return parseFatal('unrepresentable intersected type');
      } else {
        continue;
      }
    } else if (isReferenceObject(innerResult.schema)) {
      allOf.push(innerResult.schema);
    } else if (innerResult.schema.allOf !== undefined) {
      allOf = [...allOf, ...innerResult.schema.allOf];
    } else if (innerResult.schema.type === 'object') {
      // TODO: Handle overlapping properties (including additionalProperties) in intersected types by intersecting
      // them instead of overwriting.
      const mainSchema = allOf[0];
      allOf[0] = {
        type: 'object',
        required: [
          ...(mainSchema.required ?? []),
          ...(innerResult.schema.required ?? []),
        ],
        properties: {
          ...mainSchema.properties,
          ...innerResult.schema.properties,
        },
      };
    } else {
      allOf.push(innerResult.schema);
    }
  }
  if (allOf.length === 1) {
    const schema = allOf[0];
    if (Object.keys(schema).length === 0) {
      return parseFatal('empty intersection');
    } else {
      return parseAccept(schema);
    }
  } else {
    return parseAccept({ allOf });
  }
};

export const parseUnion: ParseStep = (ctx) => {
  const { type: t } = ctx;
  if (!t.isUnion()) {
    return parseFatal('type not union');
  }
  let required = true;
  let innerSchemas: (OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject)[] = [];
  let primitiveEnums: { [K in Primitive]?: string[] } = {};

  const addSchema = (
    schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject,
  ) => {
    if (
      isReferenceObject(schema) ||
      schema.type === undefined ||
      Array.isArray(schema.type)
    ) {
      innerSchemas.push(schema);
    } else if (schema.oneOf !== undefined) {
      schema.oneOf.forEach(addSchema);
    } else if (
      PrimitiveTypes.hasOwnProperty(schema.type) &&
      schema.enum !== undefined
    ) {
      const primitive = schema.type as Primitive;
      const current = primitiveEnums[primitive] ?? [];
      primitiveEnums[primitive] = [...current, ...schema.enum];
    } else {
      innerSchemas.push(schema);
    }
  };

  for (const innerType of t.getUnionTypes()) {
    const innerResultE = parseType({ ...ctx, type: innerType });
    if (E.isLeft(innerResultE)) {
      return innerResultE;
    }
    const innerResult = E.getOrElseW(() => {
      throw new Error('Unwrapping checked left');
    })(innerResultE);
    if (innerResult.type === 'unrepresentable') {
      if (innerResult.meaning === 'symbol') {
        return parseFatal('union with symbol');
      } else {
        required = false;
        continue;
      }
    } else {
      addSchema(innerResult.schema);
    }
  }

  for (const [type, enumValues] of Object.entries(primitiveEnums)) {
    innerSchemas.push({ type: type as Primitive, enum: enumValues });
  }

  if (innerSchemas.length === 0) {
    return parseFatal('empty union');
  } else if (innerSchemas.length === 1) {
    return parseAccept(innerSchemas[0]!, required);
  } else {
    return parseAccept({ oneOf: innerSchemas }, required);
  }
};

const parseFail: ParseStep = ({ type: t }) =>
  parseFatal(`Could not parse type: ${t.getText()}`);

export const parseType: ParseStep = A.altAll(RE.Alt)(parseUndefined)([
  parseSymbol,
  parseBooleanLiteral,
  parseLiteral,
  parsePrimitive,
  parseArray,
  parseObject,
  parseIntersection,
  parseUnion,
  parseUnknown,
  parseFail,
]);
