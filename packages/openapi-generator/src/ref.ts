import type { Schema, Reference } from './ir';

export function getRefs(schema: Schema): Reference[] {
  if (schema.type === 'ref') {
    return [schema];
  } else if (schema.type === 'array') {
    return getRefs(schema.items);
  } else if (
    schema.type === 'intersection' ||
    schema.type === 'union' ||
    schema.type === 'tuple'
  ) {
    return schema.schemas.reduce<Reference[]>((acc, member) => {
      return [...acc, ...getRefs(member)];
    }, []);
  } else if (schema.type === 'object') {
    return Object.values(schema.properties).reduce<Reference[]>((acc, member) => {
      return [...acc, ...getRefs(member)];
    }, []);
  } else if (schema.type === 'record') {
    return getRefs(schema.codomain);
  } else {
    return [];
  }
}
