import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert';
import test from 'node:test';

import { parseSource, parsePlainInitializer, Project, type Schema } from '../src';

async function testCase(
  description: string,
  src: string,
  expected: Record<string, Schema>,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    const sourceFile = await parseSource('./index.ts', src);

    const actual: Record<string, Schema> = {};
    const errors: string[] = [];
    for (const symbol of sourceFile.symbols.declarations) {
      if (symbol.init !== undefined) {
        const result = parsePlainInitializer(new Project(), sourceFile, symbol.init);
        if (E.isLeft(result)) {
          errors.push(result.left);
        } else {
          if (symbol.comment !== undefined) {
            result.right.comment = symbol.comment;
          }
          actual[symbol.name] = result.right;
        }
      }
    }

    assert.deepStrictEqual(errors, expectedErrors);
    assert.deepStrictEqual(actual, expected);
  });
}

const SIMPLE = `
import * as t from 'io-ts';
export const FOO = t.number;
`;

testCase('simple codec is parsed', SIMPLE, {
  FOO: { type: 'primitive', value: 'number' },
});

const DIRECT = `
import { number } from 'io-ts';
export const FOO = number;
`;

testCase('direct import is parsed', DIRECT, {
  FOO: { type: 'primitive', value: 'number' },
});

const TYPE = `
import * as t from 'io-ts';
export const FOO = t.type({ foo: t.number });
`;

testCase('type is parsed', TYPE, {
  FOO: {
    type: 'object',
    properties: { foo: { type: 'primitive', value: 'number' } },
    required: ['foo'],
  },
});

const PARTIAL = `
import * as t from 'io-ts';
export const FOO = t.partial({ foo: t.number });
`;

testCase('partial type is parsed', PARTIAL, {
  FOO: {
    type: 'object',
    properties: { foo: { type: 'primitive', value: 'number' } },
    required: [],
  },
});

const SHORTHAND_PROPERTY = `
import * as t from 'io-ts';
export const bar = t.number;
export const FOO = t.type({ bar });
`;

testCase('shorthand property is parsed', SHORTHAND_PROPERTY, {
  bar: { type: 'primitive', value: 'number' },
  FOO: {
    type: 'object',
    properties: { bar: { type: 'primitive', value: 'number' } },
    required: ['bar'],
  },
});

const SPREAD_PROPERTY = `
import * as t from 'io-ts';
export const foo = {
  foo: t.number,
};
export const TEST = t.type({ ...foo, bar: t.string });
`;

testCase('spread property is parsed', SPREAD_PROPERTY, {
  foo: {
    type: 'object',
    properties: { foo: { type: 'primitive', value: 'number' } },
    required: ['foo'],
  },
  TEST: {
    type: 'object',
    properties: {
      foo: { type: 'primitive', value: 'number' },
      bar: { type: 'primitive', value: 'string' },
    },
    required: ['foo', 'bar'],
  },
});

const ARRAY = `
import * as t from 'io-ts';
export const FOO = t.array(t.number);
`;

testCase('array type is parsed', ARRAY, {
  FOO: { type: 'array', items: { type: 'primitive', value: 'number' } },
});

const UNION = `
import * as t from 'io-ts';
export const FOO = t.union([t.string, t.number]);
`;

testCase('union type is parsed', UNION, {
  FOO: {
    type: 'union',
    schemas: [
      { type: 'primitive', value: 'string' },
      { type: 'primitive', value: 'number' },
    ],
  },
});

const INTERSECTION = `
import * as t from 'io-ts';
export const FOO = t.intersection([t.type({ foo: t.number }), t.partial({ bar: t.string })]);
`;

testCase('intersection type is parsed', INTERSECTION, {
  FOO: {
    type: 'intersection',
    schemas: [
      {
        type: 'object',
        properties: { foo: { type: 'primitive', value: 'number' } },
        required: ['foo'],
      },
      {
        type: 'object',
        properties: { bar: { type: 'primitive', value: 'string' } },
        required: [],
      },
    ],
  },
});

const RECORD = `
import * as t from 'io-ts';
export const FOO = t.record(t.string, t.number);
`;

testCase('record type is parsed', RECORD, {
  FOO: { type: 'record', codomain: { type: 'primitive', value: 'number' } },
});

