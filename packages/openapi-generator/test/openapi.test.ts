import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  convertRoutesToOpenAPI,
  parsePlainInitializer,
  parseSource,
  parseRoute,
  Project,
  type Route,
  type Schema,
} from '../src';
import { SourceFile } from '../src/sourceFile';

async function testCase(
  description: string,
  src: string,
  expected: any,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    const sourceFile = await parseSource('./index.ts', src);
    if (sourceFile === undefined) {
      throw new Error('Failed to parse source file');
    }
    const files: Record<string, SourceFile> = { './index.ts': sourceFile };
    const project = new Project(files);
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
      [],
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

/**
 * An unstable route
 *
 * @unstable
 * @operationId api.v1.unstable
 * @tag Unstable Routes
 */
export const unstableRoute = h.httpRoute({
  path: '/unstable/foo',
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
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  description: 'foo response',
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
    '/unstable/foo': {
      get: {
        summary: 'An unstable route',
        operationId: 'api.v1.unstable',
        tags: ['Unstable Routes'],
        'x-unstable': true,
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
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  description: 'foo response',
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
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  description: 'foo response',
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
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  description: 'foo response',
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
    200: t.partial({
      /** string called foo */
      foo: t.string
    })
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
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'foo response',
                  properties: {
                    foo: {
                      description: 'string called foo',
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
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  description: 'foo response',
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

const SCHEMA_REF_WITH_COMMENT_AT_DECLARATION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    params: {
      body: t.string,
      /**
       * Size of the body
       * @example 10
       */
      size: t.number,
    }
  }),
  response: {
    200: Foo
  },
});

/**
 * a Foo of type 'string'
 * @example "foo"
 */
const Foo = t.string;
`;

testCase('request body ref with comments', SCHEMA_REF_WITH_COMMENT_AT_DECLARATION, {
  openapi: "3.0.3",
  info: {
    title: "Test",
    version: "1.0.0"
  },
  paths: {
    "/foo": {
      get: {
        parameters: [
          {
            name: "body",
            in: "path",
            required: true,
            schema: {
              type: "string"
            }
          },
          {
            name: "size",
            description: "Size of the body",
            in: "path",
            required: true,
            schema: {
              type: "number",
              example: 10
            }
          }
        ],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/Foo"
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Foo: {
        title: "Foo",
        type: "string",
        description: "a Foo of type 'string'",
        example: "foo"
      }
    }
  }
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
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  description: 'foo response',
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

const SCHEMA_NULLABLE_REF = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: t.type({
    body: t.union([Foo, t.null]),
  }),
  response: {
    /** foo response */
    200: t.string
  },
});

const Foo = t.type({ foo: t.string });
`;

testCase('request body nullable ref', SCHEMA_NULLABLE_REF, {
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
                nullable: true,
                allOf: [
                  {
                    $ref: '#/components/schemas/Foo',
                  },
                ],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  description: 'foo response',
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
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  description: 'foo response',
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
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  description: 'bar response',
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

const OPTIONAL_PARAM = `
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
    /** foo response */
    200: t.string
  },
});
`;

testCase('optional parameter', OPTIONAL_PARAM, {
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
            name: 'foo',
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
                  description: 'foo response',
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

const ROUTE_WITH_RESPONSE_EXAMPLE_STRING = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route
 *
 * @operationId api.v1.test
 * @tag Test Routes
 * @example bar
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

testCase('route with example string', ROUTE_WITH_RESPONSE_EXAMPLE_STRING, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route',
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
                example: 'bar',
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

const ROUTE_WITH_RESPONSE_EXAMPLE_OBJECT = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route
 *
 * @operationId api.v1.test
 * @tag Test Routes
 * @example { "test": "bar" }
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with example object', ROUTE_WITH_RESPONSE_EXAMPLE_OBJECT, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route',
        operationId: 'api.v1.test',
        tags: ['Test Routes'],
        parameters: [],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string',
                    },
                  },
                  required: ['test'],
                },
                example: {
                  test: 'bar',
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

const ROUTE_WITH_RESPONSE_EXAMPLE_OBJECT_MULTILINE = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route
 *
 * @operationId api.v1.test
 * @tag Test Routes
 * @example {
 *   "test": "bar"
 * }
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase(
  'route with example object multi-line',
  ROUTE_WITH_RESPONSE_EXAMPLE_OBJECT_MULTILINE,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {
      '/foo': {
        get: {
          summary: 'A simple route',
          operationId: 'api.v1.test',
          tags: ['Test Routes'],
          parameters: [],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      test: {
                        type: 'string',
                      },
                    },
                    required: ['test'],
                  },
                  example: {
                    test: 'bar',
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
  },
);

const ROUTE_WITH_UNKNOWN_TAG = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route
 *
 * @operationId api.v1.test
 * @tag Test Routes
 * @optout true
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with unknown tag', ROUTE_WITH_UNKNOWN_TAG, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route',
        operationId: 'api.v1.test',
        tags: ['Test Routes'],
        'x-unknown-tags': {
          optout: 'true',
        },
        parameters: [],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string',
                    },
                  },
                  required: ['test'],
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

const ROUTE_WITH_MULTIPLE_UNKNOWN_TAGS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route
 *
 * @operationId api.v1.test
 * @tag Test Routes
 * @optout true
 * @critical false
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with multiple unknown tags', ROUTE_WITH_MULTIPLE_UNKNOWN_TAGS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route',
        operationId: 'api.v1.test',
        tags: ['Test Routes'],
        'x-unknown-tags': {
          optout: 'true',
          critical: 'false',
        },
        parameters: [],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string',
                    },
                  },
                  required: ['test'],
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


const ROUTE_WITH_TYPE_DESCRIPTIONS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** bar param */
      bar: t.string,
    },
    body: {
      /** foo description */
      foo: t.string,
      /** bar description */
      bar: t.number,
      child: {
        /** child description */
        child: t.string,
      }
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with type descriptions', ROUTE_WITH_TYPE_DESCRIPTIONS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions',
        operationId: 'api.v1.test',
        tags: ['Test Routes'],
        parameters: [
          {
            description: 'bar param',
            in: 'query',
            name: 'bar',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  bar: {
                    description: 'bar description',
                    type: 'number'
                  },
                  child: {
                    properties: {
                      child: {
                        description: 'child description',
                        type: 'string'
                      }
                    },
                    required: [
                      'child'
                    ],
                    type: 'object'
                  },
                  foo: {
                    description: 'foo description',
                    type: 'string'
                  }
                },
                required: [
                  'foo',
                  'bar',
                  'child'
                ],
                type: 'object'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string',
                    },
                  },
                  required: ['test'],
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


const ROUTE_WITH_TYPE_DESCRIPTIONS_OPTIONAL = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** bar param */
      bar: t.string,
    },
    body: {
      /** foo description */
      foo: h.optional(t.string),
      /** bar description */
      bar: h.optional(t.number),
      child: {
        /** child description */
        child: h.optional(t.string),
      }
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;


testCase('route with type descriptions with optional fields', ROUTE_WITH_TYPE_DESCRIPTIONS_OPTIONAL, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions',
        operationId: 'api.v1.test',
        tags: ['Test Routes'],
        parameters: [
          {
            description: 'bar param',
            in: 'query',
            name: 'bar',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  bar: {
                    description: 'bar description',
                    type: 'number'
                  },
                  child: {
                    properties: {
                      child: {
                        description: 'child description',
                        type: 'string'
                      }
                    },
                    type: 'object'
                  },
                  foo: {
                    description: 'foo description',
                    type: 'string'
                  }
                },
                required: [
                  'child'
                ],
                type: 'object'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string',
                    },
                  },
                  required: ['test'],
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

const ROUTE_WITH_MIXED_TYPES_AND_DESCRIPTIONS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** bar param */
      bar: t.string,
    },
    body: {
      /** description to describe an optional string */
      foo: h.optional(t.string),
      /** description to describe an optional union of number and string */
      bar: h.optional(t.union([t.number, t.string])),
      /** description to describe an object */
      child: {
        /** dsecription to describe an intersection of a type and a partial */
        child: t.intersection([t.type({ foo: t.string }), t.partial({ bar: t.number })]),
      },
      /** description to describe a t.type */
      error: t.type({ error: t.string }),
      /** description to describe an optional t.object */
      obj: h.optional(t.object({})),
      /** description to describe a t.exact */
      exact: t.exact(t.type({ foo: t.string })),
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with mixed types and descriptions', ROUTE_WITH_MIXED_TYPES_AND_DESCRIPTIONS,
  {
    openapi: "3.0.3",
    info: {
      title: "Test",
      version: "1.0.0"
    },
    paths: {
      '/foo': {
        get: {
          summary: "A simple route with type descriptions",
          operationId: "api.v1.test",
          tags: [
            "Test Routes"
          ],
          parameters: [
            {
              name: "bar",
              description: "bar param",
              in: "query",
              required: true,
              schema: {
                type: "string"
              }
            }
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: "object",
                  properties: {
                    foo: {
                      type: "string",
                      description: "description to describe an optional string"
                    },
                    bar: {
                      oneOf: [
                        {
                          type: "number"
                        },
                        {
                          type: "string"
                        }
                      ],
                      description: "description to describe an optional union of number and string"
                    },
                    child: {
                      type: "object",
                      description: "description to describe an object",
                      properties: {
                        child: {
                          type: "object",
                          description: "dsecription to describe an intersection of a type and a partial",
                          properties: {
                            foo: {
                              type: "string"
                            },
                            bar: {
                              type: "number"
                            }
                          },
                          required: [
                            "foo"
                          ]
                        }
                      },
                      required: [
                        "child"
                      ]
                    },
                    error: {
                      type: "object",
                      description: "description to describe a t.type",
                      properties: {
                        error: {
                          type: "string"
                        }
                      },
                      required: [
                        "error"
                      ]
                    },
                    obj: {
                      type: "object",
                      description: "description to describe an optional t.object",
                      properties: {}
                    },
                    exact: {
                      type: "object",
                      description: "description to describe a t.exact",
                      properties: {
                        foo: {
                          type: "string"
                        }
                      },
                      required: [
                        "foo"
                      ]
                    }
                  },
                  required: [
                    "child",
                    "error",
                    "exact"
                  ]
                }
              }
            }
          },
          responses: {
            200: {
              description: "OK",
              content: {
                'application/json': {
                  schema: {
                    type: "object",
                    properties: {
                      test: {
                        type: "string"
                      }
                    },
                    required: [
                      "test"
                    ]
                  }
                }
              }
            }
          }
        }
      }
    },
    components: {
      schemas: {}
    }
  });

