import type { Schema, Reference } from './ir';
import fs from 'fs';

export function getRefs(schema: Schema, typeMap: Record<string, string>): Reference[] {
  if (schema.type === 'ref') {
    if (!fs.existsSync(schema.location)) {
      // The location is a node module - we need to populate the location here
      const newPath = typeMap[schema.name];
      if (!newPath) {
        return [];
      }

      return [{ ...schema, location: newPath }];
    }
    return [schema];
  } else if (schema.type === 'array') {
    return getRefs(schema.items, typeMap);
  } else if (
    schema.type === 'intersection' ||
    schema.type === 'union' ||
    schema.type === 'tuple'
  ) {
    return schema.schemas.reduce<Reference[]>((acc, member) => {
      return [...acc, ...getRefs(member, typeMap)];
    }, []);
  } else if (schema.type === 'object') {
    return Object.values(schema.properties).reduce<Reference[]>((acc, member) => {
      return [...acc, ...getRefs(member, typeMap)];
    }, []);
  } else if (schema.type === 'record') {
    return getRefs(schema.codomain, typeMap);
  } else {
    return [];
  }
}