const STRING_LITERAL = `
import * as t from 'io-ts';
export const FOO = t.literal('foo');
`;

testCase('string literal type is parsed', STRING_LITERAL, {
  FOO: { type: 'literal', kind: 'string', value: 'foo' },
});

const NUMBER_LITERAL = `
import * as t from 'io-ts';
export const FOO = t.literal(42);
`;

testCase('number literal type is parsed', NUMBER_LITERAL, {
  FOO: { type: 'literal', kind: 'number', value: 42 },
});

const BOOLEAN_LITERAL = `
import * as t from 'io-ts';
export const FOO = t.literal(true);
`;

testCase('boolean literal type is parsed', BOOLEAN_LITERAL, {
  FOO: { type: 'literal', kind: 'boolean', value: true },
});

const NULL_LITERAL = `
import * as t from 'io-ts';
export const FOO = t.literal(null);
`;

testCase('null literal type is parsed', NULL_LITERAL, {
  FOO: { type: 'literal', kind: 'null', value: null },
});

const KEYOF = `
import * as t from 'io-ts';
export const FOO = t.keyof({ foo: null, bar: null });
`;

testCase('keyof type is parsed', KEYOF, {
  FOO: {
    type: 'union',
    schemas: [
      { type: 'literal', kind: 'string', value: 'foo' },
      { type: 'literal', kind: 'string', value: 'bar' },
    ],
  },
});

const ALIAS = `
import { string as test } from 'io-ts';
export const FOO = test;
`;

testCase('aliased import is parsed', ALIAS, {
  FOO: { type: 'primitive', value: 'string' },
});

const BRAND = `
import * as t from 'io-ts';
interface FooBrand {
  readonly Foo: unique symbol;
}
export type FooBranded = t.Branded<string, FooBrand>;
export const FOO = t.brand(t.string, (s): s is FooBranded => s === 'foo', 'Foo');
`;

testCase('brand type is parsed', BRAND, {
  FOO: {
    type: 'primitive',
    value: 'string',
  },
});

const LOCAL_REF = `
import * as t from 'io-ts';
const FOO = t.type({ foo: t.number });
export const BAR = t.type({ bar: FOO });
`;

testCase('local ref is parsed', LOCAL_REF, {
  FOO: {
    type: 'object',
    properties: { foo: { type: 'primitive', value: 'number' } },
    required: ['foo'],
  },
  BAR: {
    type: 'object',
    properties: { bar: { type: 'ref', name: 'FOO', location: './index.ts' } },
    required: ['bar'],
  },
});

const LOCAL_EXPORTED_REF = `
import * as t from 'io-ts';
export const FOO = t.type({ foo: t.number });
export const BAR = t.type({ bar: FOO });
`;

testCase('local exported ref is parsed', LOCAL_EXPORTED_REF, {
  FOO: {
    type: 'object',
    properties: { foo: { type: 'primitive', value: 'number' } },
    required: ['foo'],
  },
  BAR: {
    type: 'object',
    properties: { bar: { type: 'ref', name: 'FOO', location: './index.ts' } },
    required: ['bar'],
  },
});

const IMPORT_REF = `
import * as t from 'io-ts';
import { AnotherType } from 'another-library';
export const FOO = t.type({ foo: AnotherType });
`;

testCase('imported ref is parsed', IMPORT_REF, {
  FOO: {
    type: 'object',
    properties: {
      foo: { type: 'ref', name: 'AnotherType', location: 'another-library' },
    },
    required: ['foo'],
  },
});

const STAR_IMPORT_REF = `
import * as u from 'unknown-library';
export const FOO = u.thing({ foo: u.number });
`;

testCase('star imported ref is parsed', STAR_IMPORT_REF, {
  FOO: {
    type: 'ref',
    name: 'thing',
    location: 'unknown-library',
  },
});

const DECLARATION_COMMENT = `
import * as t from 'io-ts';

/**
 * Test codec
 */
export const FOO = t.number;
`;