const ROUTE_WITH_ARRAY_TYPES_AND_DESCRIPTIONS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** bar param */
      bar: t.string,
    },
    body: {
      /** foo description */
      foo: t.array(t.string),
      /** bar description */
      bar: t.array(t.number),
      child: {
        /** child description */
        child: t.array(t.union([t.string, t.number])),
      }
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with array types and descriptions', ROUTE_WITH_ARRAY_TYPES_AND_DESCRIPTIONS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions',
        operationId: 'api.v1.test',
        tags: [
          'Test Routes'
        ],
        parameters: [
          {
            name: 'bar',
            description: 'bar param',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'array',
                    items: {
                      type: 'string',
                      description: 'foo description'
                    },
                  },
                  bar: {
                    type: 'array',
                    items: {
                      type: 'number',
                      description: 'bar description'
                    },
                  },
                  child: {
                    type: 'object',
                    properties: {
                      child: {
                        type: 'array',
                        items: {
                          oneOf: [
                            {
                              type: 'string'
                            },
                            {
                              type: 'number'
                            }
                          ],
                          description: 'child description'
                        },
                      }
                    },
                    required: [
                      'child'
                    ]
                  }
                },
                required: [
                  'foo',
                  'bar',
                  'child'
                ]
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string'
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});

const ROUTE_WITH_RECORD_TYPES_AND_DESCRIPTIONS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** bar param */
      bar: t.record(t.string, t.string),
    },
    body: {
      /** foo description */
      foo: t.record(t.string, t.number),
      child: {
        /** child description */
        child: t.record(t.string, t.array(t.union([t.string, t.number]))),
      }
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with record types and descriptions', ROUTE_WITH_RECORD_TYPES_AND_DESCRIPTIONS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions',
        operationId: 'api.v1.test',
        tags: [
          'Test Routes'
        ],
        parameters: [
          {
            name: 'bar',
            description: 'bar param',
            in: 'query',
            required: true,
            schema: {
              type: 'object',
              additionalProperties: {
                type: 'string'
              }
            }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'object',
                    additionalProperties: {
                      type: 'number'
                    },
                    description: 'foo description'
                  },
                  child: {
                    type: 'object',
                    properties: {
                      child: {
                        type: 'object',
                        additionalProperties: {
                          type: 'array',
                          items: {
                            oneOf: [
                              {
                                type: 'string'
                              },
                              {
                                type: 'number'
                              }
                            ]
                          }
                        },
                        description: 'child description'
                      }
                    },
                    required: [
                      'child'
                    ]
                  }
                },
                required: [
                  'foo',
                  'child'
                ]
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string'
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});

