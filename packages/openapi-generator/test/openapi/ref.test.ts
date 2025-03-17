import { testCase } from './testHarness';

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
            name: 'body',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
            },
          },
          {
            name: 'size',
            description: 'Size of the body',
            in: 'path',
            required: true,
            schema: {
              type: 'number',
              example: 10,
            },
          },
        ],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Foo',
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
        type: 'string',
        description: "a Foo of type 'string'",
        example: 'foo',
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
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      get: {
        summary: 'A simple route with type descriptions for references',
        operationId: 'api.v1.test',
        tags: ['Test Routes'],
        parameters: [],
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/SimpleRouteResponse',
                },
              },
            },
          },
          '400': {
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ApiError',
                },
              },
            },
            description: 'Bad Request',
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/InvalidError',
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
      ApiError: {
        properties: {
          error: {
            type: 'string',
          },
        },
        required: ['error'],
        title: 'Human Readable Api Error Schema',
        description: 'Human readable description of the ApiError schema',
        type: 'object',
      },
      SimpleRouteResponse: {
        description: 'Human readable description of the Simple Route Response',
        properties: {
          test: {
            type: 'string',
          },
        },
        required: ['test'],
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
                enum: ['invalid'],
              },
            },
            required: ['error'],
          },
          {
            $ref: '#/components/schemas/ApiError',
          },
        ],
      },
    },
  },
});
