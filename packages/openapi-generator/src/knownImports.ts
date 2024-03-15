import * as E from 'fp-ts/Either';

import { isPrimitive, type Schema } from './ir';

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
        return E.left('assign must have at least 2 arguments');
      }
      const [target, ...sources] = schemas;
      if (target === undefined) {
        return E.left('assign target must be object');
      } else if (target.type !== 'object') {
        return E.left('assign target must be object');
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
    string: () => E.right({ type: 'string' }),
    number: () => E.right({ type: 'number' }),
    bigint: () => E.right({ type: 'number' }),
    boolean: () => E.right({ type: 'boolean' }),
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
        return E.left('typeC parameter must be object');
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
        return E.left('typeC parameter must be object');
      }
      const props = Object.entries(schema.properties).reduce((acc, [key, prop]) => {
        return { ...acc, [key]: prop };
      }, {});
      return E.right({ type: 'object', properties: props, required: [] });
    },
    exact: (_, schema) => E.right(schema),
    strict: (_, schema) => {
      if (schema.type !== 'object') {
        return E.left('exactC parameter must be object');
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
    record: (_, _domain, codomain) => {
      if (!codomain) {
        return E.left('Codomain of record must be specified');
      } else {
        return E.right({ type: 'record', codomain });
      }
    },
    union: (_, schema) => {
      if (schema.type !== 'tuple') {
        return E.left('unionC parameter must be array');
      }
      return E.right({ type: 'union', schemas: schema.schemas });
    },
    intersection: (_, schema) => {
      if (schema.type !== 'tuple') {
        return E.left('unionC parameter must be array');
      }
      return E.right({ type: 'intersection', schemas: schema.schemas });
    },
    literal: (_, arg) => {
      if (!isPrimitive(arg) || arg.enum === undefined) {
        return E.left(`Unimplemented literal type ${arg.type}`);
      } else {
        return E.right(arg);
      }
    },
    keyof: (_, arg) => {
      if (arg.type !== 'object') {
        return E.left(`Unimplemented keyof type ${arg.type}`);
      }
      const schemas: Schema[] = Object.keys(arg.properties).map((prop) => ({
        type: 'string',
        enum: [prop],
      }));
      return E.right({
        type: 'union',
        schemas,
      });
    },
    brand: (_, arg) => E.right(arg),
    UnknownRecord: () => E.right({ type: 'record', codomain: { type: 'any' } }),
    void: () => E.right({ type: 'undefined' }),
  },
  'io-ts-types': {
    BigIntFromString: () => E.right({ type: 'string' }),
    BooleanFromNumber: () => E.right({ type: 'number' }),
    BooleanFromString: () => E.right({ type: 'string' }),
    DateFromISOString: () => E.right({ type: 'string' }),
    DateFromNumber: () => E.right({ type: 'number' }),
    DateFromUnixTime: () => E.right({ type: 'number' }),
    IntFromString: () => E.right({ type: 'string' }),
    JsonFromString: () => E.right({ type: 'string' }),
    nonEmptyArray: (_, innerSchema) => E.right({ type: 'array', items: innerSchema }),
    NonEmptyString: () => E.right({ type: 'string' }),
    NumberFromString: () => E.right({ type: 'string' }),
    readonlyNonEmptyArray: (_, innerSchema) =>
      E.right({ type: 'array', items: innerSchema }),
    UUID: () => E.right({ type: 'string' }),
    Json: () => E.right({ type: 'any' }),
    JsonRecord: () => E.right({ type: 'record', codomain: { type: 'any' } }),
    withFallback: (_, schema, fallback) =>
      E.right({ type: 'union', schemas: [schema, fallback] }),
    fromNullable: (_, schema) =>
      E.right({ type: 'union', schemas: [schema, { type: 'null' }] }),
    date: () => E.right({ type: 'string', format: 'date' }),
  },
  '@api-ts/io-ts-http': {
    optional: (_, innerSchema) =>
      E.right({ type: 'union', schemas: [innerSchema, { type: 'undefined' }] }),
    optionalized: (_, props) => {
      if (props.type !== 'object') {
        return E.left('optionalized parameter must be object');
      }
      const required = Object.keys(props.properties).filter(
        (key) => !isOptional(props.properties[key]!),
      );
      return E.right({ type: 'object', properties: props.properties, required });
    },
    httpRequest: (deref, arg) => {
      if (arg.type !== 'object') {
        return E.left(`Unimplemented httpRequest type ${arg.type}`);
      }
      const properties: Record<string, Schema> = {};
      for (const [outerKey, outerValue] of Object.entries(arg.properties)) {
        const innerPropsE = deref(outerValue);

        if (E.isLeft(innerPropsE)) {
          return innerPropsE;
        }
        const innerProps = innerPropsE.right;
        if (innerProps.type !== 'object') {
          return E.left(`Unimplemented httpRequest type ${innerProps.type}`);
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
        return E.left('httpRoute parameter must be object');
      }
      const props = Object.entries(schema.properties).reduce((acc, [key, prop]) => {
        const derefedE = deref(prop);
        if (E.isLeft(derefedE)) {
          return acc;
        }
        return { ...acc, [key]: derefedE.right };
      }, {});
      return E.right({
        type: 'object',
        properties: props,
        required: Object.keys(props),
      });
    },
  },
};
