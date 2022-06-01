import { assert } from 'chai';
import * as t from 'io-ts';

import * as c from '../src/combinators';
import { assertDecodes, assertEncodes, assertRejects } from './utils';

describe('flattened', () => {
  const codec = c.flattened('test', {
    test: {
      foo: t.number,
    },
    anotherParam: {
      bar: t.union([t.string, t.undefined]),
    },
  });

  it('unwraps an object when decoding', () => {
    const expected = { foo: 42, bar: '123' };
    assertDecodes(codec, { test: { foo: 42 }, anotherParam: { bar: '123' } }, expected);

    const valid = codec.is(expected);
    assert.strictEqual(valid, true);
  });

  it('wraps an object when encoding', () =>
    assertEncodes(
      codec,
      { foo: 42, bar: '234' },
      { test: { foo: 42 }, anotherParam: { bar: '234' } },
    ));

  it('rejects bad input', () => {
    const valid = codec.is(null);
    assert.strictEqual(valid, false);

    assertRejects(codec, {});
  });

  it('combines with optional params', () =>
    assertEncodes(codec, { foo: 42 }, { test: { foo: 42 }, anotherParam: {} }));

  it('does not get confused by overlapping extra parameters', () => {
    const input = {
      test: { foo: 42, bar: 'bad' },
      anotherParam: { foo: 123, bar: '123' },
    };
    const expected = { foo: 42, bar: '123' };
    assertDecodes(codec, input, expected);
  });
});

describe('optionalized', () => {
  const codec = c.optionalized({
    a: t.string,
    b: t.number,
    c: c.optional(t.string),
    d: t.unknown,
  });

  it('decodes an object with only required properties', () =>
    assertDecodes(codec, { a: 'a', b: 1 }));

  it('enforces presence of required properties', () =>
    assertRejects(codec, { a: 'a', c: 'c' }));

  it('decodes optional properties', () =>
    assertDecodes(codec, { a: 'a', b: 1, c: 'c', d: 'd' }));

  it('enforces types of optional properties', () =>
    assertRejects(codec, { a: 'a', b: 1, c: 1, d: 'd' }));

  it('decodes additional properties when not wrapped by t.exact', () =>
    assertDecodes(codec, { a: 'a', b: 1, c: 'c', d: 'd', e: true }));

  it('combines with t.exact to filter additional properties', () =>
    assertDecodes(
      t.exact(codec),
      {
        a: 'a',
        b: 1,
        c: 'c',
        d: 'd',
        e: true,
      },
      {
        a: 'a',
        b: 1,
        c: 'c',
        d: 'd',
      },
    ));

  it('does not add explicit undefined properties when encoding', () =>
    assertEncodes(codec, { a: 'a', b: 1 }));

  it('keeps explicit undefined properties when encoding', () => {
    const optionalCodec = c.optionalized({
      a: c.optional(t.number),
    });
    assertEncodes(optionalCodec, { a: undefined });
  });

  it('decodes explicit null properties', () => {
    const nullCodec = c.optionalized({
      a: t.null,
    });
    assertDecodes(nullCodec, { a: null });
  });

  it('treats explicit null properties as required', () => {
    const nullCodec = c.optionalized({
      a: t.null,
    });
    assertRejects(nullCodec, {});
  });

  it('treats null-or-undefined properties as optional', () => {
    const nullCodec = c.optionalized({
      a: c.optional(t.null),
    });
    assertDecodes(nullCodec, {});
  });
});
