import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';
import { OpenAPIV3_1 } from 'openapi-types';

import {
  convertRoutesToOpenAPI,
  parsePlainInitializer,
  parseSource,
  parseRoute,
  Project,
  type Route,
  type Schema,
} from '../src';

async function testCase(
  description: string,
  src: string,
  expected: OpenAPIV3_1.Document<{ 'x-internal'?: boolean }>,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    const sourceFile = await parseSource('./index.ts', src);

    const project = new Project();
    const routes: Route[] = [];
    const schemas: Record<string, Schema> = {};
    const errors: string[] = [];
    for (const symbol of sourceFile.symbols.declarations) {
      if (symbol.init !== undefined) {
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
          schemas[symbol.name] = routeSchemaE.right;
        } else {
          routes.push(result.right);
        }
      }
    }

    const actual = convertRoutesToOpenAPI(
      { title: 'Test', version: '1.0.0' },
      routes,
      schemas,
    );

    assert.deepEqual(errors, expectedErrors);
    assert.deepEqual(actual, expected);
  });
}

const SIMPLE = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route
 *
 * ## How to call the route
 *
 * \`\`\`
 * curl -X GET http://localhost:3000/foo?foo=bar
 * \`\`\`
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** foo param */
      foo: t.string,
    },
  }),
  response: {
    /** foo response */
    200: t.string
  },
});

/**
 * An internal route
 *
 * @private
 * @operationId api.v1.private
 * @tag Internal Routes
 */
export const internalRoute = h.httpRoute({
  path: '/private/foo',
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
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route',
        description:
          '## How to call the route\n' +
          '\n' +
          '```\n' +
          'curl -X GET http://localhost:3000/foo?foo=bar\n' +
          '```',
        operationId: 'api.v1.test',
        tags: ['Test Routes'],
        parameters: [
          {
            in: 'query',
            name: 'foo',
            description: 'foo param',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'foo response',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    '/private/foo': {
      get: {
        summary: 'An internal route',
        operationId: 'api.v1.private',
        tags: ['Internal Routes'],
        'x-internal': true,
        parameters: [
          {
            in: 'query',
            name: 'foo',
            required: true,
            schema: {
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {},
  },
});

const REQUEST_BODY = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    body: {
      foo: t.string,
    },
  }),
  response: {
    /** foo response */
    200: t.string
  },
});
`;

testCase('request body route', REQUEST_BODY, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                  },
                },
                required: ['foo'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'foo response',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {},
  },
});

const UNION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: t.union([
    h.httpRequest({
      query: {
        foo: t.string
      }
    }),
    h.httpRequest({
      query: {
        bar: t.string
      }
    }),
  ]),
  response: {
    /** foo response */
    200: t.string
  },
});
`;

testCase('request union route', UNION, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'union',
            required: true,
            style: 'form',
            explode: true,
            schema: {
              oneOf: [
                {
                  type: 'object',
                  properties: {
                    foo: {
                      type: 'string',
                    },
                  },
                  required: ['foo'],
                },
                {
                  type: 'object',
                  properties: {
                    bar: {
                      type: 'string',
                    },
                  },
                  required: ['bar'],
                },
              ],
            },
          },
        ],
        responses: {
          200: {
            description: 'foo response',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {},
  },
});

const NULLABLE_PROPERTY = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    body: {
      foo: t.union([t.string, t.null]),
    },
  }),
  response: {
    /** foo response */
    200: t.string
  },
});
`;

testCase('nullable property route', NULLABLE_PROPERTY, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                    nullable: true,
                  },
                },
                required: ['foo'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'foo response',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {},
  },
});

const HEADER_COMMENT = `
/*
 * This is a comment
 */

import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route
 *
 * ## How to call the route
 *
 * \`\`\`
 * curl -X GET http://localhost:3000/foo?foo=bar
 * \`\`\`
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: t.string
  },
});
`;

testCase('source file with a header comment', HEADER_COMMENT, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route',
        description:
          '## How to call the route\n' +
          '\n' +
          '```\n' +
          'curl -X GET http://localhost:3000/foo?foo=bar\n' +
          '```',
        operationId: 'api.v1.test',
        tags: ['Test Routes'],
        parameters: [],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {},
  },
});

const EMPTY_REQUIRED = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    body: {
      foo: t.string,
    },
  }),
  response: {
    /** foo response */
    200: t.partial({ foo: t.string })
  },
});
`;

// Test that `required` is not emitted as an empty array
testCase('object with no required properties', EMPTY_REQUIRED, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                  },
                },
                required: ['foo'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'foo response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    foo: {
                      type: 'string',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {},
  },
});

const SCHEMA_REF = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: t.type({
    body: Foo,
  }),
  response: {
    /** foo response */
    200: t.string
  },
});

const Foo = t.type({ foo: t.string });
`;

testCase('request body ref', SCHEMA_REF, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Foo',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'foo response',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Foo: {
        title: 'Foo',
        type: 'object',
        properties: {
          foo: {
            type: 'string',
          },
        },
        required: ['foo'],
      },
    },
  },
});

const SCHEMA_DOUBLE_REF = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: t.type({
    body: Bar,
  }),
  response: {
    /** foo response */
    200: t.string
  },
});

const Foo = t.type({ foo: t.string });

const Bar = Foo;
`;

testCase('request body double ref', SCHEMA_DOUBLE_REF, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Bar',
              },
            },
          },
        },
        responses: {
          200: {
            description: 'foo response',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Foo: {
        title: 'Foo',
        type: 'object',
        properties: {
          foo: {
            type: 'string',
          },
        },
        required: ['foo'],
      },
      Bar: {
        allOf: [{ title: 'Bar' }, { $ref: '#/components/schemas/Foo' }],
      },
    },
  },
});

const TITLE_TAG = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const oneOfRoute = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: t.union([
    h.httpRequest({
      /** @title this is a title for a oneOf option */
      query: {
        /** @title this is a title for a oneOf option's property */
        foo: t.string
      }
    }),
    h.httpRequest({
      query: {
        bar: t.string
      }
    }),
  ]),
  response: {
    /** foo response */
    200: t.string
  },
});

export const route = h.httpRoute({
  path: '/bar',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /**
       * bar param
       * @title this is a bar parameter
       * */
      bar: t.string,
    },
  }),
  response: {
    /** bar response */
    200: t.string
  },
});
`;

testCase('schema parameter with title tag', TITLE_TAG, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'union',
            required: true,
            style: 'form',
            explode: true,
            schema: {
              oneOf: [
                {
                  type: 'object',
                  title: 'this is a title for a oneOf option',
                  properties: {
                    foo: {
                      type: 'string',
                      title: "this is a title for a oneOf option's property",
                    },
                  },
                  required: ['foo'],
                },
                {
                  type: 'object',
                  properties: {
                    bar: {
                      type: 'string',
                    },
                  },
                  required: ['bar'],
                },
              ],
            },
          },
        ],
        responses: {
          200: {
            description: 'foo response',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    '/bar': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'bar',
            description: 'bar param',
            required: true,
            schema: {
              title: 'this is a bar parameter',
              type: 'string',
            },
          },
        ],
        responses: {
          200: {
            description: 'bar response',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {},
  },
});
