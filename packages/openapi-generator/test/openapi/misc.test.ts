import { testCase } from './testHarness';

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

testCase(
  'route with many response codes uses default status code descriptions',
  SCHEMA_WITH_MANY_RESPONSE_TYPES,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
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
                    type: 'string',
                  },
                },
              },
            },
            '400': {
              description: 'Bad Request',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/ApiError',
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
              description: 'error message',
            },
          },
          required: ['error'],
          type: 'object',
          title: 'ApiError',
        },
      },
    },
  },
);

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

testCase('route with record types', ROUTE_WITH_RECORD_TYPES, {
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
            name: 'name',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
            },
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
                    // becomes t.type()
                    person: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        age: { type: 'string' },
                        address: { type: 'string' },
                      },
                      required: ['name', 'age', 'address'],
                    },
                    // becomes t.type()
                    anotherPerson: {
                      type: 'object',
                      properties: {
                        name: {
                          type: 'object',
                          properties: {
                            bigName: { type: 'string' },
                            bigAge: { type: 'number' },
                          },
                          required: ['bigName', 'bigAge'],
                        },
                        age: {
                          type: 'object',
                          properties: {
                            bigName: { type: 'string' },
                            bigAge: { type: 'number' },
                          },
                          required: ['bigName', 'bigAge'],
                        },
                        address: {
                          type: 'object',
                          properties: {
                            bigName: { type: 'string' },
                            bigAge: { type: 'number' },
                          },
                          required: ['bigName', 'bigAge'],
                        },
                      },
                      required: ['name', 'age', 'address'],
                    },
                    bigPerson: {
                      // stays as t.record()
                      type: 'object',
                      additionalProperties: { type: 'string' },
                    },
                    anotherBigPerson: {
                      // stays as t.record()
                      type: 'object',
                      additionalProperties: {
                        type: 'object',
                        properties: {
                          bigName: { type: 'string' },
                          bigAge: { type: 'number' },
                        },
                        required: ['bigName', 'bigAge'],
                      },
                    },
                  },
                  required: [
                    'person',
                    'anotherPerson',
                    'bigPerson',
                    'anotherBigPerson',
                  ],
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
      ValidKeys: {
        title: 'ValidKeys',
        type: 'string',
        enum: ['name', 'age', 'address'],
      },
      PersonObject: {
        title: 'PersonObject',
        type: 'object',
        properties: { bigName: { type: 'string' }, bigAge: { type: 'number' } },
        required: ['bigName', 'bigAge'],
      },
    },
  },
});

const CONTENT_TYPE_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * Route with per-schema content types
 *
 * @operationId api.v1.uploadDocument
 * @tag Document Upload
 */
export const uploadRoute = h.httpRoute({
  path: '/upload',
  method: 'POST',
  request: h.httpRequest({
    /**
     * File upload data
     * @contentType multipart/form-data
     */
    body: t.type({
      file: t.unknown,
      documentType: t.string,
    }),
  }),
  response: {
    /**
     * Upload success response
     * @contentType application/xml
     */
    201: t.type({
      id: t.string,
      success: t.boolean,
    }),
  },
});

/**
 * Route with default application/json content type
 *
 * @operationId api.v1.createUser
 * @tag User Management
 */
export const createUserRoute = h.httpRoute({
  path: '/users',
  method: 'POST',
  request: h.httpRequest({
    body: t.type({
      name: t.string,
      email: t.string,
    }),
  }),
  response: {
    201: t.type({
      id: t.string,
      name: t.string,
    }),
  },
});
`;

testCase('route with per-schema contentType tags', CONTENT_TYPE_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/upload': {
      post: {
        summary: 'Route with per-schema content types',
        operationId: 'api.v1.uploadDocument',
        tags: ['Document Upload'],
        parameters: [],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                description: 'File upload data',
                type: 'object',
                properties: {
                  file: {},
                  documentType: { type: 'string' },
                },
                required: ['file', 'documentType'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: {
              'application/xml': {
                schema: {
                  description: 'Upload success response',
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    success: { type: 'boolean' },
                  },
                  required: ['id', 'success'],
                },
              },
            },
          },
        },
      },
    },
    '/users': {
      post: {
        summary: 'Route with default application/json content type',
        operationId: 'api.v1.createUser',
        tags: ['User Management'],
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
                required: ['name', 'email'],
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Created',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                  required: ['id', 'name'],
                },
              },
            },
          },
        },
      },
    },
  },
  components: { schemas: {} },
});

const ROUTE_LEVEL_CONTENT_TYPE_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * Route with default XML content type
 * @operationId api.v1.sendNotification
 * @tag Notifications
 * @contentType application/xml
 */
export const sendNotificationRoute = h.httpRoute({
  path: '/notifications',
  method: 'POST',
  request: h.httpRequest({
    body: t.type({
      title: t.string,
      message: t.string,
    }),
  }),
  response: {
    200: t.type({
      id: t.string,
      status: t.string,
    }),
  },
});
`;

