---
sidebar_position: 3
---

# `httpRoute`

### Overview

`httpRoute` is a helper function that defines a single HTTP route, specifying its path,
method, request structure, and possible responses.

### Specification

Accepts a single argument: an object with the following properties:

- `path`: (`string`) The URL path for the route. Path parameters are denoted using curly
  braces (e.g., `'/users/{userId}'`). These parameters must be defined in the `request`
  codec's `params` property.
- `method`: (`string`) The HTTP request method (e.g., `'GET'`, `'POST'`, `'PUT'`,
  `'DELETE'`, `'PATCH'`).
- `request`: (`io-ts` Codec) An `io-ts` codec that decodes incoming requests
  (server-side) and encodes outgoing requests (client-side). Typically created using
  `httpRequest`. The codec must decode from an object that conforms to the
  `GenericHttpRequest` interface (see below).
- `response`: (`object`) An object where keys are HTTP status codes (e.g., `200`, `404`,
  as numbers or strings) and values are `io-ts` codecs that define the structure of the
  corresponding response body. Responses are assumed to be JSON.

### Usage Examples

- Route with path parameter and multiple responses:

```typescript
import { httpRoute, httpRequest } from '@api-ts/io-ts-http';
import * as t from 'io-ts';
import { NumberFromString } from 'io-ts-types'; // Example type

const GetMessageRoute = httpRoute({
  path: '/message/{id}',
  method: 'GET',
  request: httpRequest({
    params: {
      id: NumberFromString, // Path param '{id}' defined here
    },
  }),
  response: {
    200: t.type({
      // Codec for 200 OK response body
      id: t.string,
      message: t.string,
    }),
    404: t.type({
      // Codec for 404 Not Found response body
      error: t.string,
    }),
  },
});
```

- Route with request body:

```typescript
import { httpRoute, httpRequest } from '@api-ts/io-ts-http';
import * as t from 'io-ts';

const CreateMessageRoute = httpRoute({
  path: '/message',
  method: 'POST',
  request: httpRequest({
    body: {
      // Defines the structure of the request body
      message: t.string,
    },
  }),
  response: {
    201: t.type({
      // Codec for 201 Created response body
      id: t.string,
      message: t.string,
    }),
    400: t.type({
      // Codec for 400 Bad Request
      error: t.string,
    }),
  },
});
```

### Advanced Usage Notes

- Non-Object Request Body: If a route requires a non-object body (e.g., a raw string),
  `httpRequest` can't define this directly. Use `t.intersection` to combine an
  `httpRequest` (for params, query, headers) with a `t.type({ body: YourCodec })`. The
  decoded type will include a `body` property.

```typescript
// Example for a string body request
const StringBodyRoute = httpRoute({
  path: '/example/{id}',
  method: 'POST',
  request: t.intersection([
    // Combine httpRequest with explicit body type
    httpRequest({
      params: { id: t.string },
    }),
    t.type({
      body: t.string, // Define the body type explicitly
    }),
  ]),
  response: { 200: t.string },
});
// Decoded type: { id: string; body: string }
```

- Conditional Parameters: For requests where parameters depend on each other, use
  `t.union` with multiple `httpRequest` definitions.

```typescript
// Example for conditional query parameters
const UnionRoute = httpRoute({
  path: '/example',
  method: 'GET',
  request: t.union([
    // Union of possible request structures
    httpRequest({ query: { type: t.literal('ping') } }),
    httpRequest({ query: { type: t.literal('message'), message: t.string } }),
  ]),
  response: { 200: t.string },
});
// Decoded type: { type: 'ping' } | { type: 'message'; message: string }
```
