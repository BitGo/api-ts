import { combineComments } from './comments';
import { isPrimitive, type Primitive, type Schema } from './ir';

export type OptimizeFn = (schema: Schema) => Schema;

export function foldIntersection(schema: Schema, optimize: OptimizeFn): Schema {
  if (schema.type !== 'intersection') {
    return schema;
  }

  const innerSchemas = schema.schemas.map(optimize);
  let combinedObject: Schema & { type: 'object' } = {
    type: 'object',
    properties: {},
    required: [],
  };
  let result: Schema = combinedObject;
  innerSchemas.forEach((innerSchema) => {
    if (innerSchema.type === 'object') {
      Object.assign(combinedObject.properties, innerSchema.properties);
      combinedObject.required.push(...innerSchema.required);
    } else if (result.type === 'intersection') {
      result.schemas.push(innerSchema);
    } else {
      result = {
        type: 'intersection',
        schemas: [combinedObject, innerSchema],
      };
    }
  });

  return result;
}

function consolidateUnion(schema: Schema): Schema {
  if (schema.type !== 'union') return schema;
  if (schema.schemas.length === 1) return schema.schemas[0]!;
  if (schema.schemas.length === 0) return { type: 'undefined' };

  const consolidatableTypes = ['boolean', 'number', 'string'];
  const innerSchemas = schema.schemas.map(optimize);

  const isConsolidatableType = (s: Schema): boolean => {
    return (
      (s.primitive && consolidatableTypes.includes(s.type)) ||
      (s.decodedType !== undefined && consolidatableTypes.includes(s.decodedType))
    );
  };

  /**
   * We need to check three things:
   * 1. All the schemas satisfy isConsolidatableType
   * 2. All the schemas have the same decodedType type (aka type at runtime, or the `A` type of the codec)
   * 3. At least one of the schemas is a primitive type
   *
   * If all these conditions are satisfied, we can prove to ourselves that this is a union that
   * we can consolidate to the decodedType (runtime) type.
   */

  const allConsolidatable = innerSchemas.every(isConsolidatableType);
  const hasPrimitive = innerSchemas.some((s: Schema) => s.primitive);

  const innerSchemaTypes = new Set(innerSchemas.map((s) => s.decodedType || s.type));
  const areSameRuntimeType = innerSchemaTypes.size === 1;

  if (allConsolidatable && areSameRuntimeType && hasPrimitive) {
    return { type: Array.from(innerSchemaTypes)[0] as Primitive['type'] };
  } else {
    return schema;
  }
}

function mergeUnions(schema: Schema): Schema {
  if (schema.type !== 'union') return schema;
  if (schema.schemas.length === 1) return schema.schemas[0]!;
  if (schema.schemas.length === 0) return { type: 'undefined' };

  // Stringified schemas (i.e. hashes of the schemas) to avoid duplicates
  const resultingSchemas: Set<string> = new Set();

  // Function to make the result of JSON.stringify deterministic (i.e. keys are all sorted alphabetically)
  const sortObj = (obj: object): object =>
    obj === null || typeof obj !== 'object'
      ? obj
      : Array.isArray(obj)
        ? obj.map(sortObj)
        : Object.assign(
            {},
            ...Object.entries(obj)
              .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
              .map(([k, v]) => ({ [k]: sortObj(v) })),
          );

  // Deterministic version of JSON.stringify
  const deterministicStringify = (obj: object) => JSON.stringify(sortObj(obj));

  schema.schemas.forEach((innerSchema) => {
    if (innerSchema.type === 'union') {
      const merged = mergeUnions(innerSchema);
      resultingSchemas.add(deterministicStringify(merged));
    } else {
      resultingSchemas.add(deterministicStringify(innerSchema));
    }
  });

  if (resultingSchemas.size === 1) return JSON.parse(Array.from(resultingSchemas)[0]!);

  return {
    type: 'union',
    schemas: Array.from(resultingSchemas)
      .filter((s) => s != undefined)
      .map((s) => JSON.parse(s)),
  };
}

