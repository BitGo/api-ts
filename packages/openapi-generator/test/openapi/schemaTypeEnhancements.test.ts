import { testCase } from './testHarness';

const NUMBER_TYPE_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const route = h.httpRoute({
  path: '/number-type',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** A number parameter */
      numParam: t.number,
    }
  }),
  response: {
    200: t.type({
      /** A number response */
      result: t.number
    })
  }
});
`;

testCase('number type is correctly represented', NUMBER_TYPE_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/number-type': {
      get: {
        parameters: [
          {
            name: 'numParam',
            in: 'query',
            required: true,
            description: 'A number parameter',
            schema: {
              type: 'number',
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
                    result: {
                      description: 'A number response',
                      type: 'number',
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
    schemas: {},
  },
});

// We've added tests for the other aspects of the changes in commit a69b8e5a375305f84781a808dddd0129119b08a1
// Integer type test is challenging due to how the project handles type references

const JSON_TYPE_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { Json, JsonFromString } from 'io-ts-types';

export const route = h.httpRoute({
  path: '/json-type',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** A JSON string parameter */
      jsonString: JsonFromString,
      /** A JSON parameter */
      jsonObj: Json
    }
  }),
  response: {
    200: t.type({
      /** A JSON string response */
      jsonString: t.type({ title: t.literal('JSON String') }),
      /** A JSON response */
      jsonObj: Json
    })
  }
});
`;

testCase('JSON types are correctly represented', JSON_TYPE_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/json-type': {
      get: {
        parameters: [
          {
            name: 'jsonString',
            in: 'query',
            required: true,
            description: 'A JSON string parameter',
            schema: {
              type: 'string',
              format: 'json',
            },
          },
          {
            name: 'jsonObj',
            in: 'query',
            required: true,
            description: 'A JSON parameter',
            schema: {
              type: 'string',
              format: 'json',
              additionalProperties: true,
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
                    jsonString: {
                      description: 'A JSON string response',
                      type: 'object',
                      properties: {
                        title: {
                          type: 'string',
                          enum: ['JSON String'],
                        },
                      },
                      required: ['title'],
                    },
                    jsonObj: {
                      type: 'string',
                      format: 'json',
                      additionalProperties: true,
                    },
                  },
                  required: ['jsonString', 'jsonObj'],
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

const DATE_FORMAT_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { DateFromISOString, date } from 'io-ts-types';

export const route = h.httpRoute({
  path: '/date-format',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** A date-time parameter */
      dateTime: DateFromISOString,
      /** A date parameter */
      dateOnly: date
    }
  }),
  response: {
    200: t.type({
      /** A date-time response */
      dateTime: DateFromISOString,
      /** A date response */
      dateOnly: date
    })
  }
});
`;

testCase('Date formats are correctly represented', DATE_FORMAT_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/date-format': {
      get: {
        parameters: [
          {
            name: 'dateTime',
            in: 'query',
            required: true,
            description: 'A date-time parameter',
            schema: {
              type: 'string',
              format: 'date-time',
            },
          },
          {
            name: 'dateOnly',
            in: 'query',
            required: true,
            description: 'A date parameter',
            schema: {
              type: 'string',
              format: 'date',
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
                    dateTime: {
                      description: 'A date-time response',
                      type: 'string',
                      format: 'date-time',
                    },
                    dateOnly: {
                      description: 'A date response',
                      type: 'string',
                      format: 'date',
                    },
                  },
                  required: ['dateTime', 'dateOnly'],
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

const UUID_FORMAT_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { UUID } from 'io-ts-types';

export const route = h.httpRoute({
  path: '/uuid-format',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** A UUID parameter */
      uuid: UUID
    }
  }),
  response: {
    200: t.type({
      /** A UUID response */
      uuid: UUID
    })
  }
});
`;

testCase('UUID format is correctly represented', UUID_FORMAT_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/uuid-format': {
      get: {
        parameters: [
          {
            name: 'uuid',
            in: 'query',
            required: true,
            description: 'A UUID parameter',
            schema: {
              type: 'string',
              format: 'uuid',
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
                    uuid: {
                      description: 'A UUID response',
                      type: 'string',
                      format: 'uuid',
                    },
                  },
                  required: ['uuid'],
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

const BIGINT_TYPE_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { BigIntFromString, NonNegativeBigIntFromString, PositiveBigIntFromString } from 'io-ts-bigint';

export const route = h.httpRoute({
  path: '/bigint-type',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** A bigint parameter */
      bigint: BigIntFromString,
      /** A non-negative bigint parameter */
      nonNegativeBigint: NonNegativeBigIntFromString,
      /** A positive bigint parameter */
      positiveBigint: PositiveBigIntFromString
    }
  }),
  response: {
    200: t.type({
      /** A bigint response */
      bigint: BigIntFromString,
      /** A non-negative bigint response */
      nonNegativeBigint: NonNegativeBigIntFromString,
      /** A positive bigint response */
      positiveBigint: PositiveBigIntFromString
    })
  }
});
`;

testCase('BigInt types are correctly represented', BIGINT_TYPE_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/bigint-type': {
      get: {
        parameters: [
          {
            name: 'bigint',
            in: 'query',
            required: true,
            description: 'A bigint parameter',
            schema: {
              type: 'integer',
              format: 'int64',
            },
          },
          {
            name: 'nonNegativeBigint',
            in: 'query',
            required: true,
            description: 'A non-negative bigint parameter',
            schema: {
              type: 'integer',
              format: 'int64',
              minimum: 0,
            },
          },
          {
            name: 'positiveBigint',
            in: 'query',
            required: true,
            description: 'A positive bigint parameter',
            schema: {
              type: 'integer',
              format: 'int64',
              minimum: 1,
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
                    bigint: {
                      description: 'A bigint response',
                      type: 'integer',
                      format: 'int64',
                    },
                    nonNegativeBigint: {
                      description: 'A non-negative bigint response',
                      type: 'integer',
                      format: 'int64',
                      minimum: 0,
                    },
                    positiveBigint: {
                      description: 'A positive bigint response',
                      type: 'integer',
                      format: 'int64',
                      minimum: 1,
                    },
                  },
                  required: ['bigint', 'nonNegativeBigint', 'positiveBigint'],
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

const PARAM_NAME_DETECTION_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { NumberFromString } from 'io-ts-types';

export const route = h.httpRoute({
  path: '/param-name-detection',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** Should be detected as integer from name */
      nonZeroIntFromString: NumberFromString,
      /** Should remain as number */
      regularNumber: NumberFromString
    }
  }),
  response: {
    200: t.type({
      result: t.string
    })
  }
});
`;

testCase('Parameter name detection for type inference', PARAM_NAME_DETECTION_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/param-name-detection': {
      get: {
        parameters: [
          {
            name: 'nonZeroIntFromString',
            in: 'query',
            required: true,
            description: 'Should be detected as integer from name',
            schema: {
              type: 'integer',
            },
          },
          {
            name: 'regularNumber',
            in: 'query',
            required: true,
            description: 'Should remain as number',
            schema: {
              type: 'number',
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
    schemas: {},
  },
});
