import test from 'node:test';
import { strict as assert } from 'node:assert';

import { apiTsPathToExpress } from '../src/path';

test('should pass through paths with no parameters', () => {
  const input = '/foo/bar';
  const output = apiTsPathToExpress(input);
  assert.deepEqual(output, input);
});

test('should translate a path segment that specifies a parameter', () => {
  const input = '/foo/{bar}';
  const output = apiTsPathToExpress(input);
  assert.deepEqual(output, '/foo/:bar');
});

test('should translate multiple path segments', () => {
  const input = '/foo/{bar}/baz/{id}';
  const output = apiTsPathToExpress(input);
  assert.deepEqual(output, '/foo/:bar/baz/:id');
});
