//! should parse discriminated unions

/// file: index.ts

import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const MyRoute = h.httpRoute({
  path: '/test',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: t.union([
      t.type({ key: t.literal('foo') }),
      t.type({ key: t.literal('bar') }),
    ]),
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
                      "required": ["key"],
                      "properties": {
                        "key": { "type": "string", "enum": ["foo"] }
                      }
                    },
                    {
                      "type": "object",
                      "required": ["key"],
                      "properties": {
                        "key": { "type": "string", "enum": ["bar"] }
                      }
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
