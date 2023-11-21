import { Block } from 'comment-parser';
import type { PseudoBigInt } from 'typescript';

export type AnyValue = {
  type: 'any';
};

export type UndefinedValue = {
  type: 'undefined';
};

export type Primitive = {
  type: 'string' | 'number' | 'integer' | 'boolean' | 'null';
  enum?: (string | number | boolean | null | PseudoBigInt)[];
};

export function isPrimitive(schema: Schema): schema is Primitive {
  return (
    schema.type === 'string' ||
    schema.type === 'number' ||
    schema.type === 'integer' ||
    schema.type === 'boolean' ||
    schema.type === 'null'
  );
}

export type Array = {
  type: 'array';
  items: Schema;
};

export type Object = {
  type: 'object';
  properties: Record<string, Schema>;
  required: string[];
};

export type RecordObject = {
  type: 'record';
  codomain: Schema;
};

export type CombinedType = {
  type: 'union' | 'intersection' | 'tuple';
  schemas: Schema[];
};

export type Reference = {
  type: 'ref';
  name: string;
  location: string;
};

export type BaseSchema =
  | Primitive
  | Array
  | Object
  | RecordObject
  | CombinedType
  | AnyValue
  | UndefinedValue
  | Reference;

export type HasComment = {
  comment?: Block;
};

export type Schema = BaseSchema & HasComment;
