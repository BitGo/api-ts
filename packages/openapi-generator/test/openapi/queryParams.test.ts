import { testCase } from './testHarness';

const BASIC_CODEC_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { NumberFromString, IntFromString, BooleanFromString } from 'io-ts-types';
import { NaturalFromString, NegativeFromString, NegativeIntFromString, NonNegativeFromString, NonPositiveFromString, NonPositiveIntFromString, NonZeroFromString, NonZeroIntFromString, PositiveFromString, ZeroFromString } from 'io-ts-numbers';
import { BigIntFromString, NegativeBigIntFromString, NonNegativeBigIntFromString, NonPositiveBigIntFromString, NonZeroBigIntFromString, PositiveBigIntFromString, ZeroBigIntFromString } from 'io-ts-bigint';
import { DateFromISOString, JsonFromString, UUID, Json, date } from 'io-ts-types';
export const route = h.httpRoute({
  path: '/basic-codecs',
  method: 'GET',
  request: h.httpRequest({
    query: {
      // Base number types
      numberParam: t.number,
      
      // Codec types that should be transformed
      numberFromString: NumberFromString,
      intFromString: IntFromString,
      naturalFromString: NaturalFromString,
      negativeFromString: NegativeFromString,
      negativeIntFromString: NegativeIntFromString,
      nonNegativeFromString: NonNegativeFromString,
      nonPositiveFromString: NonPositiveFromString,
      nonPositiveIntFromString: NonPositiveIntFromString,
      nonZeroFromString: NonZeroFromString,
      nonZeroIntFromString: NonZeroIntFromString,
      positiveFromString: PositiveFromString,
      zeroFromString: ZeroFromString,
      // io-ts-bigint
      bigIntFromString: BigIntFromString,
      negativeBigIntFromString: NegativeBigIntFromString,
      nonNegativeBigIntFromString: NonNegativeBigIntFromString,
      nonPositiveBigIntFromString: NonPositiveBigIntFromString,
      nonZeroBigIntFromString: NonZeroBigIntFromString,
      positiveBigIntFromString: PositiveBigIntFromString,
      zeroBigIntFromString: ZeroBigIntFromString,
      // io-ts-types
      booleanFromString: BooleanFromString,
      dateFromISOString: DateFromISOString,
      jsonFromString: JsonFromString,
      uUID: UUID,
      json: Json,
      date: date
    }
  }),
  response: {
    200: t.type({
      result: t.string
    })
  }
});
`;

testCase('query params test', BASIC_CODEC_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/basic-codecs': {
      get: {
        parameters: [
          {
            name: 'numberParam',
            in: 'query',
            required: true,
            schema: { type: 'number' },
          },
          {
            name: 'numberFromString',
            in: 'query',
            required: true,
            schema: { type: 'number' },
          },
          {
            name: 'intFromString',
            in: 'query',
            required: true,
            schema: { type: 'integer' },
          },
          {
            name: 'naturalFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'number',
            },
          },
          {
            name: 'negativeFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'number',
              maximum: 0,
              exclusiveMaximum: true,
            },
          },
          {
            name: 'negativeIntFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              maximum: 0,
              exclusiveMaximum: true,
            },
          },
          {
            name: 'nonNegativeFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'number',
              minimum: 0,
            },
          },
          {
            name: 'nonPositiveFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'number',
              maximum: 0,
            },
          },
          {
            name: 'nonPositiveIntFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              maximum: 0,
            },
          },
          {
            name: 'nonZeroFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'number',
            },
          },
          {
            name: 'nonZeroIntFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
            },
          },
          {
            name: 'positiveFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'number',
              minimum: 0,
              exclusiveMinimum: true,
            },
          },
          {
            name: 'zeroFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'number',
            },
          },
          {
            name: 'bigIntFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              format: 'int64',
            },
          },
          {
            name: 'negativeBigIntFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              format: 'int64',
              maximum: -1,
            },
          },
          {
            name: 'nonNegativeBigIntFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              format: 'int64',
              minimum: 0,
            },
          },
          {
            name: 'nonPositiveBigIntFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              format: 'int64',
              maximum: 0,
            },
          },
          {
            name: 'nonZeroBigIntFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              format: 'int64',
            },
          },
          {
            name: 'positiveBigIntFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              format: 'int64',
              minimum: 1,
            },
          },
          {
            name: 'zeroBigIntFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'integer',
              format: 'int64',
            },
          },
          {
            name: 'booleanFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'boolean',
            },
          },
          {
            name: 'dateFromISOString',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              format: 'date-time',
            },
          },
          {
            name: 'jsonFromString',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              format: 'json',
            },
          },
          {
            name: 'uUID',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              format: 'uuid',
            },
          },
          {
            name: 'json',
            in: 'query',
            required: true,
            schema: {
              type: 'string',
              format: 'json',
              additionalProperties: true,
            },
          },
          {
            name: 'date',
            in: 'query',
            required: true,
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
                    result: { type: 'string' },
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

const ARRAY_CODEC_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { NumberFromString, IntFromString } from 'io-ts-types';
export const route = h.httpRoute({
  path: '/array-codecs',
  method: 'GET',
  request: h.httpRequest({
    query: {
      numberArray: t.array(t.number),
      numberFromStringArray: t.array(NumberFromString),
      intFromStringArray: t.array(IntFromString)
    }
  }),
  response: {
    200: t.type({
      result: t.string
    })
  }
});
`;

testCase('query params (array codec) transformation test', ARRAY_CODEC_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/array-codecs': {
      get: {
        parameters: [
          {
            name: 'numberArray',
            in: 'query',
            required: true,
            schema: {
              type: 'array',
              items: { type: 'number' },
            },
          },
          {
            name: 'numberFromStringArray',
            in: 'query',
            required: true,
            schema: {
              type: 'array',
              items: { type: 'number' },
            },
          },
          {
            name: 'intFromStringArray',
            in: 'query',
            required: true,
            schema: {
              type: 'array',
              items: { type: 'integer' },
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
                    result: { type: 'string' },
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

// Test union types with codecs
const UNION_CODEC_TEST = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';
import { NumberFromString, IntFromString } from 'io-ts-types';
export const route = h.httpRoute({
  path: '/union-codecs',
  method: 'GET',
  request: h.httpRequest({
    query: {
      // Union types with codecs
      mixedUnion: t.union([t.string, NumberFromString, IntFromString]),
      numberUnion: t.union([t.number, NumberFromString]),
      intUnion: t.union([t.number, IntFromString])
    }
  }),
  response: {
    200: t.type({
      result: t.string
    })
  }
});
`;

testCase('query params (union codec) transformation test', UNION_CODEC_TEST, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/union-codecs': {
      get: {
        parameters: [
          {
            name: 'mixedUnion',
            in: 'query',
            required: true,
            schema: {
              oneOf: [{ type: 'string' }, { type: 'number' }, { type: 'integer' }],
            },
          },
          {
            name: 'numberUnion',
            in: 'query',
            required: true,
            schema: { type: 'number' },
          },
          {
            name: 'intUnion',
            in: 'query',
            required: true,
            schema: { type: 'number' },
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
                    result: { type: 'string' },
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
