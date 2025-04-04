# Advanced HTTP route patterns

Learn advanced patterns for defining HTTP routes with `io-ts-http` beyond the basic
usage examples.

## Work with non-object body types

By default, `httpRequest` assumes the request body is a JSON object. Sometimes you need
to accept other types like strings, numbers, or arrays.

### Accept a string body

Use `t.intersection` to combine `httpRequest` with a custom type that accepts a string
body:

```typescript
import * as t from 'io-ts';
import { httpRoute, httpRequest } from '@api-ts/io-ts-http';

const StringBodyRoute = httpRoute({
  path: '/example/{id}',
  method: 'POST',
  request: t.intersection([
    httpRequest({
      params: { id: t.string },
    }),
    t.type({
      body: t.string,
    }),
  ]),
  response: {
    200: t.string,
  },
});

// Decoded type
type DecodedType = {
  id: string;
  body: string;
};
```

This approach breaks the abstraction slightly by exposing a `body` property in the
decoded type, but it works effectively.

### Accept an array body

Similarly, accept an array body:

```typescript
const ArrayBodyRoute = httpRoute({
  path: '/batch-process',
  method: 'POST',
  request: t.intersection([
    httpRequest({}),
    t.type({
      body: t.array(t.string),
    }),
  ]),
  response: {
    200: t.type({
      processed: t.number,
    }),
  },
});

// Decoded type
type DecodedType = {
  body: string[];
};
```

## Create conditional request parameters

Sometimes you need parameters that are required only when other parameters have specific
values.

### Use union types

Use `t.union` with multiple `httpRequest` objects to handle conditional parameters:

```typescript
const SearchRoute = httpRoute({
  path: '/search',
  method: 'GET',
  request: t.union([
    // When searching by keyword
    httpRequest({
      query: {
        type: t.literal('keyword'),
        keyword: t.string,
      },
    }),
    // When searching by category
    httpRequest({
      query: {
        type: t.literal('category'),
        categoryId: NumberFromString,
      },
    }),
    // When searching by both
    httpRequest({
      query: {
        type: t.literal('combined'),
        keyword: t.string,
        categoryId: NumberFromString,
      },
    }),
  ]),
  response: {
    200: t.array(
      t.type({
        id: t.string,
        title: t.string,
      }),
    ),
  },
});

// Decoded type will be a union:
type DecodedType =
  | { type: 'keyword'; keyword: string }
  | { type: 'category'; categoryId: number }
  | { type: 'combined'; keyword: string; categoryId: number };
```

## Add optional headers

HTTP headers are often optional. Use the `optional` combinator to define optional
headers:

```typescript
import { httpRequest, optional } from '@api-ts/io-ts-http';

const RequestWithOptionalHeaders = httpRoute({
  path: '/resource',
  method: 'GET',
  request: httpRequest({
    headers: {
      authorization: t.string,
      'cache-control': optional(t.string),
      'if-modified-since': optional(t.string),
    },
  }),
  response: {
    200: t.object,
  },
});

// Decoded type
type DecodedType = {
  authorization: string;
  'cache-control'?: string;
  'if-modified-since'?: string;
};
```

## Handle file uploads

File uploads typically use `multipart/form-data` encoding. While `io-ts-http` doesn't
directly support file uploads, you can treat the file as an opaque object in the type
system and handle the file processing separately:

```typescript
const FileUploadRoute = httpRoute({
  path: '/upload',
  method: 'POST',
  request: httpRequest({
    body: {
      // In the type system, just indicate a file is expected
      // Your server framework will handle the actual file
      file: t.unknown,
      description: optional(t.string),
    },
  }),
  response: {
    200: t.type({
      fileId: t.string,
      size: t.number,
    }),
  },
});
```

## Combine multiple request sources

Sometimes you need to extract information from multiple sources, such as getting an ID
from the path, authentication from headers, and data from the body:

```typescript
const ComplexRoute = httpRoute({
  path: '/users/{userId}/profile',
  method: 'PUT',
  request: httpRequest({
    params: {
      userId: NumberFromString,
    },
    headers: {
      authorization: t.string,
    },
    body: {
      name: t.string,
      email: t.string,
      preferences: t.type({
        theme: t.union([t.literal('light'), t.literal('dark')]),
        notifications: t.boolean,
      }),
    },
  }),
  response: {
    200: t.type({
      success: t.boolean,
    }),
  },
});

// Decoded type
type DecodedType = {
  userId: number;
  authorization: string;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
};
```

## Summary

These advanced patterns help you define complex HTTP routes that accurately reflect your
API's requirements. By combining `io-ts` with `httpRequest` and `httpRoute`, you can
create type-safe APIs with sophisticated validation logic.
