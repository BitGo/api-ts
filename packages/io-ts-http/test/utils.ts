import { assert } from 'chai';
import * as E from 'fp-ts/Either';
import * as t from 'io-ts';

export const assertRight = E.getOrElseW(() => {
  throw new Error('Failed to decode object')
})

export const assertEncodes = (codec: t.Mixed, test: unknown, expected = test) => {
  const encoded = codec.encode(test);
  assert.deepStrictEqual(encoded, expected);
};
export const assertDecodes = (codec: t.Mixed, test: unknown, expected = test) => {
  const decoded = codec.decode(test);
  const output = assertRight(decoded);
  assert.deepStrictEqual(output, expected);
};
export const assertRejects = (codec: t.Mixed, test: unknown) => {
  const decoded = codec.decode(test);
  assert.strictEqual(E.isLeft(decoded), true);
};