const ROUTE_WITH_DESCRIPTIONS_PATTERNS_EXAMPLES = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** 
       * This is a bar param.
       * @example { "foo": "bar" }
      */
      bar: t.record(t.string, t.string),
    },
    body: {
      /**
       * foo description
       * @pattern ^[1-9][0-9]{4}$
       * @example 12345
      */
      foo: t.number,
      child: {
        /** 
         * child description 
        */
        child: t.array(t.union([t.string, t.number])),
      }
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with descriptions, patterns, and examples', ROUTE_WITH_DESCRIPTIONS_PATTERNS_EXAMPLES, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions',
        operationId: 'api.v1.test',
        tags: [
          'Test Routes'
        ],
        parameters: [
          {
            name: 'bar',
            description: 'This is a bar param.',
            in: 'query',
            required: true,
            schema: {
              type: 'object',
              example: {
                foo: 'bar'
              },
              additionalProperties: {
                type: 'string'
              }
            }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'number',
                    description: 'foo description',
                    example: 12345,
                    pattern: '^[1-9][0-9]{4}$'
                  },
                  child: {
                    type: 'object',
                    properties: {
                      child: {
                        type: 'array',
                        items: {
                          description: 'child description',
                          oneOf: [
                            {
                              type: 'string'
                            },
                            {
                              type: 'number'
                            }
                          ]
                        },
                      }
                    },
                    required: [
                      'child'
                    ]
                  }
                },
                required: [
                  'foo',
                  'child'
                ]
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string'
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});

const ROUTE_WITH_DESCRIPTIONS_FOR_REFERENCES = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const Foo = t.type({ foo: t.string });
const Bar = t.type({ bar: t.number });

/**
 * A simple route with type descriptions for references
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      bar: t.array(t.string),
    },
    body: {
      /** 
       * This is a foo description. 
       * @example BitGo Inc
      */
      foo: Foo,
      bar: Bar,
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with descriptions for references', ROUTE_WITH_DESCRIPTIONS_FOR_REFERENCES, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions for references',
        operationId: 'api.v1.test',
        tags: [
          'Test Routes'
        ],
        parameters: [
          {
            name: 'bar',
            in: 'query',
            required: true,
            schema: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  // needs to be wrapped in an allOf to preserve the description
                  foo: {
                    allOf: [
                      {
                        $ref: '#/components/schemas/Foo'
                      }
                    ],
                    description: 'This is a foo description.',
                    example: 'BitGo Inc'
                  },
                  // should not need to be wrapped in an allOf
                  bar: {
                    $ref: '#/components/schemas/Bar'
                  }
                },
                required: [
                  'foo',
                  'bar'
                ]
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string'
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      Foo: {
        title: 'Foo',
        type: 'object',
        properties: {
          foo: {
            type: 'string'
          }
        },
        required: [
          'foo'
        ]
      },
      Bar: {
        title: 'Bar',
        type: 'object',
        properties: {
          bar: {
            type: 'number'
          }
        },
        required: [
          'bar'
        ]
      }
    }
  }
});

const ROUTE_WITH_MIN_AND_MAX_VALUES_FOR_STRINGS_AND_DEFAULT = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions for references
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      bar: t.array(t.string),
    },
    body: {
      /** 
       * This is a foo description. 
       * @minLength 5
       * @maxLength 10
       * @example SomeInc
       * @default BitgoInc
      */
      foo: t.string()
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with min and max values for strings and default value', ROUTE_WITH_MIN_AND_MAX_VALUES_FOR_STRINGS_AND_DEFAULT, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions for references',
        operationId: 'api.v1.test',
        tags: [
          'Test Routes'
        ],
        parameters: [
          {
            name: 'bar',
            in: 'query',
            required: true,
            schema: {
              type: 'array',
              items: {
                type: 'string'
              }
            }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                    description: 'This is a foo description.',
                    example: 'SomeInc',
                    default: 'BitgoInc',
                    minLength: 5,
                    maxLength: 10
                  }
                },
                required: [
                  'foo'
                ]
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string'
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});

const ROUTE_WITH_DEPRECATED_TAG = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions for references
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    body: {
      /** 
       * This is a foo description. 
       * @deprecated
      */
      foo: t.string()
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with deprecated tag', ROUTE_WITH_DEPRECATED_TAG, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions for references',
        operationId: 'api.v1.test',
        parameters: [],
        tags: [
          'Test Routes'
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'string',
                    description: 'This is a foo description.',
                    deprecated: true
                  }
                },
                required: [
                  'foo'
                ]
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string'
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});

