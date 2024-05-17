import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';

import { TestProject } from './testProject';
import {
  parseRoute,
  parsePlainInitializer,
  type Route,
  type RouteWithGenerate,
} from '../src';

async function testCase(
  description: string,
  src: string,
  expected: Record<string, RouteWithGenerate>,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    const project = new TestProject({
      '/index.ts': src,
    });
    await project.parseEntryPoint('/index.ts');

    const sourceFile = project.get('/index.ts');
    if (sourceFile === undefined) {
      throw new Error(`could not find source file /index.ts`);
    }

    const actual: Record<string, Route> = {};
    const errors: string[] = [];
    for (const symbol of sourceFile.symbols.declarations) {
      if (symbol.init !== undefined) {
        if (
          symbol.init.type !== 'CallExpression' ||
          symbol.init.callee.type !== 'MemberExpression' ||
          symbol.init.callee.property.type !== 'Identifier' ||
          symbol.init.callee.property.value !== 'httpRoute'
        ) {
          continue;
        }
        const routeSchemaE = parsePlainInitializer(project, sourceFile, symbol.init);
        if (E.isLeft(routeSchemaE)) {
          errors.push(routeSchemaE.left);
          continue;
        }
        if (symbol.comment !== undefined) {
          routeSchemaE.right.comment = symbol.comment;
        }
        const result = parseRoute(project, routeSchemaE.right);
        if (E.isLeft(result)) {
          errors.push(result.left);
        } else {
          actual[symbol.name] = result.right;
        }
      }
    }

    assert.deepEqual(errors, expectedErrors);
    assert.deepEqual(actual, expected);
  });
}

const SIMPLE = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      foo: t.string,
    },
  }),
  response: {
    200: t.string
  },
  generate: true
});
`;

testCase('simple route', SIMPLE, {
  route: {
    path: '/foo',
    method: 'GET',
    parameters: [
      {
        type: 'query',
        name: 'foo',
        required: true,
        schema: {
          type: 'string',
        },
      },
    ],
    response: {
      200: {
        type: 'string',
      },
    },
    generate: true,
  },
});

const PATH_PARAMS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const route = h.httpRoute({
  path: '/foo/:bar',
  method: 'GET',
  request: h.httpRequest({
    params: {
      bar: t.string,
    },
  }),
  response: {
    200: t.type({}),
  },
  generate: true
});
`;

testCase('path params route', PATH_PARAMS, {
  route: {
    path: '/foo/:bar',
    method: 'GET',
    parameters: [
      {
        type: 'path',
        name: 'bar',
        required: true,
        schema: {
          type: 'string',
        },
      },
    ],
    response: {
      200: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    generate: true,
  },
});

const OPTIONAL_QUERY_PARAM = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      foo: h.optional(t.string),
    },
  }),
  response: {
    200: t.string
  },
});
`;

testCase('optional query param route', OPTIONAL_QUERY_PARAM, {
  route: {
    path: '/foo',
    method: 'GET',
    parameters: [
      {
        type: 'query',
        name: 'foo',
        required: false,
        schema: {
          type: 'union',
          schemas: [{ type: 'string' }, { type: 'undefined' }],
        },
      },
    ],
    response: {
      200: {
        type: 'string',
      },
    },
    generate: false,
  },
});

const REQUEST_REF = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const request = h.httpRequest({})

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: request,
  response: {
    200: t.string
  },
  generate: true
});
`;

testCase('const request route', REQUEST_REF, {
  route: {
    path: '/foo',
    method: 'GET',
    parameters: [],
    response: {
      200: {
        type: 'string',
      },
    },
    generate: true,
  },
});

const RESPONSE_REF = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const responses = {
  200: t.string
}

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({}),
  response: responses,
  generate: true
});
`;

testCase('const response route', RESPONSE_REF, {
  route: {
    path: '/foo',
    method: 'GET',
    parameters: [],
    response: {
      200: { type: 'string' },
    },
    generate: true,
  },
});

const QUERY_PARAM_UNION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: t.union([
    h.httpRequest({
      query: {
        foo: t.string,
      },
    }),
    h.httpRequest({
      query: {
        bar: t.string,
      },
    }),
  ]),
  response: {
    200: t.string
  },
  generate: true
});
`;

testCase('query param union route', QUERY_PARAM_UNION, {
  route: {
    path: '/foo',
    method: 'GET',
    parameters: [
      {
        type: 'query',
        name: 'union',
        required: true,
        explode: true,
        schema: {
          type: 'union',
          schemas: [
            {
              type: 'object',
              properties: {
                foo: { type: 'string' },
              },
              required: ['foo'],
            },
            {
              type: 'object',
              properties: {
                bar: { type: 'string' },
              },
              required: ['bar'],
            },
          ],
        },
      },
    ],
    response: {
      200: { type: 'string' },
    },
    generate: true,
  },
});

