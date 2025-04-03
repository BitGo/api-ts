import test from 'node:test';
import assert from 'node:assert/strict';
import { schemaToOpenAPI } from '../../src/openapi';
import { OpenAPIV3 } from 'openapi-types';
import { Schema } from '../../src/ir';

test('numeric constraints are properly mapped', () => {
  const schema: Schema = {
    type: 'number',
    minimum: 0,
    maximum: 100,
    multipleOf: 5,
    comment: {
      description: 'A number with constraints',
      tags: [],
      source: [],
      problems: [],
    },
  };

  const result = schemaToOpenAPI(schema) as OpenAPIV3.SchemaObject;

  assert.equal(result.type, 'number');
  assert.equal(result.description, 'A number with constraints');

  assert.equal(result.minimum, 0);
  assert.equal(result.maximum, 100);
  assert.equal(result.multipleOf, 5);
});

test('exclusive numeric constraints are properly mapped', () => {
  const schema: Schema = {
    type: 'number',
    minimum: 0,
    maximum: 100,
    exclusiveMinimum: true,
    exclusiveMaximum: true,
    comment: {
      description: 'A number with exclusive constraints',
      tags: [],
      source: [],
      problems: [],
    },
  };

  const result = schemaToOpenAPI(schema) as OpenAPIV3.SchemaObject;

  assert.equal(result.type, 'number');
  assert.equal(result.description, 'A number with exclusive constraints');

  assert.equal(result.minimum, 0);
  assert.equal(result.maximum, 100);
  assert.equal(result.exclusiveMinimum, true);
  assert.equal(result.exclusiveMaximum, true);
});

test('string-encoded numeric types are properly mapped', () => {
  const schema: Schema = {
    type: 'string',
    format: 'number',
    decodedType: 'number',
  };

  const result = schemaToOpenAPI(schema) as OpenAPIV3.SchemaObject;

  assert.equal(result.type, 'number');
});

test('string-encoded integer types are properly mapped', () => {
  const schema: Schema = {
    type: 'string',
    format: 'integer',
    decodedType: 'number',
  };

  const result = schemaToOpenAPI(schema) as OpenAPIV3.SchemaObject;

  assert.equal(result.type, 'integer');
});

test('BigInt types are properly mapped', () => {
  const schema: Schema = {
    type: 'string',
    format: 'number',
    decodedType: 'bigint',
  };

  const result = schemaToOpenAPI(schema) as OpenAPIV3.SchemaObject;

  assert.equal(result.type, 'integer');
  assert.equal(result.format, 'int64');
});

test('BigInt types with constraints are properly mapped', () => {
  const schema: Schema = {
    type: 'string',
    format: 'number',
    decodedType: 'bigint',
    minimum: 0,
    maximum: 1000000000000000000,
  };

  const result = schemaToOpenAPI(schema) as OpenAPIV3.SchemaObject;

  assert.equal(result.type, 'integer');
  assert.equal(result.format, 'int64');
  assert.equal(result.minimum, 0);
  assert.equal(result.maximum, 1000000000000000000);
});
