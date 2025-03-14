import { testCase } from "./testHarness";

const ROUTE_WITH_SCHEMA_WITH_DEFAULT_METADATA = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { DateFromNumber } from 'io-ts-types';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      ipRestrict: t.boolean
    },
  }),
  response: {
    200: {
      test: DateFromNumber
    }
  },
});
`;

testCase('route with schema with default metadata', ROUTE_WITH_SCHEMA_WITH_DEFAULT_METADATA, {
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
            explode: true,
            in: 'query',
            name: 'ipRestrict',
            required: true,
            schema: {
              type: 'boolean',
            },
            style: 'form'
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
                      type: 'number',
                      format: 'number',
                      title: 'Unix Time (milliseconds)',
                      description: 'Number of milliseconds since the Unix epoch',
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

const ROUTE_WITH_OVERIDDEN_METADATA = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { DateFromNumber } from 'io-ts-types';

export const route = h.httpRoute({
  path: '/foo',
  method: 'GET',
  request: h.httpRequest({
    query: {
      ipRestrict: t.boolean
    },
  }),
  response: {
    200: {
      /** 
       * Testing overridden metadata 
       * @format string
       */
      test: DateFromNumber
    }
  },
});
`;

testCase('route with schema with default metadata', ROUTE_WITH_OVERIDDEN_METADATA, {
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
            explode: true,
            in: 'query',
            name: 'ipRestrict',
            required: true,
            schema: {
              type: 'boolean',
            },
            style: 'form'
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
                      type: 'number',
                      format: 'string',
                      title: 'Unix Time (milliseconds)',
                      description: 'Testing overridden metadata',
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