const PATH_PARAM_UNION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const route = h.httpRoute({
  path: '/foo/{id}',
  method: 'GET',
  request: t.union([
    h.httpRequest({
      query: {
        foo: t.string,
      },
      params: {
        id: t.string,
      }
    }),
    h.httpRequest({
      query: {
        bar: t.string,
      },
      params: {
        id: t.string,
      }
    }),
  ]),
  response: {
    200: t.string
  },
  generate: true
});
`;

testCase('path param union route', PATH_PARAM_UNION, {
  route: {
    path: '/foo/{id}',
    method: 'GET',
    parameters: [
      {
        type: 'query',
        name: 'union',
        required: true,
        explode: true,
        schema: {
          type: 'union',
          schemas: [
            {
              type: 'object',
              properties: {
                foo: { type: 'string' },
              },
              required: ['foo'],
            },
            {
              type: 'object',
              properties: {
                bar: { type: 'string' },
              },
              required: ['bar'],
            },
          ],
        },
      },
      {
        type: 'path',
        name: 'id',
        required: true,
        schema: { type: 'string' },
      },
    ],
    response: {
      200: { type: 'string' },
    },
    generate: true,
  },
});

const BODY_UNION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const route = h.httpRoute({
  path: '/foo',
  method: 'POST',
  request: t.union([
    h.httpRequest({
      body: {
        foo: t.string,
      },
    }),
    h.httpRequest({
      body: {
        bar: t.string,
      },
    }),
  ]),
  response: {
    200: t.string
  },
  generate: true
});
`;

testCase('body union route', BODY_UNION, {
  route: {
    path: '/foo',
    method: 'POST',
    parameters: [],
    body: {
      type: 'union',
      schemas: [
        {
          type: 'object',
          properties: {
            foo: { type: 'string' },
          },
          required: ['foo'],
        },
        {
          type: 'object',
          properties: {
            bar: { type: 'string' },
          },
          required: ['bar'],
        },
      ],
    },
    response: {
      200: { type: 'string' },
    },
    generate: true,
  },
});

const REQUEST_INTERSECTION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const route = h.httpRoute({
  path: '/foo',
  method: 'POST',
  request: t.intersection([
    h.httpRequest({
      query: {
        foo: t.string,
      },
    }),
    h.httpRequest({
      query: {
        bar: t.string,
      },
    }),
  ]),
  response: {
    200: t.string
  },
  generate: true
});
`;

testCase('request intersection route', REQUEST_INTERSECTION, {
  route: {
    path: '/foo',
    method: 'POST',
    parameters: [
      {
        type: 'query',
        name: 'foo',
        required: true,
        schema: { type: 'string' },
      },
      {
        type: 'query',
        name: 'bar',
        required: true,
        schema: { type: 'string' },
      },
    ],
    response: {
      200: { type: 'string' },
    },
    generate: true,
  },
});

const BODY_INTERSECTION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const route = h.httpRoute({
  path: '/foo',
  method: 'POST',
  request: t.intersection([
    h.httpRequest({
      body: {
        foo: t.string,
      }
    }),
    h.httpRequest({
      body: {
        bar: t.string,
      },
    }),
  ]),
  response: {
    200: t.string
  },
});
`;

testCase('request body intersection route', BODY_INTERSECTION, {
  route: {
    path: '/foo',
    method: 'POST',
    parameters: [],
    body: {
      type: 'intersection',
      schemas: [
        {
          type: 'object',
          properties: {
            foo: { type: 'string' },
          },
          required: ['foo'],
        },
        {
          type: 'object',
          properties: {
            bar: { type: 'string' },
          },
          required: ['bar'],
        },
      ],
    },
    response: {
      200: { type: 'string' },
    },
    generate: false,
  },
});

const WITH_OPERATION_ID = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A route
 *
 * @operationId foo
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      foo: t.string,
    },
  }),
  response: {
    200: t.string
  },
});
`;

testCase('route with operationId', WITH_OPERATION_ID, {
  route: {
    path: '/foo',
    method: 'GET',
    generate: false,
    parameters: [
      {
        type: 'query',
        name: 'foo',
        required: true,
        schema: {
          type: 'string',
        },
      },
    ],
    response: {
      200: {
        type: 'string',
      },
    },
    comment: {
      description: 'A route',
      tags: [
        {
          tag: 'operationId',
          name: 'foo',
          type: '',
          optional: false,
          description: '',
          problems: [],
          source: [
            {
              number: 3,
              source: ' * @operationId foo',
              tokens: {
                start: ' ',
                delimiter: '*',
                postDelimiter: ' ',
                tag: '@operationId',
                postTag: ' ',
                name: 'foo',
                postName: '',
                type: '',
                postType: '',
                description: '',
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
        },
      ],
      source: [
        {
          number: 0,
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
          number: 1,
          source: ' * A route',
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
            description: 'A route',
            end: '',
            lineEnd: '',
          },
        },
        {
          number: 2,
          source: ' *',
          tokens: {
            start: ' ',
            delimiter: '*',
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
          source: ' * @operationId foo',
          tokens: {
            start: ' ',
            delimiter: '*',
            postDelimiter: ' ',
            tag: '@operationId',
            postTag: ' ',
            name: 'foo',
            postName: '',
            type: '',
            postType: '',
            description: '',
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