const ROUTE_WITH_MIN_MAX_AND_OTHER_TAGS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions for references
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    body: {
      /** 
       * This is a foo description. 
       * @minimum 5
       * @maximum 10
       * @minItems 1
       * @maxItems 5
       * @minProperties 1
       * @maxProperties 500
       * @exclusiveMinimum true
       * @exclusiveMaximum true
       * @multipleOf 7
       * @uniqueItems true
       * @readOnly true
       * @writeOnly true
      */
      foo: t.number()
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with min and max tags', ROUTE_WITH_MIN_MAX_AND_OTHER_TAGS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions for references',
        operationId: 'api.v1.test',
        parameters: [],
        tags: [
          'Test Routes'
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  foo: {
                    type: 'number',
                    description: 'This is a foo description.',
                    minimum: 5,
                    maximum: 10,
                    minItems: 1,
                    maxItems: 5,
                    minProperties: 1,
                    multipleOf: 7,
                    maxProperties: 500,
                    exclusiveMinimum: true,
                    exclusiveMaximum: true,
                    uniqueItems: true,
                    readOnly: true,
                    writeOnly: true
                  }
                },
                required: [
                  'foo'
                ]
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string'
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});

const ROUTE_WITH_ARRAY_QUERY_PARAM = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions for references
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** 
       * This is a foo description. 
       * @example abc
       * @pattern ^[a-z]+$
      */
      foo: h.optional(t.array(t.string))
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with optional array query parameter and documentation', ROUTE_WITH_ARRAY_QUERY_PARAM, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions for references',
        operationId: 'api.v1.test',
        tags: [
          'Test Routes'
        ],
        parameters: [
          {
            description: 'This is a foo description.',
            in: 'query',
            name: 'foo',
            schema: {
              items: {
                description: 'This is a foo description.',
                example: 'abc',
                type: 'string',
                pattern: '^[a-z]+$'
              },
              type: 'array'
            }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string'
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});


const ROUTE_WITH_ARRAY_UNION_NULL_UNDEFINED_QUERY_PARAM = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions for references
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** 
       * This is a foo description. 
       * @example abc
       * @pattern ^[a-z]+$
       */
      ipRestrict: t.union([t.array(t.string), t.null, t.undefined]),
    },
  }),
  response: {
    200: {
      test: t.string
    }
  },
});
`;

testCase('route with array union of null and undefined', ROUTE_WITH_ARRAY_UNION_NULL_UNDEFINED_QUERY_PARAM, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions for references',
        operationId: 'api.v1.test',
        tags: [
          'Test Routes'
        ],
        parameters: [
          {
            description: 'This is a foo description.',
            in: 'query',
            name: 'ipRestrict',
            schema: {
              items: {
                description: 'This is a foo description.',
                example: 'abc',
                type: 'string',
                pattern: '^[a-z]+$'
              },
              type: 'array'
            }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'string'
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});

const ROUTE_WITH_SCHEMA_WITH_COMMENT = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A simple route with type descriptions for references
 *
 * @operationId api.v1.test
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: SimpleRouteResponse,
    400: ApiError,
    401: InvalidError
  },
 });

/**
 * Human readable description of the Simple Route Response
 * @title Human Readable Simple Route Response
 */
const SimpleRouteResponse = t.type({
  test: t.string,
});

/**
 * Human readable description of the InvalidError schema
 * @title Human Readable Invalid Error Schema
 */
const InvalidError = t.intersection([
  ApiError, 
  t.type({ error: t.literal('invalid') })]);

/**
 * Human readable description of the ApiError schema
 * @title Human Readable Api Error Schema
 */
const ApiError = t.type({
  error: t.string,
});
 `;

testCase('route with api error schema', ROUTE_WITH_SCHEMA_WITH_COMMENT, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions for references',
        operationId: 'api.v1.test',
        tags: [
          'Test Routes'
        ],
        parameters: [],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  '$ref': '#/components/schemas/SimpleRouteResponse'
                }
              }
            }
          },
          '400': {
            content: {
              'application/json': {
                schema: {
                  '$ref': '#/components/schemas/ApiError'
                }
              }
            },
            description: 'Bad Request'
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/InvalidError'
                }
              }
            }
          }
        }
      }
    },
  },
  components: {
    schemas: {
      ApiError: {
        properties: {
          error: {
            type: 'string'
          }
        },
        required: [
          'error'
        ],
        title: 'Human Readable Api Error Schema',
        description: 'Human readable description of the ApiError schema',
        type: 'object'
      },
      SimpleRouteResponse: {
        description: 'Human readable description of the Simple Route Response',
        properties: {
          test: {
            type: 'string'
          }
        },
        required: [
          'test'
        ],
        title: 'Human Readable Simple Route Response',
        type: 'object',
      },
      InvalidError: {
        title: 'Human Readable Invalid Error Schema',
        description: 'Human readable description of the InvalidError schema',
        allOf: [
          {
            type: 'object',
            properties: {
              error: {
                type: 'string',
                enum: [
                  'invalid'
                ]
              }
            },
            required: [
              'error'
            ]
          },
          {
            $ref: '#/components/schemas/ApiError'
          }
        ],
      },
    }
  }
});

const ROUTE_WITH_SCHEMA_WITH_DEFAULT_METADATA = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { DateFromNumber } from 'io-ts-types';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      ipRestrict: t.boolean
    },
  }),
  response: {
    200: {
      test: DateFromNumber
    }
  },
});
`;

testCase('route with schema with default metadata', ROUTE_WITH_SCHEMA_WITH_DEFAULT_METADATA, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'ipRestrict',
            required: true,
            schema: {
              type: 'boolean',
            }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'number',
                      format: 'number',
                      title: 'Unix Time (milliseconds)',
                      description: 'Number of milliseconds since the Unix epoch',
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});

const ROUTE_WITH_OVERIDDEN_METADATA = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { DateFromNumber } from 'io-ts-types';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      ipRestrict: t.boolean
    },
  }),
  response: {
    200: {
      /** 
       * Testing overridden metadata 
       * @format string
       */
      test: DateFromNumber
    }
  },
});
`;

