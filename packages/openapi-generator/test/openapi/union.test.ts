import { testCase } from './testHarness';

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
    version: '1.0.0',
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
              type: 'string',
            },
          },
          {
            in: 'query',
            name: 'bar',
            required: true,
            schema: {
              type: 'number',
            },
          },
          {
            in: 'query',
            name: 'bucket',
            required: true,
            schema: {
              oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'boolean' }],
            },
          },
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
                            type: 'number',
                          },
                          foo: {
                            type: 'string',
                          },
                        },
                        required: ['bar', 'foo'],
                        type: 'object',
                      },
                    },
                    required: ['nested'],
                    type: 'object',
                  },
                  typeUnion: {
                    properties: {
                      bar: {
                        type: 'number',
                      },
                      foo: {
                        type: 'string',
                      },
                    },
                    required: ['bar', 'foo'],
                    type: 'object',
                  },
                },
                required: ['typeUnion', 'nestedTypeUnion'],
                type: 'object',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  oneOf: [
                    {
                      type: 'string',
                    },
                    {
                      type: 'number',
                    },
                  ],
                },
              },
            },
          },
          '400': {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'boolean',
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

testCase(
  'route with consolidatable union schemas',
  ROUTE_WITH_CONSOLIDATABLE_UNION_SCHEMAS,
  {
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
              name: 'firstUnion',
              in: 'query',
              required: true,
              schema: {
                oneOf: [{ type: 'string' }, { type: 'number' }],
              },
            },
            {
              name: 'secondUnion',
              in: 'query',
              required: true,
              schema: {
                oneOf: [{ type: 'boolean' }, { type: 'string', format: 'number' }],
              },
            },
            {
              name: 'thirdUnion',
              in: 'query',
              required: true,
              schema: {
                oneOf: [{ type: 'string' }, { type: 'boolean' }],
              },
            },
            {
              name: 'firstNonUnion',
              in: 'query',
              required: true,
              schema: { type: 'boolean' },
            },
            {
              name: 'secondNonUnion',
              in: 'query',
              required: true,
              schema: { type: 'string', format: 'number' },
            },
            {
              name: 'thirdNonUnion',
              in: 'query',
              required: true,
              schema: { type: 'string' },
            },
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
                      sixthUnion: { type: 'number' },
                    },
                    required: ['fourthUnion', 'sixthUnion'],
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

testCase('route with unknown unions', ROUTE_WITH_UNKNOWN_UNIONS, {
  info: {
    title: 'Test',
    version: '1.0.0',
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
                      $ref: '#/components/schemas/NestedUnknownUnion',
                    },
                    single: {
                      $ref: '#/components/schemas/SingleUnknownUnion',
                    },
                    unknown: {
                      $ref: '#/components/schemas/UnknownUnion',
                    },
                  },
                  required: ['single', 'unknown', 'nested'],
                  type: 'object',
                },
              },
            },
            description: 'OK',
          },
        },
      },
    },
  },
  components: {
    schemas: {
      NestedUnknownUnion: {
        oneOf: [
          {
            type: 'string',
          },
          {
            type: 'boolean',
          },
        ],
        title: 'NestedUnknownUnion',
      },
      SingleUnknownUnion: {
        title: 'SingleUnknownUnion',
        type: 'string',
      },
      UnknownUnion: {
        oneOf: [
          {
            type: 'string',
          },
          {
            type: 'number',
          },
          {
            type: 'boolean',
          },
        ],
        title: 'UnknownUnion',
      },
    },
  },
});

