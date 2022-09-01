//! should read optional properties

/// file: index.ts

import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

const MyRoute = h.httpRoute({
  path: '/test',
  method: 'GET',
  request: h.httpRequest({
    query: {
      req: t.string,
      opt: t.union([t.string, t.undefined]),
    },
  }),
  response: {
    200: t.string,
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
    "version": "0.1.0"
  },
  "paths": {
    "/test": {
      "get": {
        "summary": "MyRoute",
        "parameters": [
          {
            "name": "req",
            "schema": {
              "type": "string"
            },
            "required": true,
            "in": "query"
          },
          {
            "name": "opt",
            "schema": {
              "type": "string"
            },
            "required": false,
            "in": "query"
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
    "schemas": {}
  }
}`;
