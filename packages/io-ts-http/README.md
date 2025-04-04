# @api-ts/io-ts-http

Runtime types for serializing and deserializing HTTP requests from both client and
server sides.

## Introduction

Use io-ts-http as the definition language for api-ts specifications. It helps you define
precise API contracts for web servers. Web servers use the io-ts-http spec to parse HTTP
requests at runtime and encode HTTP responses. Clients use the io-ts-http spec to
enforce API compatibility at compile time and handle request/response encoding and
decoding.

## Installation

```bash
npm install @api-ts/io-ts-http io-ts
```

## Quick example

```typescript
import * as t from 'io-ts';
import { apiSpec, httpRoute, httpRequest } from '@api-ts/io-ts-http';
import { NumberFromString } from 'io-ts-types';

// Create a route for getting a message by ID
const GetMessage = httpRoute({
  path: '/message/{id}',
  method: 'GET',
  request: httpRequest({
    params: {
      id: t.string,
    },
  }),
  response: {
    200: t.type({
      id: t.string,
      message: t.string,
    }),
    404: t.type({
      error: t.string,
    }),
  },
});

// Define your API specification
export const API = apiSpec({
  'api.v1.message': {
    get: GetMessage,
  },
});
```

## Documentation

For comprehensive documentation, visit our
[official documentation site](https://bitgo.github.io/api-ts/docs/reference/io-ts-http):

- **Tutorials**: Step-by-step guides to get started

  - [Create an API specification](https://bitgo.github.io/api-ts/docs/tutorial-basics/create-an-api-spec)
  - [Create an HTTP server](https://bitgo.github.io/api-ts/docs/tutorial-basics/create-an-http-server)
  - [Create an HTTP client](https://bitgo.github.io/api-ts/docs/tutorial-basics/create-an-http-client)

- **How-to guides**: Problem-oriented guides for specific tasks

  - [Advanced HTTP routes](https://bitgo.github.io/api-ts/docs/how-to-guides/advanced-http-routes)
  - [Working with combinators](https://bitgo.github.io/api-ts/docs/how-to-guides/working-with-combinators)

- **Explanation**: Conceptual documentation

  - [Understanding io-ts-http](https://bitgo.github.io/api-ts/docs/explanation/io-ts-http-concepts)

- **Reference**: Technical documentation
  - [apiSpec](https://bitgo.github.io/api-ts/docs/reference/io-ts-http/api-spec)
  - [httpRoute](https://bitgo.github.io/api-ts/docs/reference/io-ts-http/http-route)
  - [httpRequest](https://bitgo.github.io/api-ts/docs/reference/io-ts-http/http-request)
  - [combinators](https://bitgo.github.io/api-ts/docs/reference/io-ts-http/combinators)

## License

MIT
