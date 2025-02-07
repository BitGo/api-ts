import { testCase } from "./testHarness";


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

const ROUTE_WITH_PRIVATE_HEADERS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    headers: {
      /**
       * A private header
       * @private
       */
      'x-private-header': t.string,
      'public-header': t.string
    }
  }),
  response: {
    200: t.string
  },
});
`;

testCase("route with private headers", ROUTE_WITH_PRIVATE_HEADERS, {
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
            'x-internal': true,
            description: 'A private header',
            in: 'header',
            name: 'x-private-header',
            required: true,
            schema: {
              type: 'string'
            }
          },
          {
            in: 'header',
            name: 'public-header',
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
                  type: 'string'
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
