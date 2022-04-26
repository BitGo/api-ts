import test from 'ava';

import { apiTsPathToExpress } from '../src/path';

test('should pass through paths with no parameters', (t) => {
  const input = '/foo/bar';
  const output = apiTsPathToExpress(input);
  t.deepEqual(output, input);
});

test('should translate a path segment that specifies a parameter', (t) => {
  const input = '/foo/{bar}';
  const output = apiTsPathToExpress(input);
  t.deepEqual(output, '/foo/:bar');
});

test('should translate multiple path segments', (t) => {
  const input = '/foo/{bar}/baz/{id}';
  const output = apiTsPathToExpress(input);
  t.deepEqual(output, '/foo/:bar/baz/:id');
});