const ROUTE_WITH_PATH_PARAMS_IN_UNION_NOT_FIRST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/internal/api/policy/v1/{applicationName}/touchpoints/{touchpoint}/rules/evaluation',
  method: 'POST',
  request: t.union([
    // First schema has NO path parameters - this was causing the bug
    h.httpRequest({
      body: { emptyRequest: t.boolean }
    }),
    // Second schema HAS path parameters - these should be preserved
    h.httpRequest({
      params: {
        applicationName: t.string,
        touchpoint: t.string,
      },
      body: { requestWithParams: t.string }
    }),
  ]),
  response: {
    200: t.string,
  },
});
`;

testCase(
  'route with path params in union second schema (regression test)',
  ROUTE_WITH_PATH_PARAMS_IN_UNION_NOT_FIRST,
  {
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    openapi: '3.0.3',
    paths: {
      '/internal/api/policy/v1/{applicationName}/touchpoints/{touchpoint}/rules/evaluation':
        {
          post: {
            parameters: [
              {
                in: 'path',
                name: 'applicationName',
                required: true,
                schema: { type: 'string' },
              },
              {
                in: 'path',
                name: 'touchpoint',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      {
                        properties: {
                          emptyRequest: { type: 'boolean' },
                        },
                        required: ['emptyRequest'],
                        type: 'object',
                      },
                      {
                        properties: {
                          requestWithParams: { type: 'string' },
                        },
                        required: ['requestWithParams'],
                        type: 'object',
                      },
                    ],
                  },
                },
              },
            },
            responses: {
              '200': {
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
  },
);

const ROUTE_WITH_PATH_PARAMS_ONLY_IN_THIRD_SCHEMA = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/api/{userId}/posts/{postId}',
  method: 'GET',
  request: t.union([
    // First: empty request
    h.httpRequest({}),
    // Second: only query params
    h.httpRequest({
      query: { filter: t.string }
    }),
    // Third: has the path params
    h.httpRequest({
      params: {
        userId: t.string,
        postId: t.string,
      },
      query: { details: t.boolean }
    }),
  ]),
  response: {
    200: t.string,
  },
});
`;