export function simplifyUnion(schema: Schema, optimize: OptimizeFn): Schema {
  if (schema.type !== 'union') return schema;
  if (schema.schemas.length === 1) return schema.schemas[0]!;
  if (schema.schemas.length === 0) return { type: 'undefined' };

  const innerSchemas = schema.schemas.map(optimize);

  const literals: Record<Primitive['type'], Set<any>> = {
    string: new Set(),
    number: new Set(),
    integer: new Set(),
    boolean: new Set(),
    null: new Set(),
  };
  const remainder: Schema[] = [];
  innerSchemas.forEach((innerSchema) => {
    if (isPrimitive(innerSchema) && innerSchema.enum !== undefined) {
      innerSchema.enum.forEach((value) => {
        literals[innerSchema.type].add(value);
      });
    } else {
      remainder.push(innerSchema);
    }
  });
  const result: Schema = {
    type: 'union',
    schemas: remainder,
  };
  for (const [key, value] of Object.entries(literals)) {
    if (value.size > 0) {
      result.schemas.push({ type: key as any, enum: Array.from(value) });
    }
  }

  if (result.schemas.length === 1) {
    return result.schemas[0]!;
  } else {
    return result;
  }
}

export function filterUndefinedUnion(schema: Schema): [boolean, Schema] {
  if (schema.type !== 'union') {
    return [false, schema];
  }

  const undefinedIndex = schema.schemas.findIndex((s) => s.type === 'undefined');
  if (undefinedIndex < 0) {
    return [false, schema];
  }

  const schemas = schema.schemas.filter((s) => s.type !== 'undefined');
  if (schemas.length === 0) {
    return [true, { type: 'undefined' }];
  } else if (schemas.length === 1) {
    return [true, withComment(schemas[0]!, schema)];
  } else {
    return [true, withComment({ type: 'union', schemas }, schema)];
  }
}

// This function is a helper that adds back any comments that were removed during optimization
function withComment(newSchema: Schema, oldSchema: Schema): Schema {
  if (oldSchema.comment) {
    newSchema.comment = combineComments(oldSchema);
  }

  return newSchema;
}

export function optimize(schema: Schema): Schema {
  if (schema.type === 'object') {
    const properties: Record<string, Schema> = {};
    const required: string[] = [];
    for (const [key, prop] of Object.entries(schema.properties)) {
      const optimized = optimize(prop);
      if (optimized.type === 'undefined') {
        continue;
      }
      const [isOptional, filteredSchema] = filterUndefinedUnion(optimized);
      properties[key] = filteredSchema;

      if (schema.required.indexOf(key) >= 0 && !isOptional) {
        required.push(key);
      }
    }

    const schemaObject: Schema = { type: 'object', properties, required };

    return withComment(schemaObject, schema);
  } else if (schema.type === 'intersection') {
    const newSchema = foldIntersection(schema, optimize);

    return withComment(newSchema, schema);
  } else if (schema.type === 'union') {
    const consolidated = consolidateUnion(schema);
    const simplified = simplifyUnion(consolidated, optimize);
    const merged = mergeUnions(simplified);

    return withComment(merged, schema);
  } else if (schema.type === 'array') {
    const optimized = optimize(schema.items);

    return withComment({ type: 'array', items: optimized }, schema);
  } else if (schema.type === 'record') {
    return withComment(
      {
        type: 'record',
        ...(schema.domain ? { domain: optimize(schema.domain) } : {}),
        codomain: optimize(schema.codomain),
      },
      schema,
    );
  } else if (schema.type === 'tuple') {
    const schemas = schema.schemas.map(optimize);
    return withComment({ type: 'tuple', schemas }, schema);
  } else if (schema.type === 'ref') {
    return schema;
  } else {
    return schema;
  }
}
