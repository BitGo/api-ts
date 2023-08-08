import { Block } from 'comment-parser';
import type { PseudoBigInt } from 'typescript';

export type AnyValue = {
  type: 'any';
};

export type UndefinedValue = {
  type: 'undefined';
};

export type Primitive = {
  type: 'primitive';
  value: 'string' | 'number' | 'integer' | 'boolean' | 'null';
};

export type Literal = {
  type: 'literal';
  kind: 'string' | 'number' | 'integer' | 'boolean' | 'null';
  value: string | number | boolean | null | PseudoBigInt;
};

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
  | Literal
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
