import { assert } from 'chai';
import * as NEA from 'fp-ts/NonEmptyArray';
import * as t from 'io-ts';
import { nonEmptyArray, JsonFromString, NumberFromString } from 'io-ts-types';
import { assertRight } from './utils';

import { optional } from '../src/combinators';
import * as h from '../src/httpRequest';

const example = {
  params: {
    id: '1',
  },
  query: {
    test: 'foo',
    multiTest: NEA.fromReadonlyNonEmptyArray(['a', 'b', 'c']),
    encodedJson: '{"jsonKey":null}',
    optionalParam: 'hello',
  },
  headers: {
    authorization: 'Bearer asdf',
  },
  body: {
    message: 'test',
  },
};

describe('GenericHttpRequest', () => {
  it('represents a generic HTTP request', () => {
    const codec = h.GenericHttpRequest;
    const decoded = codec.decode(example);
    const output = assertRight(decoded);
    assert.deepStrictEqual(output, example);
  });
});

describe('httpRequest', () => {
  it('properly (de)serializes http requests', () => {
    const TestHttpRequest = h.httpRequest({
      params: {
        id: NumberFromString,
      },
      query: {
        test: t.string,
        multiTest: nonEmptyArray(t.string),
        encodedJson: t.string.pipe(JsonFromString).pipe(t.type({ jsonKey: t.null })),
        optionalParam: optional(t.string),
      },
      headers: {
        authorization: t.string,
      },
      body: {
        message: t.string,
      },
    });

    const decoded = TestHttpRequest.decode(example);
    const output = assertRight(decoded);
    assert.deepStrictEqual(output, {
      id: 1,
      test: 'foo',
      multiTest: NEA.fromReadonlyNonEmptyArray(['a', 'b', 'c']),
      // tslint:disable-next-line: no-null-keyword
      encodedJson: { jsonKey: null },
      optionalParam: 'hello',
      authorization: 'Bearer asdf',
      message: 'test',
    });

    const reEncoded = TestHttpRequest.encode(output);
    assert.deepStrictEqual(reEncoded, example);
  });

  it('handles empty options', () => {
    const OptionRequest = h.httpRequest({
      query: {
        optionalParam: optional(t.string),
      },
    });

    const optionExample = {
      query: {},
      params: {},
    };

    const decoded = OptionRequest.decode(optionExample);
    const output = assertRight(decoded);
    assert.deepStrictEqual(output, {});

    const reEncoded = OptionRequest.encode(output);
    assert.deepStrictEqual(reEncoded, { query: {}, params: {} });
  });

  it('handles missing options', () => {
    const EmptyRequest = h.httpRequest({});
    const decoded = EmptyRequest.decode({ params: {}, query: {}, headers: {} });
    const output = assertRight(decoded);
    assert.deepStrictEqual(output, {});

    const reEncoded = EmptyRequest.encode(output);
    assert.deepStrictEqual(reEncoded, { query: {}, params: {} });
  });

  it('handles props as the body param', () => {
    const EmptyRequest = h.httpRequest({
      body: {
        a: t.number,
        b: t.string,
      },
    });
    const decoded = EmptyRequest.decode({
      params: {},
      query: {},
      headers: {},
      body: { a: 2, b: 'hi' },
    });
    const output = assertRight(decoded);
    assert.deepStrictEqual(output, { a: 2, b: 'hi' });

    const reEncoded = EmptyRequest.encode(output);
    assert.deepStrictEqual(reEncoded, {
      query: {},
      params: {},
      body: { a: 2, b: 'hi' },
    });
  });

  // This is actually just a type-level test, but I forgot to update the HttpRequestCodec type
  // already, and having something like this would've caught it.
  it('Builds codecs that match the HttpRequestCodec type', () => {
    const _codec: h.HttpRequestCodec<{ foo: string }> = h.httpRequest({
      params: {
        foo: t.string,
      },
    });
    // tslint:disable-next-line: no-unused-expression
    void _codec;
  });
});