testCase('route with route-level contentType override', ROUTE_LEVEL_CONTENT_TYPE_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/notifications': {
      post: {
        summary: 'Route with default XML content type',
        operationId: 'api.v1.sendNotification',
        tags: ['Notifications'],
        parameters: [],
        requestBody: {
          content: {
            'application/xml': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  message: { type: 'string' },
                },
                required: ['title', 'message'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/xml': {
                schema: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string' },
                  },
                  required: ['id', 'status'],
                },
              },
            },
          },
        },
      },
    },
  },
  components: { schemas: {} },
});

const MIXED_CONTENT_TYPE_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * Route with mixed content types - route default with schema overrides
 * @operationId api.v1.processDocument
 * @tag Document Processing
 * @contentType application/xml
 */
export const processDocumentRoute = h.httpRoute({
  path: '/process',
  method: 'POST',
  request: h.httpRequest({
    /**
     * Request overrides route default to JSON
     * @contentType application/json
     */
    body: t.type({
      document: t.string,
      options: t.type({
        validate: t.boolean,
      }),
    }),
  }),
  response: {
    200: t.type({
      result: t.string,
      processed: t.boolean,
    }),
    /**
     * Error response uses custom content type
     * @contentType text/plain
     */
    400: t.type({
      error: t.string,
    }),
  },
});
`;

testCase('route with mixed content type overrides', MIXED_CONTENT_TYPE_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/process': {
      post: {
        summary: 'Route with mixed content types - route default with schema overrides',
        operationId: 'api.v1.processDocument',
        tags: ['Document Processing'],
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                description: 'Request overrides route default to JSON',
                type: 'object',
                properties: {
                  document: { type: 'string' },
                  options: {
                    type: 'object',
                    properties: {
                      validate: { type: 'boolean' },
                    },
                    required: ['validate'],
                  },
                },
                required: ['document', 'options'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/xml': {
                schema: {
                  type: 'object',
                  properties: {
                    result: { type: 'string' },
                    processed: { type: 'boolean' },
                  },
                  required: ['result', 'processed'],
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'text/plain': {
                schema: {
                  description: 'Error response uses custom content type',
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                  },
                  required: ['error'],
                },
              },
            },
          },
        },
      },
    },
  },
  components: { schemas: {} },
});

const PER_RESPONSE_CONTENT_TYPE_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * Upload document with different response content types per status code
 * @operationId api.v1.uploadDocumentAdvanced
 * @tag Document Upload
 */
export const uploadAdvancedRoute = h.httpRoute({
  path: '/upload-advanced',
  method: 'POST',
  request: h.httpRequest({
    /**
     * Multipart form data for file upload
     * @contentType multipart/form-data
     */
    body: t.type({
      file: t.unknown,
      documentType: t.string,
    }),
  }),
  response: {
    /** 
     * Success response with JSON data
     * @contentType application/json 
     */
    200: t.type({
      id: t.string,
      success: t.boolean,
    }),
    
    /** 
     * Plain text error message
     * @contentType text/plain 
     */
    400: t.string,
    
    /** 
     * File download response
     * @contentType application/octet-stream
     */
    201: t.unknown,
  },
});

/**
 * Standard route with default content types
 * @operationId api.v1.createUserStandard
 * @tag User Management
 */
export const createUserStandardRoute = h.httpRoute({
  path: '/users-standard',
  method: 'POST',
  request: h.httpRequest({
    body: t.type({
      name: t.string,
      email: t.string,
    }),
  }),
  response: {
    200: t.type({
      id: t.string,
      name: t.string,
    }),
    400: t.type({
      error: t.string,
    }),
  },
});
`;

testCase('routes with per-response content types', PER_RESPONSE_CONTENT_TYPE_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/upload-advanced': {
      post: {
        summary:
          'Upload document with different response content types per status code',
        operationId: 'api.v1.uploadDocumentAdvanced',
        tags: ['Document Upload'],
        parameters: [],
        requestBody: {
          content: {
            'multipart/form-data': {
              schema: {
                description: 'Multipart form data for file upload',
                type: 'object',
                properties: {
                  file: {},
                  documentType: { type: 'string' },
                },
                required: ['file', 'documentType'],
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
                  description: 'Success response with JSON data',
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    success: { type: 'boolean' },
                  },
                  required: ['id', 'success'],
                },
              },
            },
          },
          201: {
            description: 'Created',
            content: {
              'application/octet-stream': {
                schema: {},
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'text/plain': {
                schema: {
                  description: 'Plain text error message',
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
    '/users-standard': {
      post: {
        summary: 'Standard route with default content types',
        operationId: 'api.v1.createUserStandard',
        tags: ['User Management'],
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string' },
                },
                required: ['name', 'email'],
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
                    id: { type: 'string' },
                    name: { type: 'string' },
                  },
                  required: ['id', 'name'],
                },
              },
            },
          },
          400: {
            description: 'Bad Request',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                  },
                  required: ['error'],
                },
              },
            },
          },
        },
      },
    },
  },
  components: { schemas: {} },
});
