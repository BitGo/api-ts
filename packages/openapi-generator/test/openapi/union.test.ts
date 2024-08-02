import { testCase } from "./testHarness";

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
`;

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
});