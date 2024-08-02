import { testCase } from "./testHarness";

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