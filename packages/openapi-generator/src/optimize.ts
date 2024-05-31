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

export function simplifyUnion(schema: Schema, optimize: OptimizeFn): Schema {
  if (schema.type !== 'union') {
    return schema;
  } else if (schema.schemas.length === 1) {
    return schema.schemas[0]!;
  } else if (schema.schemas.length === 0) {
    return { type: 'undefined' };
  }

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
    return [true, schemas[0]!];
  } else {
    return [true, { type: 'union', schemas }];
  }
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

      if (prop.comment) {
        filteredSchema.comment = prop.comment;
      }

      properties[key] = filteredSchema;

      if (schema.required.indexOf(key) >= 0 && !isOptional) {
        required.push(key);
      }
    }

    const schemaObject: Schema = { type: 'object', properties, required };

    // only add comment field if there is a comment
    if (schema.comment) {
      return { ...schemaObject, comment: schema.comment };
    }

    return schemaObject;
  } else if (schema.type === 'intersection') {
    return foldIntersection(schema, optimize);
  } else if (schema.type === 'union') {
    const simplified = simplifyUnion(schema, optimize);
    if (schema.comment) {
      return { ...simplified, comment: schema.comment };
    }

    return simplified;
  } else if (schema.type === 'array') {
    const optimized = optimize(schema.items);
    if (schema.comment) {
      return { type: 'array', items: optimized, comment: schema.comment };
    }
    return { type: 'array', items: optimized };
  } else if (schema.type === 'record') {
    if (schema.comment) {
      return {
        type: 'record',
        codomain: optimize(schema.codomain),
        comment: schema.comment,
      };
    }
    return { type: 'record', codomain: optimize(schema.codomain) };
  } else if (schema.type === 'tuple') {
    const schemas = schema.schemas.map(optimize);
    return { type: 'tuple', schemas };
  } else {
    return schema;
  }
}
