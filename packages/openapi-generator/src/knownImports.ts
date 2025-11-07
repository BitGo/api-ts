import * as E from 'fp-ts/Either';

import { isPrimitive, type Schema } from './ir';
import { errorLeft } from './error';

export type DerefFn = (ref: Schema) => E.Either<string, Schema>;
export type KnownCodec = (
  deref: DerefFn,
  ...schemas: Schema[]
) => E.Either<string, Schema>;

export type KnownImportEntry = Record<string, KnownCodec>;

export type KnownImports = Record<string, KnownImportEntry>;

function isOptional(schema: Schema): boolean {
  if (schema.type === 'undefined') {
    return true;
  } else if (schema.type === 'union') {
    return schema.schemas.findIndex(isOptional) >= 0;
  } else {
    return false;
  }
}

// TODO: Read this from a JSON (or YAML?) file

export const KNOWN_IMPORTS: KnownImports = {
  global: {
    'Object.assign': (_, ...schemas) => {
      if (schemas.length < 2) {
        return errorLeft('assign must have at least 2 arguments');
      }
      const [target, ...sources] = schemas;
      if (target === undefined) {
        return errorLeft('assign target must be object');
      } else if (target.type !== 'object') {
        return errorLeft('assign target must be object');
      }
      const properties = sources.reduce((acc, source) => {
        if (source.type !== 'object') {
          return acc;
        }
        return { ...acc, ...source.properties };
      }, target.properties);
      return E.right({ type: 'object', properties, required: Object.keys(properties) });
    },
  },
  'io-ts': {
    string: () => E.right({ type: 'string', primitive: true }),
    number: () => E.right({ type: 'number', primitive: true }),
    bigint: () => E.right({ type: 'number' }),
    boolean: () => E.right({ type: 'boolean', primitive: true }),
    null: () => E.right({ type: 'null' }),
    nullType: () => E.right({ type: 'null' }),
    undefined: () => E.right({ type: 'undefined' }),
    unknown: () => E.right({ type: 'any' }),
    any: () => E.right({ type: 'any' }),
    array: (_, innerSchema) => E.right({ type: 'array', items: innerSchema }),
    readonlyArray: (_, innerSchema) => E.right({ type: 'array', items: innerSchema }),
    object: () => E.right({ type: 'object', properties: {}, required: [] }),
    type: (_, schema) => {
      if (schema.type !== 'object') {
        return errorLeft('typeC parameter must be object');
      }
      const props = Object.entries(schema.properties).reduce((acc, [key, prop]) => {
        return { ...acc, [key]: prop };
      }, {});
      return E.right({
        type: 'object',
        properties: props,
        required: Object.keys(props),
      });
    },
    partial: (_, schema) => {
      if (schema.type !== 'object') {
        return errorLeft('typeC parameter must be object');
      }
      const props = Object.entries(schema.properties).reduce((acc, [key, prop]) => {
        return { ...acc, [key]: prop };
      }, {});
      return E.right({ type: 'object', properties: props, required: [] });
    },
    exact: (_, schema) => E.right(schema),
    strict: (_, schema) => {
      if (schema.type !== 'object') {
        return errorLeft('exactC parameter must be object');
      }
      const props = Object.entries(schema.properties).reduce((acc, [key, prop]) => {
        return { ...acc, [key]: prop };
      }, {});
      return E.right({
        type: 'object',
        properties: props,
        required: Object.keys(props),
      });
    },
    record: (_, domain, codomain) => {
      if (!codomain) {
        return errorLeft('Codomain of record must be specified');
      } else {
        return E.right({ type: 'record', domain, codomain });
      }
    },
    union: (_, schema) => {
      if (schema.type !== 'tuple') {
        return errorLeft('unionC parameter must be array');
      }
      return E.right({ type: 'union', schemas: schema.schemas });
    },
    intersection: (_, schema) => {
      if (schema.type !== 'tuple') {
        return errorLeft('unionC parameter must be array');
      }
      return E.right({ type: 'intersection', schemas: schema.schemas });
    },
    literal: (_, arg) => {
      if (!isPrimitive(arg) || arg.enum === undefined) {
        return errorLeft(`Unimplemented literal type ${arg.type}`);
      } else {
        return E.right(arg);
      }
    },
    keyof: (_, arg) => {
      if (arg.type !== 'object') {
        return errorLeft(`Unimplemented keyof type ${arg.type}`);
      }
      const schemas: Schema[] = Object.keys(arg.properties).map((prop) => {
        const propertySchema = arg.properties[prop];
        return {
          type: 'string',
          enum: [prop],
          // Preserve the comment from the original property
          ...(propertySchema?.comment ? { comment: propertySchema.comment } : {}),
        };
      });

      return E.right({
        type: 'union',
        schemas,
      });
    },
    brand: (_, arg) => E.right(arg),
    UnknownRecord: () => E.right({ type: 'record', codomain: { type: 'any' } }),
    void: () => E.right({ type: 'undefined' }),
    identity: (_, arg) => E.right(arg),
  },
  'io-ts-numbers': {
    NumberFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        pattern: '^\\d+$',
        decodedType: 'number',
      }),
    NaturalFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        decodedType: 'number',
      }),
    Negative: () =>
      E.right({
        type: 'number',
        maximum: 0,
        exclusiveMaximum: true,
      }),
    NegativeFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        maximum: 0,
        exclusiveMaximum: true,
        decodedType: 'number',
      }),
    NegativeInt: () =>
      E.right({
        type: 'number',
        maximum: 0,
        exclusiveMaximum: true,
      }),
    NegativeIntFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        maximum: 0,
        exclusiveMaximum: true,
        decodedType: 'number',
      }),
    NonNegative: () =>
      E.right({
        type: 'number',
        minimum: 0,
      }),
    NonNegativeFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        minimum: 0,
        decodedType: 'number',
      }),
    NonNegativeInt: () =>
      E.right({
        type: 'number',
        minimum: 0,
      }),
    NonNegativeIntFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        decodedType: 'number',
      }),
    NonPositive: () =>
      E.right({
        type: 'number',
        maximum: 0,
      }),
    NonPositiveFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        maximum: 0,
        decodedType: 'number',
      }),
    NonPositiveInt: () =>
      E.right({
        type: 'number',
        maximum: 0,
      }),
    NonPositiveIntFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        maximum: 0,
        decodedType: 'number',
      }),
    NonZero: () =>
      E.right({
        type: 'number',
      }),
    NonZeroFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        decodedType: 'number',
      }),
    NonZeroInt: () =>
      E.right({
        type: 'number',
      }),
    NonZeroIntFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        decodedType: 'number',
      }),
    Positive: () =>
      E.right({
        type: 'number',
        minimum: 0,
        exclusiveMinimum: true,
      }),
    PositiveFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        minimum: 0,
        exclusiveMinimum: true,
        decodedType: 'number',
      }),
    Zero: () =>
      E.right({
        type: 'number',
      }),
    ZeroFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        decodedType: 'number',
      }),
  },
  'io-ts-bigint': {
    BigIntFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        decodedType: 'bigint',
      }),
    NegativeBigInt: () =>
      E.right({
        type: 'number',
        maximum: -1,
      }),
    NegativeBigIntFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        maximum: -1,
        decodedType: 'bigint',
      }),
    NonEmptyString: () => E.right({ type: 'string', minLength: 1 }),
    NonNegativeBigInt: () => E.right({ type: 'number', minimum: 0 }),
    NonNegativeBigIntFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        maximum: 0,
        decodedType: 'bigint',
      }),
    NonPositiveBigInt: () =>
      E.right({
        type: 'number',
        maximum: 0,
      }),
    NonPositiveBigIntFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        maximum: 0,
        decodedType: 'bigint',
      }),
    NonZeroBigInt: () => E.right({ type: 'number' }),
    NonZeroBigIntFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        decodedType: 'bigint',
      }),
    PositiveBigInt: () => E.right({ type: 'number', minimum: 1 }),
    PositiveBigIntFromString: () =>
      E.right({
        type: 'string',
        format: 'number',
        minimum: 1,
        decodedType: 'bigint',
      }),
    ZeroBigInt: () => E.right({ type: 'number' }),
    ZeroBigIntFromString: () =>
      E.right({ type: 'string', format: 'number', decodedType: 'bigint' }),
  },
  'io-ts-types': {
    NumberFromString: () =>
      E.right({ type: 'string', format: 'number', decodedType: 'number' }),
    BigIntFromString: () =>
      E.right({ type: 'string', format: 'number', decodedType: 'bigint' }),
    BooleanFromNumber: () =>
      E.right({ type: 'number', enum: [0, 1], decodedType: 'boolean' }),
    BooleanFromString: () => E.right({ type: 'boolean' }),
    DateFromISOString: () =>
      E.right({ type: 'string', format: 'date-time', title: 'ISO Date String' }),
    DateFromNumber: () =>
      E.right({
        title: 'Unix Time (milliseconds)',
        type: 'number',
        description: 'Number of milliseconds since the Unix epoch',
        format: 'number',
      }),
    DateFromUnixTime: () =>
      E.right({
        title: 'Unix Time (seconds)',
        type: 'number',
        format: 'number',
        description: 'Number of seconds since the Unix epoch',
      }),
    IntFromString: () =>
      E.right({ type: 'string', format: 'integer', decodedType: 'number' }),
    JsonFromString: () => E.right({ type: 'string', title: 'JSON String' }),
    nonEmptyArray: (_, innerSchema) =>
      E.right({ type: 'array', items: innerSchema, minItems: 1 }),
    NonEmptyString: () => E.right({ type: 'string', minLength: 1 }),
    readonlyNonEmptyArray: (_, innerSchema) =>
      E.right({ type: 'array', items: innerSchema }),
    UUID: () => E.right({ type: 'string', title: 'uuid' }),
    Json: () => E.right({ type: 'any', title: 'JSON' }),
    JsonRecord: () => E.right({ type: 'record', codomain: { type: 'any' } }),
    withFallback: (_, schema, fallback) =>
      E.right({ type: 'union', schemas: [schema, fallback] }),
    fromNullable: (_, schema) =>
      E.right({ type: 'union', schemas: [schema, { type: 'null' }] }),
    date: () => E.right({ type: 'string', format: 'date', title: 'Date String' }),
  },
  '@api-ts/io-ts-http': {
    optional: (_, innerSchema) =>
      E.right({ type: 'union', schemas: [innerSchema, { type: 'undefined' }] }),
    optionalized: (_, props) => {
      if (props.type !== 'object') {
        return errorLeft('optionalized parameter must be object');
      }
      const required = Object.keys(props.properties).filter(
        (key) => !isOptional(props.properties[key]!),
      );
      return E.right({ type: 'object', properties: props.properties, required });
    },
    httpRequest: (deref, arg) => {
      if (arg.type !== 'object') {
        return errorLeft(`Unimplemented httpRequest type ${arg.type}`);
      }
      const properties: Record<string, Schema> = {};
      for (const [outerKey, outerValue] of Object.entries(arg.properties)) {
        const innerPropsE = deref(outerValue);

        if (E.isLeft(innerPropsE)) {
          return innerPropsE;
        }
        const innerProps = innerPropsE.right;
        if (innerProps.type !== 'object') {
          return errorLeft(`Unimplemented httpRequest type ${innerProps.type}`);
        }

        innerProps.required = innerProps.required.filter(
          (key) => !isOptional(innerProps.properties[key]!),
        );
        properties[outerKey] = innerProps;
      }

      return E.right({
        type: 'object',
        properties,
        required: Object.keys(properties).filter(
          (key) => !isOptional(properties[key]!),
        ),
      });
    },
    httpRoute: (deref, schema) => {
      if (schema.type !== 'object') {
        return errorLeft('httpRoute parameter must be object');
      }
      const props: Record<string, Schema> = {};
      for (const [key, value] of Object.entries(schema.properties)) {
        const derefedE = deref(value);
        if (E.isLeft(derefedE)) {
          return derefedE;
        }
        props[key] = derefedE.right;
      }
      return E.right({
        type: 'object',
        properties: props,
        required: Object.keys(props),
      });
    },
  },
};
