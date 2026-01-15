import { testCase } from "./testHarness";

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

// ============================================================================
// Multibyte Character Tests
// These tests verify that SWC byte offsets are correctly converted to
// JavaScript character offsets when the source contains multibyte UTF-8 chars.
// ============================================================================

// Test case 1: Extended Latin characters (2-byte UTF-8)
const ROUTE_WITH_LATIN_EXTENDED_CHARS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const Body = t.type({
  /**
   * Name with accented characters (À-ÿ, Ā-ſ)
   * @pattern ^[A-Za-zÀ-ÿĀ-ſ\\s'-]+$
   */
  firstName: t.string,
  /**
   * Surname field (supports ñ, ü, ø, etc.)
   * @pattern ^[A-Za-zÀ-ÿĀ-ſ\\s'-]+$
   */
  lastName: t.string,
});

/**
 * Route testing Latin extended characters
 *
 * @operationId api.v1.latinChars
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/latin-chars',
  method: 'POST',
  request: h.httpRequest({
    body: Body,
  }),
  response: {
    200: {
      result: t.string
    }
  },
});
`;

testCase('route with latin extended characters', ROUTE_WITH_LATIN_EXTENDED_CHARS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/latin-chars': {
      post: {
        summary: 'Route testing Latin extended characters',
        operationId: 'api.v1.latinChars',
        tags: ['Test Routes'],
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  firstName: {
                    type: 'string',
                    description: "Name with accented characters (À-ÿ, Ā-ſ)",
                    pattern: "^[A-Za-zÀ-ÿĀ-ſ\\s'-]+$",
                  },
                  lastName: {
                    type: 'string',
                    description: "Surname field (supports ñ, ü, ø, etc.)",
                    pattern: "^[A-Za-zÀ-ÿĀ-ſ\\s'-]+$",
                  },
                },
                required: ['firstName', 'lastName'],
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
      Body: {
        title: 'Body',
        type: 'object',
        properties: {
          firstName: {
            type: 'string',
            description: "Name with accented characters (À-ÿ, Ā-ſ)",
            pattern: "^[A-Za-zÀ-ÿĀ-ſ\\s'-]+$",
          },
          lastName: {
            type: 'string',
            description: "Surname field (supports ñ, ü, ø, etc.)",
            pattern: "^[A-Za-zÀ-ÿĀ-ſ\\s'-]+$",
          },
        },
        required: ['firstName', 'lastName'],
      },
    },
  },
});

// Test case 2: CJK characters (3-byte UTF-8)
const ROUTE_WITH_CJK_CHARS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const Body = t.type({
  /**
   * 日本語の名前フィールド (Japanese name field)
   * @example 山田太郎
   */
  japaneseName: t.string,
  /**
   * 中文名字字段 (Chinese name field)
   * @example 张三
   */
  chineseName: t.string,
  /**
   * 한국어 이름 필드 (Korean name field)
   * @example 김철수
   */
  koreanName: t.string,
});

/**
 * Route testing CJK characters (日本語, 中文, 한국어)
 *
 * @operationId api.v1.cjkChars
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/cjk-chars',
  method: 'POST',
  request: h.httpRequest({
    body: Body,
  }),
  response: {
    200: {
      result: t.string
    }
  },
});
`;

testCase('route with CJK characters', ROUTE_WITH_CJK_CHARS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/cjk-chars': {
      post: {
        summary: 'Route testing CJK characters (日本語, 中文, 한국어)',
        operationId: 'api.v1.cjkChars',
        tags: ['Test Routes'],
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  japaneseName: {
                    type: 'string',
                    description: '日本語の名前フィールド (Japanese name field)',
                    example: '山田太郎',
                  },
                  chineseName: {
                    type: 'string',
                    description: '中文名字字段 (Chinese name field)',
                    example: '张三',
                  },
                  koreanName: {
                    type: 'string',
                    description: '한국어 이름 필드 (Korean name field)',
                    example: '김철수',
                  },
                },
                required: ['japaneseName', 'chineseName', 'koreanName'],
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
      Body: {
        title: 'Body',
        type: 'object',
        properties: {
          japaneseName: {
            type: 'string',
            description: '日本語の名前フィールド (Japanese name field)',
            example: '山田太郎',
          },
          chineseName: {
            type: 'string',
            description: '中文名字字段 (Chinese name field)',
            example: '张三',
          },
          koreanName: {
            type: 'string',
            description: '한국어 이름 필드 (Korean name field)',
            example: '김철수',
          },
        },
        required: ['japaneseName', 'chineseName', 'koreanName'],
      },
    },
  },
});

// Test case 3: Mixed multibyte characters at multiple positions
const ROUTE_WITH_MIXED_MULTIBYTE = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * Café menu item (note: café has 2-byte é)
 */
