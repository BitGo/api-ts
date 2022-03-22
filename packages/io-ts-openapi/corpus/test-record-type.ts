//! should parse record types

/// file: index.ts

import * as t from 'io-ts';
import * as h from '@bitgo/io-ts-http';

const MyRoute = h.httpRoute({
  path: '/test',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    ok: t.record(t.string, t.string),
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
                  "type": "object",
                  "properties": {},
                  "additionalProperties": {
                    "type": "string"
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
    "schemas": {}
  }
}`;
