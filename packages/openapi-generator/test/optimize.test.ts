import assert from 'node:assert';
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

  assert.deepStrictEqual(optimize(input), expected);
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

  assert.deepStrictEqual(optimize(input), expected);
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

  assert.deepStrictEqual(optimize(input), expected);
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

  assert.deepStrictEqual(optimize(input), expected);
});