const CaféItem = t.type({
  /** Item name (日本語 OK) */
  name: t.string,
  /** Price in € (euros) */
  price: t.number,
});

export const Body = t.type({
  /**
   * Order at Müller's café
   * @example Crème brûlée
   */
  item: CaféItem,
  /**
   * Customer name (supports: José, François, 田中)
   */
  customerName: t.string,
});

/**
 * Route with mixed multibyte: é, ü, è, û, 日本語
 *
 * @operationId api.v1.mixedMultibyte
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/mixed-multibyte',
  method: 'POST',
  request: h.httpRequest({
    body: Body,
  }),
  response: {
    200: {
      result: t.string
    }
  },
});
`;

testCase('route with mixed multibyte characters', ROUTE_WITH_MIXED_MULTIBYTE, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/mixed-multibyte': {
      post: {
        summary: 'Route with mixed multibyte: é, ü, è, û, 日本語',
        operationId: 'api.v1.mixedMultibyte',
        tags: ['Test Routes'],
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  item: {
                    allOf: [
                      {
                        $ref: '#/components/schemas/CaféItem',
                      },
                    ],
                    description: "Order at Müller's café",
                    example: 'Crème brûlée',
                  },
                  customerName: {
                    type: 'string',
                    description: 'Customer name (supports: José, François, 田中)',
                  },
                },
                required: ['item', 'customerName'],
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
      CaféItem: {
        title: 'CaféItem',
        description: 'Café menu item (note: café has 2-byte é)',
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Item name (日本語 OK)',
          },
          price: {
            type: 'number',
            description: 'Price in € (euros)',
          },
        },
        required: ['name', 'price'],
      },
      Body: {
        title: 'Body',
        type: 'object',
        properties: {
          item: {
            allOf: [
              {
                $ref: '#/components/schemas/CaféItem',
              },
            ],
            description: "Order at Müller's café",
            example: 'Crème brûlée',
          },
          customerName: {
            type: 'string',
            description: 'Customer name (supports: José, François, 田中)',
          },
        },
        required: ['item', 'customerName'],
      },
    },
  },
});

// Test case 4: Multibyte characters at the very start of the file
const ROUTE_WITH_MULTIBYTE_AT_START = `/**
 * 日本語コメント at the very start
 */
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const Body = t.type({
  /** Normal field after multibyte start */
  value: t.string,
});

/**
 * Route where file starts with multibyte chars
 *
 * @operationId api.v1.multibyteStart
 * @tag Test Routes
 */
export const route = h.httpRoute({
  path: '/multibyte-start',
  method: 'POST',
  request: h.httpRequest({
    body: Body,
  }),
  response: {
    200: {
      result: t.string
    }
  },
});
`;

testCase('route with multibyte at file start', ROUTE_WITH_MULTIBYTE_AT_START, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/multibyte-start': {
      post: {
        summary: 'Route where file starts with multibyte chars',
        operationId: 'api.v1.multibyteStart',
        tags: ['Test Routes'],
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                properties: {
                  value: {
                    type: 'string',
                    description: 'Normal field after multibyte start',
                  },
                },
                required: ['value'],
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
      Body: {
        title: 'Body',
        type: 'object',
        properties: {
          value: {
            type: 'string',
            description: 'Normal field after multibyte start',
          },
        },
        required: ['value'],
      },
    },
  },
});