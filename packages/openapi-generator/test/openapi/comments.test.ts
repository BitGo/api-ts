import { testCase } from './testHarness';

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
              type: 'string',
            },
          },
        ],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  bar: {
                    description: 'bar description',
                    type: 'number',
                  },
                  child: {
                    properties: {
                      child: {
                        description: 'child description',
                        type: 'string',
                      },
                    },
                    required: ['child'],
                    type: 'object',
                  },
                  foo: {
                    description: 'foo description',
                    type: 'string',
                  },
                },
                required: ['foo', 'bar', 'child'],
                type: 'object',
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

testCase(
  'route with type descriptions with optional fields',
  ROUTE_WITH_TYPE_DESCRIPTIONS_OPTIONAL,
  {
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
                type: 'string',
              },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  properties: {
                    bar: {
                      description: 'bar description',
                      type: 'number',
                    },
                    child: {
                      properties: {
                        child: {
                          description: 'child description',
                          type: 'string',
                        },
                      },
                      type: 'object',
                    },
                    foo: {
                      description: 'foo description',
                      type: 'string',
                    },
                  },
                  required: ['child'],
                  type: 'object',
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
  },
);

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

testCase(
  'route with mixed types and descriptions',
  ROUTE_WITH_MIXED_TYPES_AND_DESCRIPTIONS,
  {
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
              name: 'bar',
              description: 'bar param',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
            },
          ],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    foo: {
                      type: 'string',
                      description: 'description to describe an optional string',
                    },
                    bar: {
                      oneOf: [
                        {
                          type: 'number',
                        },
                        {
                          type: 'string',
                        },
                      ],
                      description:
                        'description to describe an optional union of number and string',
                    },
                    child: {
                      type: 'object',
                      description: 'description to describe an object',
                      properties: {
                        child: {
                          type: 'object',
                          description:
                            'dsecription to describe an intersection of a type and a partial',
                          properties: {
                            foo: {
                              type: 'string',
                            },
                            bar: {
                              type: 'number',
                            },
                          },
                          required: ['foo'],
                        },
                      },
                      required: ['child'],
                    },
                    error: {
                      type: 'object',
                      description: 'description to describe a t.type',
                      properties: {
                        error: {
                          type: 'string',
                        },
                      },
                      required: ['error'],
                    },
                    obj: {
                      type: 'object',
                      description: 'description to describe an optional t.object',
                      properties: {},
                    },
                    exact: {
                      type: 'object',
                      description: 'description to describe a t.exact',
                      properties: {
                        foo: {
                          type: 'string',
                        },
                      },
                      required: ['foo'],
                    },
                  },
                  required: ['child', 'error', 'exact'],
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
  },
);

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

testCase(
  'route with array types and descriptions',
  ROUTE_WITH_ARRAY_TYPES_AND_DESCRIPTIONS,
  {
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
              name: 'bar',
              description: 'bar param',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
            },
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
                        description: 'foo description',
                      },
                    },
                    bar: {
                      type: 'array',
                      items: {
                        type: 'number',
                        description: 'bar description',
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
                                type: 'string',
                              },
                              {
                                type: 'number',
                              },
                            ],
                            description: 'child description',
                          },
                        },
                      },
                      required: ['child'],
                    },
                  },
                  required: ['foo', 'bar', 'child'],
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
  },
);

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

testCase(
  'route with record types and descriptions',
  ROUTE_WITH_RECORD_TYPES_AND_DESCRIPTIONS,
  {
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
              name: 'bar',
              description: 'bar param',
              in: 'query',
              required: true,
              schema: {
                type: 'object',
                additionalProperties: {
                  type: 'string',
                },
              },
            },
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
                        type: 'number',
                      },
                      description: 'foo description',
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
                                  type: 'string',
                                },
                                {
                                  type: 'number',
                                },
                              ],
                            },
                          },
                          description: 'child description',
                        },
                      },
                      required: ['child'],
                    },
                  },
                  required: ['foo', 'child'],
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
  },
);

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

