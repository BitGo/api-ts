import assert from 'node:assert/strict';
import test from 'node:test';

import { optimize, type Schema } from '../src';

test('intersections are simplified', () => {
  const input: Schema = {
    type: 'intersection',
    schemas: [
      {
        type: 'object',
        properties: {
          foo: { type: 'string' },
        },
        required: ['foo'],
      },
      {
        type: 'object',
        properties: {
          bar: { type: 'string' },
        },
        required: [],
      },
    ],
  };

  const expected: Schema = {
    type: 'object',
    properties: {
      foo: { type: 'string' },
      bar: { type: 'string' },
    },
    required: ['foo'],
  };

  assert.deepEqual(optimize(input), expected);
});

test('unions are combined', () => {
  const input: Schema = {
    type: 'union',
    schemas: [
      { type: 'string', enum: ['foo'] },
      { type: 'string', enum: ['bar'] },
    ],
  };

  const expected: Schema = { type: 'string', enum: ['foo', 'bar'] };

  assert.deepEqual(optimize(input), expected);
});

test('undefined properties are simplified', () => {
  const input: Schema = {
    type: 'object',
    properties: {
      foo: { type: 'undefined' },
      bar: { type: 'string' },
    },
    required: ['foo'],
  };

  const expected: Schema = {
    type: 'object',
    properties: {
      bar: { type: 'string' },
    },
    required: [],
  };

  assert.deepEqual(optimize(input), expected);
});

test('undefined property unions are simplified', () => {
  const input: Schema = {
    type: 'object',
    properties: {
      foo: {
        type: 'union',
        schemas: [{ type: 'undefined' }, { type: 'string' }],
      },
      bar: { type: 'string' },
    },
    required: ['foo', 'bar'],
  };

  const expected: Schema = {
    type: 'object',
    properties: {
      foo: { type: 'string' },
      bar: { type: 'string' },
    },
    required: ['bar'],
  };

  assert.deepEqual(optimize(input), expected);
});

test('enums are deduplicated', () => {
  const input: Schema = {
    type: 'union',
    schemas: [
      { type: 'string', enum: ['foo'] },
      { type: 'string', enum: ['foo', 'bar'] },
    ],
  };

  const expected: Schema = {
    type: 'string',
    enum: ['foo', 'bar'],
  };

  assert.deepEqual(optimize(input), expected);
});

test('comments are exposed in objects', () => {
  const input: Schema = {
    type: 'object',
    properties: {
      bar: { type: 'string' },
    },
    required: [],
    comment: {
      description: 'test description',
      tags: [],
      source: [],
      problems: [],
    },
  };

  const expected: Schema = {
    type: 'object',
    properties: {
      bar: { type: 'string' },
    },
    required: [],
    comment: {
      description: 'test description',
      tags: [],
      source: [],
      problems: [],
    },
  };

  assert.deepEqual(optimize(input), expected);
});

test('consolidatable unions are consolidated to single primitive type', () => {
  const input: Schema = {
    type: 'union',
    schemas: [
      { type: 'string', enum: ['true', 'false'], decodedType: 'boolean' },
      { type: 'boolean', primitive: true },
    ],
    required: [],
  };

  const expected: Schema = { type: 'boolean' };

  assert.deepEqual(optimize(input), expected);
});

test('non-consolidatable unions are not consolidated', () => {
  const input: Schema = {
    type: 'union',
    schemas: [
      { type: 'string', enum: ['true', 'false'], decodedType: 'boolean' },
      { type: 'string', primitive: true },
    ],
    required: [],
  };

  const expected: Schema = {
    type: 'union',
    schemas: [
      { type: 'string', primitive: true },
      { type: 'string', enum: ['true', 'false'] },
    ],
  };

  assert.deepEqual(optimize(input), expected);
});