testCase('declaration comment is parsed', DECLARATION_COMMENT, {
  FOO: {
    type: 'primitive',
    value: 'number',
    comment: {
      description: 'Test codec',
      tags: [],
      source: [
        {
          number: 2,
          source: '/**',
          tokens: {
            start: '',
            delimiter: '/**',
            postDelimiter: '',
            tag: '',
            postTag: '',
            name: '',
            postName: '',
            type: '',
            postType: '',
            description: '',
            end: '',
            lineEnd: '',
          },
        },
        {
          number: 3,
          source: ' * Test codec',
          tokens: {
            start: ' ',
            delimiter: '*',
            postDelimiter: ' ',
            tag: '',
            postTag: '',
            name: '',
            postName: '',
            type: '',
            postType: '',
            description: 'Test codec',
            end: '',
            lineEnd: '',
          },
        },
        {
          number: 4,
          source: ' */',
          tokens: {
            start: ' ',
            delimiter: '',
            postDelimiter: '',
            tag: '',
            postTag: '',
            name: '',
            postName: '',
            type: '',
            postType: '',
            description: '',
            end: '*/',
            lineEnd: '',
          },
        },
      ],
      problems: [],
    },
  },
});

const FIRST_PROPERTY_COMMENT = `
import * as t from 'io-ts';
export const FOO = t.type({
  /** this is a comment */
  foo: t.number,
});
`;

testCase('first property comment is parsed', FIRST_PROPERTY_COMMENT, {
  FOO: {
    type: 'object',
    properties: {
      foo: {
        type: 'primitive',
        value: 'number',
        comment: {
          description: 'this is a comment',
          problems: [],
          source: [
            {
              number: 1,
              source: '  /** this is a comment */',
              tokens: {
                delimiter: '/**',
                description: 'this is a comment ',
                end: '*/',
                lineEnd: '',
                name: '',
                postDelimiter: ' ',
                postName: '',
                postTag: '',
                postType: '',
                start: '  ',
                tag: '',
                type: '',
              },
            },
          ],
          tags: [],
        },
      },
    },
    required: ['foo'],
  },
});

const SECOND_PROPERTY_COMMENT = `
import * as t from 'io-ts';
export const FOO = t.type({
  foo: t.number,
  /** this is a comment */
  bar: t.string,
});
`;

testCase('second property comment is parsed', SECOND_PROPERTY_COMMENT, {
  FOO: {
    type: 'object',
    properties: {
      foo: { type: 'primitive', value: 'number' },
      bar: {
        type: 'primitive',
        value: 'string',
        comment: {
          description: 'this is a comment',
          problems: [],
          source: [
            {
              number: 1,
              source: '  /** this is a comment */',
              tokens: {
                delimiter: '/**',
                description: 'this is a comment ',
                end: '*/',
                lineEnd: '',
                name: '',
                postDelimiter: ' ',
                postName: '',
                postTag: '',
                postType: '',
                start: '  ',
                tag: '',
                type: '',
              },
            },
          ],
          tags: [],
        },
      },
    },
    required: ['foo', 'bar'],
  },
});

const OPTIONAL_COMBINATOR = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const FOO = h.optional(t.string);
`;

testCase('optional combinator is parsed', OPTIONAL_COMBINATOR, {
  FOO: {
    type: 'union',
    schemas: [{ type: 'primitive', value: 'string' }, { type: 'undefined' }],
  },
});

const OPTIONALIZED_COMBINATOR = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const FOO = h.optionalized({
  foo: t.string,
  bar: h.optional(t.number),
});
`;

testCase('optionalized combinator is parsed', OPTIONALIZED_COMBINATOR, {
  FOO: {
    type: 'object',
    properties: {
      foo: { type: 'primitive', value: 'string' },
      bar: {
        type: 'union',
        schemas: [{ type: 'primitive', value: 'number' }, { type: 'undefined' }],
      },
    },
    required: ['foo'],
  },
});

const HTTP_REQUEST_COMBINATOR = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const FOO = h.httpRequest({
  params: {
    foo: t.string
  },
  query: {
    bar: h.optional(t.number)
  }
});
`;

testCase('httpRequest combinator is parsed', HTTP_REQUEST_COMBINATOR, {
  FOO: {
    type: 'object',
    properties: {
      params: {
        type: 'object',
        properties: { foo: { type: 'primitive', value: 'string' } },
        required: ['foo'],
      },
      query: {
        type: 'object',
        properties: {
          bar: {
            type: 'union',
            schemas: [{ type: 'primitive', value: 'number' }, { type: 'undefined' }],
          },
        },
        required: [],
      },
    },
    required: ['params', 'query'],
  },
});