testCase(
  'route with descriptions, patterns, and examples',
  ROUTE_WITH_DESCRIPTIONS_PATTERNS_EXAMPLES,
  {
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
              name: 'bar',
              description: 'This is a bar param.',
              in: 'query',
              required: true,
              schema: {
                type: 'object',
                example: {
                  foo: 'bar',
                },
                additionalProperties: {
                  type: 'string',
                },
              },
            },
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
                      pattern: '^[1-9][0-9]{4}$',
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
                                type: 'string',
                              },
                              {
                                type: 'number',
                              },
                            ],
                          },
                        },
                      },
                      required: ['child'],
                    },
                  },
                  required: ['foo', 'child'],
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
  },
);

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

testCase(
  'route with descriptions for references',
  ROUTE_WITH_DESCRIPTIONS_FOR_REFERENCES,
  {
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
          parameters: [
            {
              name: 'bar',
              in: 'query',
              required: true,
              schema: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
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
                          $ref: '#/components/schemas/Foo',
                        },
                      ],
                      description: 'This is a foo description.',
                      example: 'BitGo Inc',
                    },
                    // should not need to be wrapped in an allOf
                    bar: {
                      $ref: '#/components/schemas/Bar',
                    },
                  },
                  required: ['foo', 'bar'],
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
          title: 'Bar',
          type: 'object',
          properties: {
            bar: {
              type: 'number',
            },
          },
          required: ['bar'],
        },
      },
    },
  },
);

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

testCase(
  'route with min and max values for strings and default value',
  ROUTE_WITH_MIN_AND_MAX_VALUES_FOR_STRINGS_AND_DEFAULT,
  {
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
          parameters: [
            {
              name: 'bar',
              in: 'query',
              required: true,
              schema: {
                type: 'array',
                items: {
                  type: 'string',
                },
              },
            },
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
                      maxLength: 10,
                    },
                  },
                  required: ['foo'],
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
  },
);

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

testCase('route with overriding comments', ROUTE_WITH_OVERRIDING_COMMENTS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
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
                  target: {
                    type: 'string',
                    description: 'This description should show with the example',
                    example: 'abc',
                  },
                },
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
                  type: 'string',
                  enum: ['OK'],
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
      TargetSchema: {
        title: 'TargetSchema',
        type: 'string',
        example: 'abc',
      },
      ParentSchema: {
        title: 'ParentSchema',
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'This description should show with the example',
            example: 'abc',
          },
        },
      },
    },
  },
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

testCase(
  'route with nested overriding comments',
  ROUTE_WITH_NESTED_OVERRIDEN_COMMENTS,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
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
                    parent: {
                      allOf: [
                        {
                          $ref: '#/components/schemas/ParentSchema',
                        },
                      ],
                      description:
                        'This description should override the previous description',
                    },
                  },
                  required: ['parent'],
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
                    type: 'string',
                    enum: ['OK'],
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
        TargetSchema: {
          title: 'TargetSchema',
          type: 'string',
          example: 'abc',
        },
        ParentSchema: {
          title: 'ParentSchema',
          type: 'object',
          properties: {
            target: {
              type: 'string',
              description: 'This description should show with the example',
              example: 'abc',
            },
          },
        },
        GrandParentSchema: {
          title: 'GrandParentSchema',
          type: 'object',
          properties: {
            parent: {
              allOf: [
                {
                  $ref: '#/components/schemas/ParentSchema',
                },
              ],
              description: 'This description should override the previous description',
            },
          },
          required: ['parent'],
        },
      },
    },
  },
);

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