testCase('route with schema with default metadata', ROUTE_WITH_OVERIDDEN_METADATA, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'ipRestrict',
            required: true,
            schema: {
              type: 'boolean',
            }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    test: {
                      type: 'number',
                      format: 'string',
                      title: 'Unix Time (milliseconds)',
                      description: 'Testing overridden metadata',
                    }
                  },
                  required: [
                    'test'
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});


const SCHEMA_WITH_MANY_RESPONSE_TYPES = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const ApiError = t.type({
  /** error message */
  error: t.string,
});

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    /** string response type */
    200: t.string,
    400: ApiError
  },
})
`;

testCase('route with many response codes uses default status code descriptions', SCHEMA_WITH_MANY_RESPONSE_TYPES, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        parameters: [],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  description: 'string response type',
                  type: 'string'
                }
              }
            }
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  '$ref': '#/components/schemas/ApiError'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      ApiError: {
        properties: {
          error: {
            type: 'string',
            description: 'error message',
          }
        },
        required: [
          'error'
        ],
        type: 'object',
        title: 'ApiError'
      },
    }
  }
});

const SCHEMA_WITH_REDUNDANT_UNIONS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      foo: t.union([t.string, t.string]),
      bar: t.union([t.number, t.number, t.number]),
      bucket: t.union([t.string, t.number, t.boolean, t.string, t.number, t.boolean]),
    },
    body: {
      typeUnion: t.union([
        t.type({ foo: t.string, bar: t.number }),
        t.type({ bar: t.number, foo: t.string}),
        ]),
      nestedTypeUnion: t.union([
        t.type({ nested: t.type({ foo: t.string, bar: t.number }) }),
        t.type({ nested: t.type({ foo: t.string, bar: t.number }) })
      ])
    }
  }),
  response: {
    200: t.union([t.string, t.string, t.union([t.number, t.number])]),
    400: t.union([t.boolean, t.boolean, t.boolean])
  },
})
`;

testCase('route with reduntant response schemas', SCHEMA_WITH_REDUNDANT_UNIONS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'foo',
            required: true,
            schema: {
              type: 'string'
            }
          },
          {
            in: 'query',
            name: 'bar',
            required: true,
            schema: {
              type: 'number'
            }
          },
          {
            in: 'query',
            name: 'bucket',
            required: true,
            schema: {
              oneOf: [
                { type: 'string' },
                { type: 'number' },
                { type: 'boolean' }
              ]
            }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  nestedTypeUnion: {
                    properties: {
                      nested: {
                        properties: {
                          bar: {
                            type: 'number'
                          },
                          foo: {
                            type: 'string'
                          }
                        },
                        required: [
                          'bar',
                          'foo'
                        ],
                        type: 'object'
                      }
                    },
                    required: [
                      'nested'
                    ],
                    type: 'object'
                  },
                  typeUnion: {
                    properties: {
                      bar: {
                        type: 'number'
                      },
                      foo: {
                        type: 'string'
                      }
                    },
                    required: [
                      'bar',
                      'foo'
                    ],
                    type: 'object'
                  }
                },
                required: [
                  'typeUnion',
                  'nestedTypeUnion'
                ],
                type: 'object'
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  oneOf: [{
                    type: 'string'
                  }, {
                    type: 'number'
                  }]
                }
              }
            }
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'boolean'
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});

const SCHEMA_WITH_TITLES_IN_REQUEST_BODIES = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * @title Some Readable BodyFoo Title
 */
const BodyFoo = t.type({ 
  /** a foo description */
  foo: t.string,
});

/**
 * @title Some Readable ParamsFoo Title
 */
const ParamsFoo = { someId: t.string };

export const route = h.httpRoute({
  path: '/foo',
  method: 'POST',
  request: h.httpRequest({ 
    params: {}, 
    body: h.httpRequest({ params: ParamsFoo, body: BodyFoo, })
  }),
  response: {
    200: t.literal('OK'),
  },
});
`;

testCase("route with titles in request bodies", SCHEMA_WITH_TITLES_IN_REQUEST_BODIES, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      post: {
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  params: {
                    type: 'object',
                    title: "Some Readable ParamsFoo Title",
                    properties: {
                      someId: { type: 'string' }
                    },
                    required: ['someId']
                  },
                  body: {
                    type: 'object',
                    title: 'Some Readable BodyFoo Title',
                    properties: {
                      foo: {
                        type: 'string',
                        description: 'a foo description'
                      }
                    },
                    required: ['foo']
                  }
                },
                required: ['params', 'body']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                  enum: ['OK']
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      ParamsFoo: {
        title: 'Some Readable ParamsFoo Title',
        type: 'object',
        properties: { someId: { type: 'string' } },
        required: ['someId']
      },
      BodyFoo: {
        title: 'Some Readable BodyFoo Title',
        type: 'object',
        properties: {
          foo: {
            type: 'string',
            description: 'a foo description'
          }
        },
        required: ['foo']
      }
    }
  }
});


const ROUTE_WITH_ARRAY_EXAMPLE = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/** 
 * @example btc
 */
const innerItems = t.string;

export const route = h.httpRoute({
  path: '/foo',
  method: 'POST',
  request: h.httpRequest({ 
    params: {}, 
    body: t.type({ 
      /**
       * @example "btc"
       */
      array1: t.array(t.string),
      /**
       * @example ["btc", "eth"]
       */
      array2: t.array(innerItems),
      /**
       * @minItems 1
       * @maxItems 5
       */
      array3: t.array(t.number),
      objectWithArray: t.type({
        /**
         * @example ["btc", "eth"]
         */
        nestedArray: t.array(innerItems)
      })
    })
  }),
  response: {
    200: t.literal('OK'),
  },
});`;

