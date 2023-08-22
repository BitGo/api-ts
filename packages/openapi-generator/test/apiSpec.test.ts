import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert';
import test from 'node:test';

import { parseSource, parseApiSpec, Project, type Route } from '../src';

async function testCase(
  description: string,
  src: string,
  expected: Record<string, Route[]>,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    const sourceFile = await parseSource('./index.ts', src);

    const actual: Record<string, Route[]> = {};
    const errors: string[] = [];
    for (const symbol of sourceFile.symbols.declarations) {
      if (symbol.init !== undefined) {
        if (symbol.init.type !== 'CallExpression') {
          continue;
        } else if (
          symbol.init.callee.type !== 'MemberExpression' ||
          symbol.init.callee.property.type !== 'Identifier' ||
          symbol.init.callee.property.value !== 'apiSpec'
        ) {
          continue;
        } else if (symbol.init.arguments.length !== 1) {
          continue;
        }
        const arg = symbol.init.arguments[0]!;
        if (arg.expression.type !== 'ObjectExpression') {
          continue;
        }
        const result = parseApiSpec(new Project(), sourceFile, arg.expression);
        if (E.isLeft(result)) {
          errors.push(result.left);
        } else {
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
import * as h from '@api-ts/io-ts-http';
export const test = h.apiSpec({
  'api.test': {
    get: h.httpRoute({
      path: '/test',
      method: 'GET',
      request: h.httpRequest({}),
      response: {
        200: t.string,
      },
    })
  }
});
`;

testCase('simple api spec', SIMPLE, {
  test: [
    {
      path: '/test',
      method: 'GET',
      parameters: [],
      response: { 200: { type: 'primitive', value: 'string' } },
    },
  ],
});

const ROUTE_REF = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const testRoute = h.httpRoute({
  path: '/test',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: t.string,
  },
});

export const test = h.apiSpec({
  'api.test': {
    get: testRoute,
  }
});
`;

testCase('const route reference', ROUTE_REF, {
  test: [
    {
      path: '/test',
      method: 'GET',
      parameters: [],
      response: { 200: { type: 'primitive', value: 'string' } },
    },
  ],
});

const ACTION_REF = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const testAction = {
  get: h.httpRoute({
    path: '/test',
    method: 'GET',
    request: h.httpRequest({}),
    response: {
      200: t.string,
    },
  }),
};

export const test = h.apiSpec({
  'api.test': testAction,
});
`;

testCase('const action reference', ACTION_REF, {
  test: [
    {
      path: '/test',
      method: 'GET',
      parameters: [],
      response: { 200: { type: 'primitive', value: 'string' } },
    },
  ],
});