testCase(
  'route with path params only in third schema',
  ROUTE_WITH_PATH_PARAMS_ONLY_IN_THIRD_SCHEMA,
  {
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    openapi: '3.0.3',
    paths: {
      '/api/{userId}/posts/{postId}': {
        get: {
          parameters: [
            {
              in: 'query',
              name: 'union',
              required: true,
              explode: true,
              style: 'form',
              schema: {
                oneOf: [
                  {
                    properties: { filter: { type: 'string' } },
                    required: ['filter'],
                    type: 'object',
                  },
                  {
                    properties: { details: { type: 'boolean' } },
                    required: ['details'],
                    type: 'object',
                  },
                ],
              },
            },
            { in: 'path', name: 'userId', required: true, schema: { type: 'string' } },
            { in: 'path', name: 'postId', required: true, schema: { type: 'string' } },
          ],
          responses: {
            '200': {
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
  },
);

const REAL_WORLD_POLICY_EVALUATION_ROUTE = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const AddressBookConnectionSides = t.union([t.literal('send'), t.literal('receive')]);

/**
 * Create policy evaluation definition
 * @operationId v1.post.policy.evaluation.definition
 * @tag Policy Builder
 * @private
 */
export const route = h.httpRoute({
  path: '/internal/api/policy/v1/{applicationName}/touchpoints/{touchpoint}/rules/evaluations',
  method: 'POST',
  request: t.union([
    h.httpRequest({
      params: {
        applicationName: t.string,
        touchpoint: t.string,
      },
      body: t.type({
        approvalRequestId: t.string,
        counterPartyId: t.string,
        description: h.optional(t.string),
        enterpriseId: t.string,
        grossAmount: h.optional(t.number),
        idempotencyKey: t.string,
        isFirstTimeCounterParty: t.boolean,
        isMutualConnection: t.boolean,
        netAmount: h.optional(t.number),
        settlementId: t.string,
        userId: t.string,
        walletId: t.string,
      })
    }),
    h.httpRequest({
      params: {
        applicationName: t.string,
        touchpoint: t.string,
      },
      body: t.type({
        connectionId: t.string,
        description: h.optional(t.string),
        enterpriseId: t.string,
        idempotencyKey: t.string,
        side: AddressBookConnectionSides,
        walletId: t.string,
      })
    }),
  ]),
  response: {
    200: t.string,
  },
});
`;

testCase(
  'real-world policy evaluation route with union request bodies',
  REAL_WORLD_POLICY_EVALUATION_ROUTE,
  {
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    openapi: '3.0.3',
    paths: {
      '/internal/api/policy/v1/{applicationName}/touchpoints/{touchpoint}/rules/evaluations':
        {
          post: {
            summary: 'Create policy evaluation definition',
            operationId: 'v1.post.policy.evaluation.definition',
            tags: ['Policy Builder'],
            'x-internal': true,
            parameters: [
              {
                in: 'path',
                name: 'applicationName',
                required: true,
                schema: { type: 'string' },
              },
              {
                in: 'path',
                name: 'touchpoint',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: {
              content: {
                'application/json': {
                  schema: {
                    oneOf: [
                      {
                        type: 'object',
                        properties: {
                          approvalRequestId: { type: 'string' },
                          counterPartyId: { type: 'string' },
                          description: { type: 'string' },
                          enterpriseId: { type: 'string' },
                          grossAmount: { type: 'number' },
                          idempotencyKey: { type: 'string' },
                          isFirstTimeCounterParty: { type: 'boolean' },
                          isMutualConnection: { type: 'boolean' },
                          netAmount: { type: 'number' },
                          settlementId: { type: 'string' },
                          userId: { type: 'string' },
                          walletId: { type: 'string' },
                        },
                        required: [
                          'approvalRequestId',
                          'counterPartyId',
                          'enterpriseId',
                          'idempotencyKey',
                          'isFirstTimeCounterParty',
                          'isMutualConnection',
                          'settlementId',
                          'userId',
                          'walletId',
                        ],
                      },
                      {
                        type: 'object',
                        properties: {
                          connectionId: { type: 'string' },
                          description: { type: 'string' },
                          enterpriseId: { type: 'string' },
                          idempotencyKey: { type: 'string' },
                          side: {
                            $ref: '#/components/schemas/AddressBookConnectionSides',
                          },
                          walletId: { type: 'string' },
                        },
                        required: [
                          'connectionId',
                          'enterpriseId',
                          'idempotencyKey',
                          'side',
                          'walletId',
                        ],
                      },
                    ],
                  },
                },
              },
            },
            responses: {
              '200': {
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
      schemas: {
        AddressBookConnectionSides: {
          enum: ['send', 'receive'],
          title: 'AddressBookConnectionSides',
          type: 'string',
        },
      },
    },
  },
);

const ROUTE_WITH_DUPLICATE_HEADERS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: t.union([
    h.httpRequest({
      headers: {
        'x-foo': t.string,
        'x-common': t.string,
      },
    }),
    h.httpRequest({
      headers: {
        'x-bar': t.number,
        'x-common': t.string,
      },
    }),
  ]),
  response: {
    200: t.string,
  },
});
`;

testCase(
  'route with duplicate headers in request union',
  ROUTE_WITH_DUPLICATE_HEADERS,
  {
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    openapi: '3.0.3',
    paths: {
      '/foo': {
        get: {
          parameters: [
            { in: 'header', name: 'x-foo', required: true, schema: { type: 'string' } },
            {
              in: 'header',
              name: 'x-common',
              required: true,
              schema: { type: 'string' },
            },
            { in: 'header', name: 'x-bar', required: true, schema: { type: 'number' } },
          ],
          responses: {
            '200': {
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
  },
);

const ROUTE_WITH_REQUEST_UNION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { BooleanFromString, BooleanFromNumber, NumberFromString } from 'io-ts-types';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: t.union([
    h.httpRequest({
      headers: {
        foo: t.string,
      },
    }),
    h.httpRequest({}),
  ]),
  response: {
    200: t.string,
  },
});
`;

testCase('route with request union', ROUTE_WITH_REQUEST_UNION, {
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  openapi: '3.0.3',
  paths: {
    '/foo': {
      get: {
        parameters: [
          { in: 'header', name: 'foo', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
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