testCase("route with array examples", ROUTE_WITH_ARRAY_EXAMPLE, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      post: {
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  array1: {
                    type: 'array',
                    items: {
                      type: 'string',
                      example: '"btc"'
                    },
                  },
                  array2: {
                    type: 'array',
                    example: ['btc', 'eth'],
                    items: {
                      type: 'string',
                      example: 'btc'
                    },
                  },
                  array3: {
                    items: {
                      type: 'number'
                    },
                    maxItems: 5,
                    minItems: 1,
                    type: 'array'
                  },
                  objectWithArray: {
                    properties: {
                      nestedArray: {
                        example: [
                          'btc',
                          'eth'
                        ],
                        items: {
                          example: 'btc',
                          type: 'string'
                        },
                        type: 'array'
                      }
                    },
                    required: [
                      'nestedArray'
                    ],
                    type: 'object'
                  },
                },
                required: ['array1', 'array2', 'array3', 'objectWithArray'],
              },
            }
          }
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                  enum: ['OK']
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      innerItems: {
        title: "innerItems",
        type: "string",
        example: 'btc'
      }
    }
  }
});

const ROUTE_WITH_CONSOLIDATABLE_UNION_SCHEMAS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { BooleanFromString, BooleanFromNumber, NumberFromString } from 'io-ts-types';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      // are not consolidatable
      firstUnion: t.union([t.string, t.number]),
      secondUnion: t.union([BooleanFromString, NumberFromString]),
      thirdUnion: t.union([t.string, BooleanFromString]),
      firstNonUnion: BooleanFromString,
      secondNonUnion: NumberFromString,
      thirdNonUnion: t.string,
    },
  }),
  response: {
    200: {
      // are consolidatable
      fourthUnion: t.union([t.boolean, BooleanFromNumber]),
      fifthUnion: h.optional(t.union([t.boolean, t.boolean, BooleanFromNumber, BooleanFromString])),
      sixthUnion: t.union([t.number, NumberFromString]),
    }
  },
});
`;

testCase("route with consolidatable union schemas", ROUTE_WITH_CONSOLIDATABLE_UNION_SCHEMAS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        parameters: [
          {
            name: 'firstUnion',
            in: 'query',
            required: true,
            schema: {
              oneOf: [
                { type: 'string' },
                { type: 'number' }
              ]
            }
          },
          {
            name: 'secondUnion',
            in: 'query',
            required: true,
            schema: {
              oneOf: [
                { type: 'string', format: 'number' },
                { type: 'string', enum: ['true', 'false'] }
              ]
            }
          },
          {
            name: 'thirdUnion',
            in: 'query',
            required: true,
            schema: {
              oneOf: [
                { type: 'string' },
                { type: 'string', enum: ['true', 'false'] }
              ]
            }
          },
          {
            name: 'firstNonUnion',
            in: 'query',
            required: true,
            schema: { type: 'string', enum: ['true', 'false'] }
          },
          {
            name: 'secondNonUnion',
            in: 'query',
            required: true,
            schema: { type: 'string', format: 'number' }
          },
          {
            name: 'thirdNonUnion',
            in: 'query',
            required: true,
            schema: { type: 'string' }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    fourthUnion: { type: 'boolean' },
                    fifthUnion: { type: 'boolean' },
                    sixthUnion: { type: 'number' }
                  },
                  required: ['fourthUnion', 'sixthUnion']
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {}
  }
});

const ROUTE_WITH_NESTED_ARRAY_EXAMPLES = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/** 
 * @example ["a", "b"]
 */
const firstLevel = t.array(t.string);

/** 
 * @example [["a", "b"], ["c", "d"]]
 */
const secondLevel = t.array(firstLevel);

/** 
 * @example [[["a"], ["b"]], [["c"], ["d"]]] 
 */
const thirdLevel = t.array(secondLevel);

export const route = h.httpRoute({
  path: '/foo',
  method: 'POST',
  request: h.httpRequest({ 
    params: {}, 
    body: t.type({ 
      nested: thirdLevel
    })
  }),
  response: {
    200: t.literal('OK'),
  },
});
`;

testCase("route with nested array examples", ROUTE_WITH_NESTED_ARRAY_EXAMPLES, {
  openapi: "3.0.3",
  info: {
    title: "Test",
    version: "1.0.0"
  },
  paths: {
    "/foo": {
      post: {
        parameters: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  nested: {
                    "$ref": "#/components/schemas/thirdLevel"
                  }
                },
                required: [
                  "nested"
                ]
              }
            }
          }
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "string",
                  enum: [
                    "OK"
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      firstLevel: {
        title: "firstLevel",
        type: "array",
        example: [ "a", "b" ],
        items: {
          type: "string"
        }
      },
      secondLevel: {
        title: "secondLevel",
        type: "array",
        example: [ [ "a", "b" ], [ "c", "d" ] ],
        items: {
          type: "array",
          example: [ "a", "b" ],
          items: {
            type: "string"
          }
        }
      },
      thirdLevel: {
        title: "thirdLevel",
        type: "array",
        example: [[["a"],["b"]],[["c"],["d"]]],
        items: {
          type: "array",
          example: [["a","b"],["c","d"]],
          items: {
            type: "array",
            example: ["a","b"],
            items: {
              type: "string"
            }
          }
        }
      }
    }
  }
});

const ROUTE_WITH_OVERRIDING_COMMENTS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/** 
 * @example "abc"
 */
const TargetSchema = t.string;

const ParentSchema = t.type({
  /** This description should show with the example */
  target: h.optional(TargetSchema)
})