testCase(
  'route with overriden comments in union',
  ROUTE_WITH_OVERRIDEN_COMMENTS_IN_UNION,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {
      '/foo': {
        post: {
          parameters: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  title: 'Grand Parent Schema',
                  description: 'This is grandparent schema description',
                  type: 'object',
                  properties: {
                    parent: {
                      $ref: '#/components/schemas/ParentSchema',
                    },
                    secondaryParent: {
                      $ref: '#/components/schemas/SecondaryParentSchema',
                    },
                  },
                  required: ['parent', 'secondaryParent'],
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
                    type: 'string',
                    enum: ['OK'],
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
        TargetSchema: {
          title: 'TargetSchema',
          type: 'string',
          example: 'abc',
        },
        TargetSchema2: {
          title: 'TargetSchema2',
          type: 'string',
          example: 'def',
        },
        ParentSchema: {
          title: 'ParentSchema',
          type: 'object',
          properties: {
            target: {
              oneOf: [
                {
                  $ref: '#/components/schemas/TargetSchema',
                },
                {
                  $ref: '#/components/schemas/TargetSchema2',
                },
              ],
              description: 'This description should show with the example',
            },
          },
        },
        SecondaryParentSchema: {
          title: 'SecondaryParentSchema',
          type: 'object',
          properties: {
            target: {
              oneOf: [
                {
                  $ref: '#/components/schemas/TargetSchema',
                },
                {
                  $ref: '#/components/schemas/TargetSchema2',
                },
              ],
              description: 'This description should show with the overriden example',
              example: '"overridden example"',
            },
          },
        },
        GrandParentSchema: {
          title: 'Grand Parent Schema',
          description: 'This is grandparent schema description',
          type: 'object',
          properties: {
            parent: {
              $ref: '#/components/schemas/ParentSchema',
            },
            secondaryParent: {
              $ref: '#/components/schemas/SecondaryParentSchema',
            },
          },
          required: ['parent', 'secondaryParent'],
        },
      },
    },
  },
);

const ROUTE_WITH_ENUM_DESCRIPTIONS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * Enum with @description tags - should generate x-enumDescriptions
 */
export const StatusWithDescriptions = t.keyof(
  {
    /** 
     * @description Transaction is waiting for approval from authorized users 
     */
    pendingApproval: 1,
    /** 
     * @description Transaction was canceled by the user 
     */
    canceled: 1,
    /** 
     * @description Transaction was rejected by approvers 
     */
    rejected: 1,
  },
  'StatusWithDescriptions',
);

/**
 * Simple enum without any descriptions - should use standard format
 */
export const SimpleEnum = t.keyof(
  {
    value1: 1,
    value2: 1,
    value3: 1,
  },
  'SimpleEnum',
);

/**
 * Enum with comments but no @description tags - should NOT generate x-enumDescriptions
 */
export const StatusWithComments = t.keyof(
  {
    /** processing = a case has been picked up by the Trust Committee Email Worker, and is being...processed */
    processing: 1,
    /** approved status */
    approved: 1,
    denied: 1,
  },
  'StatusWithComments',
);

/**
 * Enum with mixed comment types - only @description tags should be used
 */
export const MixedCommentStatus = t.keyof(
  {
    /** 
     * This is just an internal comment about pending status
     */
    pending: 1,
    /** 
     * processing = a case has been picked up by the Trust Committee Email Worker, and is being...processed
     * @description Transaction is currently being processed by the system
     */
    processing: 1,
    /** approved by the team after review */
    approved: 1,
    /** 
     * @description Transaction was rejected due to validation failures
     */
    rejected: 1,
    /** denied without much explanation */
    denied: 1,
  },
  'MixedCommentStatus',
);

