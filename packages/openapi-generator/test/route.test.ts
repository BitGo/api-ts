import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';

import { TestProject } from './testProject';
import { parseRoute, parsePlainInitializer, type Route } from '../src';

async function testCase(
  description: string,
  src: string,
  expected: Record<string, Route>,
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
          primitive: true,
        },
      },
    ],
    response: {
      200: {
        type: 'string',
        primitive: true,
      },
    },
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
          primitive: true,
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
          schemas: [{ type: 'string', primitive: true }, { type: 'undefined' }],
        },
      },
    ],
    response: {
      200: {
        type: 'string',
        primitive: true,
      },
    },
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
        primitive: true,
      },
    },
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
});
`;

testCase('const response route', RESPONSE_REF, {
  route: {
    path: '/foo',
    method: 'GET',
    parameters: [],
    response: {
      200: { type: 'string', primitive: true },
    },
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
                foo: { type: 'string', primitive: true },
              },
              required: ['foo'],
            },
            {
              type: 'object',
              properties: {
                bar: { type: 'string', primitive: true },
              },
              required: ['bar'],
            },
          ],
        },
      },
    ],
    response: {
      200: { type: 'string', primitive: true },
    },
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
                foo: { type: 'string', primitive: true },
              },
              required: ['foo'],
            },
            {
              type: 'object',
              properties: {
                bar: { type: 'string', primitive: true },
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
        schema: { type: 'string', primitive: true },
      },
    ],
    response: {
      200: { type: 'string', primitive: true },
    },
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
            foo: { type: 'string', primitive: true },
          },
          required: ['foo'],
        },
        {
          type: 'object',
          properties: {
            bar: { type: 'string', primitive: true },
          },
          required: ['bar'],
        },
      ],
    },
    response: {
      200: { type: 'string', primitive: true },
    },
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
        schema: { type: 'string', primitive: true },
      },
      {
        type: 'query',
        name: 'bar',
        required: true,
        schema: { type: 'string', primitive: true },
      },
    ],
    response: {
      200: { type: 'string', primitive: true },
    },
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
            foo: { type: 'string', primitive: true },
          },
          required: ['foo'],
        },
        {
          type: 'object',
          properties: {
            bar: { type: 'string', primitive: true },
          },
          required: ['bar'],
        },
      ],
    },
    response: {
      200: { type: 'string', primitive: true },
    },
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
    parameters: [
      {
        type: 'query',
        name: 'foo',
        required: true,
        schema: {
          type: 'string',
          primitive: true,
        },
      },
    ],
    response: {
      200: {
        type: 'string',
        primitive: true,
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

const HEADER_PARAM = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    headers: {
      'x-foo': t.string,
    },
  }),
  response: {
    200: t.string
  },
});
`;

testCase('header param route', HEADER_PARAM, {
  route: {
    path: '/foo',
    method: 'GET',
    parameters: [
      {
        type: 'header',
        name: 'x-foo',
        required: true,
        schema: {
          type: 'string',
          primitive: true,
        },
      },
    ],
    response: {
      200: {
        type: 'string',
        primitive: true,
      },
    },
  },
});