export const route = h.httpRoute({
  path: '/foo',
  method: 'POST',
  request: h.httpRequest({ 
    params: {}, 
    body: ParentSchema
  }),
  response: {
    200: t.literal('OK'),
  },
});
`;

testCase("route with overriding comments", ROUTE_WITH_OVERRIDING_COMMENTS, {
  openapi: "3.0.3",
  info: {
    title: "Test",
    version: "1.0.0"
  },
  paths: {
    "/foo": {
      post: {
        parameters: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  target: {
                    type: "string",
                    description: "This description should show with the example",
                    example: "abc"
                  }
                }
              }
            }
          }
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "string",
                  enum: [
                    "OK"
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      TargetSchema: {
        title: "TargetSchema",
        type: "string",
        example: "abc"
      },
      ParentSchema: {
        title: "ParentSchema",
        type: "object",
        properties: {
          target: {
            type: "string",
            description: "This description should show with the example",
            example: "abc"
          }
        }
      }
    }
  }
});

const ROUTE_WITH_NESTED_OVERRIDEN_COMMENTS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/** 
 * @example "abc"
 */
const TargetSchema = t.string;

const ParentSchema = t.type({
  /** This description should show with the example */
  target: h.optional(TargetSchema)
})

const GrandParentSchema = t.type({
  /** This description should override the previous description */
  parent: ParentSchema
})

export const route = h.httpRoute({
  path: '/foo',
  method: 'POST',
  request: h.httpRequest({ 
    params: {}, 
    body: GrandParentSchema
  }),
  response: {
    200: t.literal('OK'),
  },
});
`;


testCase("route with nested overriding comments", ROUTE_WITH_NESTED_OVERRIDEN_COMMENTS, {
  openapi: "3.0.3",
  info: {
    title: "Test",
    version: "1.0.0"
  },
  paths: {
    "/foo": {
      post: {
        parameters: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  parent: {
                    allOf: [
                      {
                        '$ref': '#/components/schemas/ParentSchema'
                      }
                    ],
                    description: 'This description should override the previous description',
                  },
                },
                required: ['parent']
              }
            }
          }
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "string",
                  enum: [
                    "OK"
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      TargetSchema: {
        title: "TargetSchema",
        type: "string",
        example: "abc"
      },
      ParentSchema: {
        title: "ParentSchema",
        type: "object",
        properties: {
          target: {
            type: "string",
            description: "This description should show with the example",
            example: "abc"
          }
        }
      },
      GrandParentSchema: {
        title: "GrandParentSchema",
        type: "object",
        properties: {
          parent: {
            allOf: [
              {
                '$ref': '#/components/schemas/ParentSchema'
              }
            ],
            description: 'This description should override the previous description'
          }
        },
        required: ['parent']
      }
    }
  }
});

const ROUTE_WITH_OVERRIDEN_COMMENTS_IN_UNION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/** 
 * @example "abc"
 */
const TargetSchema = t.string;

/**
 * @example "def"
 */
const TargetSchema2 = t.string;

const ParentSchema = t.type({
  /** This description should show with the example */
  target: h.optional(t.union([TargetSchema, TargetSchema2]))
})

const SecondaryParentSchema = t.type({
  /** 
   * This description should show with the overriden example
   * @example "overridden example"
   */
  target: h.optional(t.union([TargetSchema, TargetSchema2]))
})

/**
 * This is grandparent schema description
 * @title Grand Parent Schema
 */
const GrandParentSchema = t.type({
  parent: ParentSchema,
  secondaryParent: SecondaryParentSchema
});

export const route = h.httpRoute({
  path: '/foo',
  method: 'POST',
  request: h.httpRequest({ 
    params: {}, 
    body: GrandParentSchema
  }),
  response: {
    200: t.literal('OK'),
  },
});
`;

testCase("route with overriden comments in union", ROUTE_WITH_OVERRIDEN_COMMENTS_IN_UNION, {
  openapi: "3.0.3",
  info: {
    title: "Test",
    version: "1.0.0"
  },
  paths: {
    "/foo": {
      post: {
        parameters: [],
        requestBody: {
          content: {
            "application/json": {
              schema: {
                title: "Grand Parent Schema",
                description: 'This is grandparent schema description',
                type: "object",
                properties: {
                  parent: {
                    "$ref": "#/components/schemas/ParentSchema"
                  },
                  secondaryParent: {
                    "$ref": "#/components/schemas/SecondaryParentSchema"
                  }
                },
                required: [
                  "parent",
                  "secondaryParent"
                ]
              }
            }
          }
        },
        responses: {
          200: {
            description: "OK",
            content: {
              "application/json": {
                schema: {
                  type: "string",
                  enum: [
                    "OK"
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      TargetSchema: {
        title: "TargetSchema",
        type: "string",
        example: "abc"
      },
      TargetSchema2: {
        title: "TargetSchema2",
        type: "string",
        example: "def"
      },
      ParentSchema: {
        title: "ParentSchema",
        type: "object",
        properties: {
          target: {
            oneOf: [
              {
                "$ref": "#/components/schemas/TargetSchema"
              },
              {
                "$ref": "#/components/schemas/TargetSchema2"
              }
            ],
            description: "This description should show with the example"
          }
        }
      },
      SecondaryParentSchema: {
        title: "SecondaryParentSchema",
        type: "object",
        properties: {
          target: {
            oneOf: [
              {
                "$ref": "#/components/schemas/TargetSchema"
              },
              {
                "$ref": "#/components/schemas/TargetSchema2"
              }
            ],
            description: "This description should show with the overriden example",
            example: "\"overridden example\""
          }
        }
      },
      GrandParentSchema: {
        title: "Grand Parent Schema",
        description: 'This is grandparent schema description',
        type: "object",
        properties: {
          parent: {
            "$ref": "#/components/schemas/ParentSchema"
          },
          secondaryParent: {
            "$ref": "#/components/schemas/SecondaryParentSchema"
          }
        },
        required: [
          "parent",
          "secondaryParent"
        ]
      }
    }
  }
});

const ROUTE_WITH_PRIVATE_PROPERTIES = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const SampleType = t.type({
  foo: t.string,
  /** @private */
  bar: t.string, // This should show up with x-internal,
  /** @private */
  privateObject: t.type({
    privateFieldInObject: t.boolean
  })
});

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({ 
    params: {
      /** @private */
      path: t.string
    },
    query: {
      /** @private */
      query: t.string  
    },
    body: SampleType
  }),
  response: {
    200: SampleType
  },
});
`;

