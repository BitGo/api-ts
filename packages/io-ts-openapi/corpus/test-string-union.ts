//! should parse string unions

/// file: index.ts

import * as t from 'io-ts';
import * as h from '@bitgo/io-ts-http';

const MyRoute = h.httpRoute({
  path: '/test',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    ok: t.keyof({ foo: 1, bar: 1, baz: 1 }),
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
    "version": "1"
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
                  "enum": ["foo", "bar", "baz"],
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
    "schemas": {}
  }
}`;