/**
 * Route to test all enum description scenarios
 *
 * @operationId api.v1.enumDescriptionScenarios
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/enum-scenarios',
  method: 'GET',
  request: h.httpRequest({
    query: {
      withDescriptions: StatusWithDescriptions,
      simple: SimpleEnum,
      withComments: StatusWithComments,
      mixed: MixedCommentStatus,
    },
  }),
  response: {
    200: {
      result: t.string
    }
  },
});
`;

testCase(
  'enum description scenarios - @description tags vs regular comments vs mixed',
  ROUTE_WITH_ENUM_DESCRIPTIONS,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {
      '/enum-scenarios': {
        get: {
          summary: 'Route to test all enum description scenarios',
          operationId: 'api.v1.enumDescriptionScenarios',
          tags: ['Test Routes'],
          parameters: [
            {
              name: 'withDescriptions',
              in: 'query',
              required: true,
              schema: {
                $ref: '#/components/schemas/StatusWithDescriptions',
              },
            },
            {
              name: 'simple',
              in: 'query',
              required: true,
              schema: {
                $ref: '#/components/schemas/SimpleEnum',
              },
            },
            {
              name: 'withComments',
              in: 'query',
              required: true,
              schema: {
                $ref: '#/components/schemas/StatusWithComments',
              },
            },
            {
              name: 'mixed',
              in: 'query',
              required: true,
              schema: {
                $ref: '#/components/schemas/MixedCommentStatus',
              },
            },
          ],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      result: {
                        type: 'string',
                      },
                    },
                    required: ['result'],
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
        StatusWithDescriptions: {
          title: 'StatusWithDescriptions',
          description:
            'Enum with @description tags - should generate x-enumDescriptions',
          type: 'string',
          enum: ['pendingApproval', 'canceled', 'rejected'],
          'x-enumDescriptions': {
            pendingApproval:
              'Transaction is waiting for approval from authorized users',
            canceled: 'Transaction was canceled by the user',
            rejected: 'Transaction was rejected by approvers',
          },
        },
        SimpleEnum: {
          title: 'SimpleEnum',
          type: 'string',
          enum: ['value1', 'value2', 'value3'],
          description:
            'Simple enum without any descriptions - should use standard format',
        },
        StatusWithComments: {
          title: 'StatusWithComments',
          type: 'string',
          enum: ['processing', 'approved', 'denied'],
          description:
            'Enum with comments but no @description tags - should NOT generate x-enumDescriptions',
        },
        MixedCommentStatus: {
          title: 'MixedCommentStatus',
          type: 'string',
          enum: ['pending', 'processing', 'approved', 'rejected', 'denied'],
          'x-enumDescriptions': {
            processing: 'Transaction is currently being processed by the system',
            rejected: 'Transaction was rejected due to validation failures',
          },
          description:
            'Enum with mixed comment types - only @description tags should be used',
        },
      },
    },
  },
);

const ROUTE_WITH_MARKDOWN_LIST_AND_PRESERVE_LINE_BREAKS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A route with a list in the comment
 *
 * @operationId api.v1.list
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/list',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /**
       * @preserveLineBreaks
       * The permissions granted by this access token.
       *
       * - \`all\` - Access all actions in the test environment.
       * - \`crypto_compare\` - Call CryptoCompare API.
       */
      permissions: t.string,
    },
  }),
  response: {
    200: t.string
  },
});
`;

testCase(
  'route with markdown list in comment and @preserveLineBreaks tag',
  ROUTE_WITH_MARKDOWN_LIST_AND_PRESERVE_LINE_BREAKS,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {
      '/list': {
        get: {
          summary: 'A route with a list in the comment',
          operationId: 'api.v1.list',
          tags: ['Test Routes'],
          parameters: [
            {
              name: 'permissions',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description:
                'The permissions granted by this access token.\n\n- `all` - Access all actions in the test environment.\n- `crypto_compare` - Call CryptoCompare API.',
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
  },
);

const ROUTE_WITH_INLINE_PRESERVE_LINE_BREAKS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * A route with inline preserveLineBreaks tag
 *
 * @operationId api.v1.inline
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/inline',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /**
       * @preserveLineBreaks This tag is inline with other text
       * This is a long description that
       * spans multiple lines in the source.
       */
      field1: t.string,
    },
  }),
  response: {
    200: t.string
  },
});
`;

testCase(
  'route with inline @preserveLineBreaks tag',
  ROUTE_WITH_INLINE_PRESERVE_LINE_BREAKS,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {
      '/inline': {
        get: {
          summary: 'A route with inline preserveLineBreaks tag',
          operationId: 'api.v1.inline',
          tags: ['Test Routes'],
          parameters: [
            {
              name: 'field1',
              in: 'query',
              required: true,
              schema: {
                type: 'string',
              },
              description:
                'This tag is inline with other text\nThis is a long description that\nspans multiple lines in the source.',
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
  },
);
