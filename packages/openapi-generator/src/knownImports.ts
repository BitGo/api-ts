import * as E from 'fp-ts/Either';

import type { Schema } from './ir';

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
  'io-ts': {
    string: () => E.right({ type: 'primitive', value: 'string' }),
    number: () => E.right({ type: 'primitive', value: 'number' }),
    boolean: () => E.right({ type: 'primitive', value: 'boolean' }),
    null: () => E.right({ type: 'primitive', value: 'null' }),
    undefined: () => E.right({ type: 'undefined' }),
    array: (_, innerSchema) => E.right({ type: 'array', items: innerSchema }),
    readonlyArray: (_, innerSchema) => E.right({ type: 'array', items: innerSchema }),
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
      if (arg.type !== 'primitive' || arg.enum === undefined) {
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
        type: 'primitive',
        value: 'string',
        enum: [prop],
      }));
      return E.right({
        type: 'union',
        schemas,
      });
    },
    brand: (_, arg) => E.right(arg),
  },
  'io-ts-types': {
    BigIntFromString: () => E.right({ type: 'primitive', value: 'string' }),
    BooleanFromNumber: () => E.right({ type: 'primitive', value: 'number' }),
    BooleanFromString: () => E.right({ type: 'primitive', value: 'string' }),
    DateFromISOString: () => E.right({ type: 'primitive', value: 'string' }),
    DateFromNumber: () => E.right({ type: 'primitive', value: 'number' }),
    DateFromUnixTime: () => E.right({ type: 'primitive', value: 'number' }),
    IntFromString: () => E.right({ type: 'primitive', value: 'string' }),
    JsonFromString: () => E.right({ type: 'primitive', value: 'string' }),
    nonEmptyArray: (_, innerSchema) => E.right({ type: 'array', items: innerSchema }),
    NonEmptyString: () => E.right({ type: 'primitive', value: 'string' }),
    NumberFromString: () => E.right({ type: 'primitive', value: 'string' }),
    readonlyNonEmptyArray: (_, innerSchema) =>
      E.right({ type: 'array', items: innerSchema }),
    UUID: () => E.right({ type: 'primitive', value: 'string' }),
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
