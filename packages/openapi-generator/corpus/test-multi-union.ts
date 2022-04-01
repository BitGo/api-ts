//! should parse unions of multiple types

/// file: index.ts

import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const MyRoute = h.httpRoute({
  path: '/test',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    ok: t.union([t.literal('foo'), t.literal(42), t.type({ message: t.string })]),
  },
} as const);

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
    "version": "0.1.0"
  },
  "paths": {
    "/test": {
      "get": {
        "summary": "MyRoute",
        "description": "",
        "parameters": [],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "oneOf": [
                    {
                      "type": "object",
                      "required": ["message"],
                      "properties": {
                        "message": { "type": "string" }
                      }
                    },
                    {
                      "enum": ["foo"],
                      "type": "string"
                    },
                    {
                      "enum": ["42"],
                      "type": "number"
                    }
                  ]
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {}
  }
}`;
