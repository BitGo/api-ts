import assert from 'node:assert';
import test from 'node:test';

import { getRefs, type Schema } from '../src';

test('simple ref is returned', () => {
  const schema: Schema = {
    type: 'ref',
    name: 'Foo',
    location: '/foo.ts',
  };

  assert.deepEqual(getRefs(schema), [schema]);
});

test('array ref is returned', () => {
  const schema: Schema = {
    type: 'array',
    items: {
      type: 'ref',
      name: 'Foo',
      location: '/foo.ts',
    },
  };

  assert.deepEqual(getRefs(schema), [
    {
      type: 'ref',
      name: 'Foo',
      location: '/foo.ts',
    },
  ]);
});

test('intersection ref is returned', () => {
  const schema: Schema = {
    type: 'intersection',
    schemas: [
      {
        type: 'ref',
        name: 'Foo',
        location: '/foo.ts',
      },
      {
        type: 'ref',
        name: 'Bar',
        location: '/bar.ts',
      },
    ],
  };

  assert.deepEqual(getRefs(schema), [
    {
      type: 'ref',
      name: 'Foo',
      location: '/foo.ts',
    },
    {
      type: 'ref',
      name: 'Bar',
      location: '/bar.ts',
    },
  ]);
});

test('union ref is returned', () => {
  const schema: Schema = {
    type: 'union',
    schemas: [
      {
        type: 'ref',
        name: 'Foo',
        location: '/foo.ts',
      },
      {
        type: 'ref',
        name: 'Bar',
        location: '/bar.ts',
      },
    ],
  };

  assert.deepEqual(getRefs(schema), [
    {
      type: 'ref',
      name: 'Foo',
      location: '/foo.ts',
    },
    {
      type: 'ref',
      name: 'Bar',
      location: '/bar.ts',
    },
  ]);
});

test('tuple ref is returned', () => {
  const schema: Schema = {
    type: 'tuple',
    schemas: [
      {
        type: 'ref',
        name: 'Foo',
        location: '/foo.ts',
      },
      {
        type: 'ref',
        name: 'Bar',
        location: '/bar.ts',
      },
    ],
  };

  assert.deepEqual(getRefs(schema), [
    {
      type: 'ref',
      name: 'Foo',
      location: '/foo.ts',
    },
    {
      type: 'ref',
      name: 'Bar',
      location: '/bar.ts',
    },
  ]);
});

test('object ref is returned', () => {
  const schema: Schema = {
    type: 'object',
    properties: {
      foo: {
        type: 'ref',
        name: 'Foo',
        location: '/foo.ts',
      },
      bar: {
        type: 'ref',
        name: 'Bar',
        location: '/bar.ts',
      },
    },
    required: ['foo', 'bar'],
  };

  assert.deepEqual(getRefs(schema), [
    {
      type: 'ref',
      name: 'Foo',
      location: '/foo.ts',
    },
    {
      type: 'ref',
      name: 'Bar',
      location: '/bar.ts',
    },
  ]);
});

test('record ref is returned', () => {
  const schema: Schema = {
    type: 'record',
    codomain: {
      type: 'ref',
      name: 'Foo',
      location: '/foo.ts',
    },
  };

  assert.deepEqual(getRefs(schema), [
    {
      type: 'ref',
      name: 'Foo',
      location: '/foo.ts',
    },
  ]);
});
