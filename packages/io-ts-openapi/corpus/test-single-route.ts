//! should create an OpenAPI spec

/// file: other.ts

import * as t from 'io-ts';
import { NumberFromString } from 'io-ts-types';

/**
 * @summary A custom codec
 */
export const MyCodec = NumberFromString;

/// file: index.ts

import * as t from 'io-ts';
import { NonEmptyString } from 'io-ts-types';
import * as h from '@bitgo/io-ts-http';

import { MyCodec } from './other';

/**
 * An example codec that does stuff
 *
 * @private
 */
const MyRoute = h.httpRoute({
  path: '/test/{id}',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** @param horse a non-empty string */
      horse: NonEmptyString,
      /** @param dog a number */
      dog: MyCodec,
    },
    params: {
      /** @param id the test id */
      id: t.string,
    },
  }),
  response: {
    ok: t.number,
    invalidRequest: t.type({ foo: t.string, bar: t.number }),
  },
});

export const Routes = h.apiSpec({
  'api.v1.test.myroute': {
    get: MyRoute,
  },
});

///

`
{
  "openapi": "3.1.0",
  "info": {
    "title": "test",
    "version": "1"
  },
  "paths": {
    "/test/{id}": {
      "get": {
        "summary": "MyRoute",
        "description": "An example codec that does stuff",
        "x-internal": true,
        "parameters": [
          {
            "name": "horse",
            "schema": {
              "$ref": "#/components/schemas/NonEmptyString"
            },
            "required": true,
            "in": "query",
            "description": "a non-empty string"
          },
          {
            "name": "dog",
            "schema": {
              "$ref": "#/components/schemas/MyCodec",
              "description": "A custom codec"
            },
            "required": true,
            "in": "query",
            "description": "a number"
          },
          {
            "name": "id",
            "schema": {
              "type": "string"
            },
            "required": true,
            "in": "path",
            "description": "the test id"
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "number"
                }
              }
            }
          },
          "400": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "foo",
                    "bar"
                  ],
                  "properties": {
                    "foo": {
                      "type": "string"
                    },
                    "bar": {
                      "type": "number"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "NonEmptyString": {
        "title": "NonEmptyString",
        "type": "string"
      },
      "MyCodec": {
        "title": "MyCodec",
        "type": "string"
      }
    }
  }
}`;
