//! should handle multiple routes at different paths

/// file: index.ts

import * as t from 'io-ts';
import { NonEmptyString, NumberFromString } from 'io-ts-types';
import * as h from '@bitgo/io-ts-http';

const FirstRoute = h.httpRoute({
  path: '/test/{id}/first',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** @param horse a non-empty string */
      horse: NonEmptyString,
      /** @param dog a number */
      dog: NumberFromString,
    },
    params: {
      /** @param id the test id */
      id: t.string,
    },
  }),
  response: {
    ok: t.string,
  },
} as const);

const SecondRoute = h.httpRoute({
  path: '/test/{id}/second',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /** @param horse a non-empty string */
      horse: NonEmptyString,
      /** @param dog a number */
      dog: NumberFromString,
    },
    params: {
      /** @param id the test id */
      id: t.string,
    },
  }),
  response: {
    ok: t.string,
  },
});

export const Routes = h.apiSpec({
  'api.v1.test.first': {
    get: FirstRoute,
  },
  'api.v1.test.second': {
    get: SecondRoute,
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
    "/test/{id}/first": {
      "get": {
        "summary": "FirstRoute",
        "description": "",
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
              "$ref": "#/components/schemas/NumberFromString"
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
                  "type": "string"
                }
              }
            }
          }
        }
      }
    },
    "/test/{id}/second": {
      "get": {
        "summary": "SecondRoute",
        "description": "",
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
              "$ref": "#/components/schemas/NumberFromString"
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
                  "type": "string"
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
      "NumberFromString": {
        "title": "NumberFromString",
        "type": "string"
      }
    }
  }
}`;
