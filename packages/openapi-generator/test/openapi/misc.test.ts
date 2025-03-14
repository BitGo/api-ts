import { testCase } from "./testHarness";

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
            },
            style: 'form',
            explode: true
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