testCase("route with private properties in request query, params, body, and response", ROUTE_WITH_PRIVATE_PROPERTIES, {
  openapi: "3.0.3",
  info: {
    title: "Test",
    version: "1.0.0"
  },
  paths: {
    '/foo': {
      get: {
        parameters: [
          {
            'x-internal': true,
            description: '',
            in: 'query',
            name: 'query',
            required: true,
            schema: {
              type: 'string'
            }
          },
          {
            'x-internal': true,
            description: '',
            in: 'path',
            name: 'path',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  bar: {
                    'x-internal': true,
                    type: 'string'
                  },
                  foo: {
                    type: 'string'
                  },
                  privateObject: {
                    'x-internal': true,
                    properties: {
                      privateFieldInObject: {
                        type: 'boolean'
                      }
                    },
                    required: [
                      'privateFieldInObject'
                    ],
                    type: 'object'
                  }
                },
                required: [
                  'foo',
                  'bar',
                  'privateObject'
                ],
                type: 'object'
              }
            }
          },
        },
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  '$ref': '#/components/schemas/SampleType'
                }
              }
            },
            description: 'OK'
          }
        }
      }
    },
  },
  components: {
    schemas: {
      SampleType: {
        properties: {
          bar: {
            'x-internal': true,
            type: 'string'
          },
          foo: {
            type: 'string'
          },
          privateObject: {
            'x-internal': true,
            properties: {
              privateFieldInObject: {
                type: 'boolean'
              }
            },
            required: [
              'privateFieldInObject'
            ],
            type: 'object'
          }
        },
        required: [
          'foo',
          'bar',
          'privateObject'
        ],
        title: 'SampleType',
        type: 'object'
      }
    }
  },
});

const ROUTE_WITH_RECORD_TYPES = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
const ValidKeys = t.keyof({ name: "name", age: "age", address: "address" });
const PersonObject = t.type({ bigName: t.string, bigAge: t.number });
export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      name: t.string,
    },
  }),
  response: {
    200: {
      person: t.record(ValidKeys, t.string),
      anotherPerson: t.record(ValidKeys, PersonObject),
      bigPerson: t.record(t.string, t.string),
      anotherBigPerson: t.record(t.string, PersonObject),
    }
  },
});
`;

testCase("route with record types", ROUTE_WITH_RECORD_TYPES, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  paths: {
    '/foo': {
      get: {
        parameters: [
          {
            name: 'name',
            in: 'query',
            required: true,
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    // becomes t.type()
                    person: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        age: { type: 'string' },
                        address: { type: 'string' }
                      },
                      required: [ 'name', 'age', 'address' ]
                    },
                    // becomes t.type()
                    anotherPerson: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'object',
                          properties: {
                            bigName: { type: 'string' },
                            bigAge: { type: 'number' }
                          },
                          required: [ 'bigName', 'bigAge' ]
                        },
                        age: {
                          type: 'object',
                          properties: {
                            bigName: { type: 'string' },
                            bigAge: { type: 'number' }
                          },
                          required: [ 'bigName', 'bigAge' ]
                        },
                        address: {
                          type: 'object',
                          properties: {
                            bigName: { type: 'string' },
                            bigAge: { type: 'number' }
                          },
                          required: [ 'bigName', 'bigAge' ]
                        }
                      },
                      required: [ 'name', 'age', 'address' ]
                    },
                    bigPerson: {
                      // stays as t.record()
                      type: 'object',
                      additionalProperties: { type: 'string' }
                    },
                    anotherBigPerson: {
                      // stays as t.record()
                      type: 'object',
                      additionalProperties: {
                        type: 'object',
                        properties: {
                          bigName: { type: 'string' },
                          bigAge: { type: 'number' }
                        },
                        required: [ 'bigName', 'bigAge' ]
                      }
                    }
                  },
                  required: [ 'person', 'anotherPerson', 'bigPerson', 'anotherBigPerson' ]
                }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      ValidKeys: {
        title: 'ValidKeys',
        type: 'string',
        enum: [ 'name', 'age', 'address' ]
      },
      PersonObject: {
        title: 'PersonObject',
        type: 'object',
        properties: { bigName: { type: 'string' }, bigAge: { type: 'number' } },
        required: [ 'bigName', 'bigAge' ]
      }
    }
  }
});

const ROUTE_WITH_UNKNOWN_UNIONS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const UnknownUnion = t.union([t.string, t.number, t.boolean, t.unknown]);
const SingleUnknownUnion = t.union([t.unknown, t.string]);

const NestedUnknownUnion = t.union([t.union([t.string, t.unknown]), t.union([t.boolean, t.unknown])]);

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: {
      single: SingleUnknownUnion,
      unknown: UnknownUnion,
      nested: NestedUnknownUnion,
    }
  },
});
`

testCase("route with unknown unions", ROUTE_WITH_UNKNOWN_UNIONS, {
  info: {
    title: 'Test',
    version: '1.0.0'
  },
  openapi: '3.0.3',
  paths: {
    '/foo': {
      get: {
        parameters: [],
        responses: {
          '200': {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    nested: {
                      '$ref': '#/components/schemas/NestedUnknownUnion'
                    },
                    single: {
                      '$ref': '#/components/schemas/SingleUnknownUnion'
                    },
                    unknown: {
                      '$ref': '#/components/schemas/UnknownUnion'
                    }
                  },
                  required: [
                    'single',
                    'unknown',
                    'nested'
                  ],
                  type: 'object'
                }
              }
            },
            description: 'OK'
          }
        }
      }
    }
  },
  components: {
    schemas: {
      NestedUnknownUnion: {
        oneOf: [
          {
            type: 'string'
          },
          {
            type: 'boolean'
          }
        ],
        title: 'NestedUnknownUnion'
      },
      SingleUnknownUnion: {
        title: 'SingleUnknownUnion',
        type: 'string'
      },
      UnknownUnion: {
        oneOf: [
          {
            type: 'string'
          },
          {
            type: 'number'
          },
          {
            type: 'boolean'
          }
        ],
        title: 'UnknownUnion'
      }
    }
  },
 
})