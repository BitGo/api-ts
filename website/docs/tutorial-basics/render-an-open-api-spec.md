---
sidebar_position: 4
---

# Render an OpenAPI Specification

Learn how to generate OpenAPI specifications from `io-ts-http` API definitions.

An `io-ts-http` specification contains a superset of an [OpenAPI] specification.
`api-ts` provides `@api-ts/openapi-generator` to produce an OpenAPI specification from
an `io-ts-http` API specification. This enables integration with the existing OpenAPI
ecosystem to generate HTTP clients for languages other than TypeScript. These clients
won't be as ergonomic or type-safe as an `api-ts` HTTP client.

[openapi]: https://www.openapis.org/

## Working with `openapi-generator`

As in previous steps, first edit the `package.json` file to add new dependencies
(highlighted):

```json package.json focus=15
{
  "name": "api-ts-example",
  "scripts": {
    "build": "tsc --lib es2015 --esModuleInterop *.ts"
  },
  "dependencies": {
    "@api-ts/express-wrapper": "1.0.0-beta.20",
    "@api-ts/io-ts-http": "0.2.0-beta.9",
    "@api-ts/response": "0.1.2-beta.2",
    "@api-ts/superagent-wrapper": "0.2.0-beta.13",
    "io-ts": "2.1.3",
    "superagent": "9.0.1"
  },
  "devDependencies": {
    "@api-ts/openapi-generator": "0.2.0-beta.6",
    "@types/express": "4.17.13",
    "@types/node": "18.6.1",
    "@types/superagent": "4.1.15",
    "typescript": "4.7.4"
  }
}
```

Install it by running:

```
$ npm install
```

The `openapi-generator` requires TypeScript compiler settings to be specified in a
`tsconfig.json` file, so create one like this:

```json tsconfig.json
{
  "include": ["*.ts"],
  "compilerOptions": {
    "lib": ["es2015"],
    "esModuleInterop": true
  }
}
```

Invoke the `openapi-generator` by running:

```
$ npx openapi-generator --input ./index.ts --output ./api.json
```

This will produce a file `api.json` with the following content:

```json api.json
{
  "openapi": "3.1.0",
  "info": {
    "title": "api-ts-example",
    "version": "0.1.0"
  },
  "paths": {
    "/hello/{name}": {
      "get": {
        "summary": "GetHello",
        "description": "",
        "parameters": [
          {
            "name": "name",
            "schema": {
              "type": "string"
            },
            "required": true,
            "in": "path",
            "description": ""
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
}
```
