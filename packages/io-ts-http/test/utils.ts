import { strict as assert } from 'node:assert';

import * as E from 'fp-ts/Either';
import * as t from 'io-ts';

export const assertRight = E.getOrElseW(() => {
  throw new Error('Failed to decode object');
});

export const assertLeft = <T>(e: E.Either<t.Errors, T>) => {
  assert(E.isLeft(e), 'Expected a failure, got a success');
  return e.left;
};

export const assertEncodes = (codec: t.Mixed, test: unknown, expected = test) => {
  const encoded = codec.encode(test);
  assert.deepEqual(encoded, expected);
};
export const assertDecodes = (codec: t.Mixed, test: unknown, expected = test) => {
  const decoded = codec.decode(test);
  const output = assertRight(decoded);
  assert.deepEqual(output, expected);
};
export const assertRejects = (codec: t.Mixed, test: unknown) => {
  const decoded = codec.decode(test);
  assert(E.isLeft(decoded));
};
