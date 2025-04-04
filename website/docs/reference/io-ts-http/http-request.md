---
sidebar_position: 3
---

# httpRequest

Define HTTP request codecs that create a flattened type from query parameters, path
parameters, headers, and body content. Pass an object with codecs for these components
to create a codec that flattens them when decoded and places them in their appropriate
positions when encoded. All parameters are optional and default to an empty object `{}`.

## Properties

You can include these optional properties in the object you pass to `httpRequest`:

### params

Define the types of path parameters in a URL. Include any URL parameters that appear in
the `path` property of your `httpRoute`.

```typescript
export const GetMessage = httpRoute({
  path: '/message/{id}',
  method: 'GET',
  request: httpRequest({
    params: {
      id: t.string,
    },
  }),
  // ...
});
```

### query

Define the query parameters that appear at the end of a URL.

```typescript
export const GetMessages = httpRoute({
  path: '/messages',
  method: 'GET',
  request: httpRequest({
    query: {
      author: t.string,
    },
  }),
  // ...
});
```

### headers

Define the [HTTP headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers)
that should be included with the request.

```typescript
export const GetSecureResource = httpRoute({
  path: '/secure-resource',
  method: 'GET',
  request: httpRequest({
    headers: {
      authorization: t.string,
    },
  }),
  // ...
});
```

### body

Define the [HTTP body](https://developer.mozilla.org/en-US/docs/Web/HTTP/Messages#body)
of the request, typically as a JSON object.

```typescript
export const CreateMessage = httpRoute({
  path: '/message',
  method: 'POST',
  request: httpRequest({
    body: {
      message: t.string,
    },
  }),
  // ...
});
```

## Examples

### Request with a single query parameter

```typescript
const Request = httpRequest({
  query: {
    message: t.string,
  },
});

// Decoded type
type DecodedRequest = {
  message: string;
};
```

### Request with both query and path parameters

```typescript
const Request = httpRequest({
  query: {
    message: t.string,
  },
  params: {
    id: NumberFromString,
  },
});

// Decoded type
type DecodedRequest = {
  message: string;
  id: number;
};
```

### Request with a body

```typescript
const Request = httpRequest({
  params: {
    id: NumberFromString,
  },
  body: {
    content: t.string,
    timestamp: DateFromISOString,
  },
});

// Decoded type
type DecodedRequest = {
  id: number;
  content: string;
  timestamp: Date;
};
```

## How flattening works

When you decode `httpRequests` using `io-ts` helpers, the system flattens all properties
into a single object:

```typescript
import { DateFromISOString, NumberFromString } from 'io-ts-types';

// Create a request with a path parameter and a body
const Request = httpRequest({
  params: {
    id: NumberFromString,
  },
  body: {
    content: t.string,
    timestamp: DateFromISOString,
  },
});

// Get the TypeScript type of the Request
type Request = t.TypeOf<typeof Request>;

// The resulting type is:
type Request = {
  id: number;
  content: string;
  timestamp: Date;
};
```

## Limitations

Currently, `httpRequest` only supports object-type request bodies. For other body types,
see the workaround in the
[httpRoute documentation](./http-route#using-a-non-object-body-type).
