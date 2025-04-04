---
sidebar_position: 1
---

# io-ts-http Reference

Find detailed technical reference documentation for the `io-ts-http` package in this
section.

## Core components

- [apiSpec](./api-spec): Define a collection of routes
- [httpRoute](./http-route): Create individual HTTP routes
- [httpRequest](./http-request): Build HTTP request codecs
- [combinators](./combinators): Create more expressive types

## Installation

```bash
npm install @api-ts/io-ts-http io-ts
```

## Basic usage

```typescript
import * as t from 'io-ts';
import { apiSpec, httpRoute, httpRequest } from '@api-ts/io-ts-http';

// Create a route
const GetUser = httpRoute({
  path: '/users/{id}',
  method: 'GET',
  request: httpRequest({
    params: {
      id: t.string,
    },
  }),
  response: {
    200: t.type({
      id: t.string,
      name: t.string,
      email: t.string,
    }),
    404: t.type({
      error: t.string,
    }),
  },
});

// Define your API specification
export const API = apiSpec({
  'api.v1.users': {
    get: GetUser,
  },
});
```
