import { testCase } from "./testHarness";


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

const MULTIPLE_ROUTES = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

// Purposefully out of order to test sorting
export const route1 = h.httpRoute({
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

export const route2 = h.httpRoute({
  path: '/bar',
  method: 'GET',
  request: h.httpRequest({
    query: {
      bar: t.string,
    },
  }),
  response: {
    200: t.string
  },
});

export const route3 = h.httpRoute({
  path: '/baz',
  method: 'GET',
  request: h.httpRequest({
    query: {
      baz: t.string,
    },
  }),
  response: {
    200: t.string
  },
});
`;

testCase('multiple routes', MULTIPLE_ROUTES, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/bar': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'bar',
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
    '/baz': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'baz',
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
    '/foo': {
      get: {
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

const MULTIPLE_ROUTES_WITH_METHODS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

// Purposefully out of order to test sorting
export const route1 = h.httpRoute({
  path: '/foo',
  method: 'POST',
  request: h.httpRequest({
    query: {
      foo: t.string,
    },
  }),
  response: {
    200: t.string
  },
});

export const route2 = h.httpRoute({
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

export const route3 = h.httpRoute({
  path: '/foo',
  method: 'DELETE',
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

testCase('multiple routes with methods', MULTIPLE_ROUTES_WITH_METHODS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/foo': {
      delete: {
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
      get: {
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
      post: {
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
