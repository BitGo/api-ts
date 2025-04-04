---
sidebar_position: 2
---

# httpRoute

Define an individual HTTP route by providing an object with four properties.

## Properties

### path

Specify the route's path with any path variables. Surround variables with brackets like
`{name}`. The request codec passes these variables to the `params` object.

Example route with no path parameters:

```typescript
httpRoute({
  path: '/example',
  method: 'GET',
  request: httpRequest({
    params: {
      // Nothing needed here, `params` can be undefined
    },
  }),
  response: {
    200: t.string,
  },
});
```

Example with parameters:

```typescript
httpRoute({
  path: '/example/{id}',
  method: 'GET',
  request: httpRequest({
    params: {
      id: NumberFromString,
    },
  }),
  response: {
    200: t.string,
  },
});
```

### method

Specify the HTTP method for this route. Use GET, POST, PUT, PATCH, or DELETE. We may add
support for other methods in the future.

### request

Define the codec that decodes incoming HTTP requests on the server side and encodes
outgoing requests on the client side. Typically, combine it with the `httpRequest` codec
builder function.

```typescript
const Route = httpRoute({
  path: '/example/{id}',
  method: 'GET',
  request: httpRequest({
    params: {
      id: NumberFromString,
    },
  }),
  response: {
    200: t.string,
  },
});

// Due to property flattening, the decoded type is:
type RequestProps = {
  id: number;
};

// Create a client using `superagent-wrapper`
const routeApiClient: (props: RequestProps) => Promise<string>;

// The client handles type checking and parameter placement automatically
const response: string = await routeApiClient({ id: 1337 });
```

### response

Define the possible responses that a route may return, along with the codec for each
response. Response keys correspond to HTTP status codes. The system assumes incoming
responses are JSON.

```typescript
const Route = httpRoute({
  path: '/example',
  method: 'GET',
  request: httpRequest({}),
  response: {
    200: t.type({
      foo: t.string,
    }),
    404: t.type({
      message: t.string,
    }),
    400: t.type({
      message: t.string,
    }),
  },
});
```

## Advanced usage

Sometimes the `httpRequest` function isn't expressive enough for a particular route. You
can combine it with other `io-ts` functions to work around limitations. The `request`
property passed to `httpRoute` only needs to conform to this output type:

```typescript
type GenericHttpRequest = {
  params: {
    [K: string]: string;
  };
  query: {
    [K: string]: string | string[];
  };
  headers: {
    [K: string]: string;
  };
  body?: Json;
};
```

Any codec that outputs an object matching that type works. Here are some common
workarounds:

### Using a non-object body type

By default, `httpRequest` assumes a request body is an object with properties that can
be flattened. For other types (like a string body), combine `httpRequest` with another
codec:

```typescript
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

// Decoded type:
type DecodedType = {
  id: string;
  body: string;
};
```

This approach adds a `body` property to the decoded type, which breaks the abstraction
but works effectively.

### Creating conditional query parameters

For query parameters that depend on other parameter values, use a union of multiple
`httpRequests`:

```typescript
const UnionRoute = httpRoute({
  path: '/example',
  method: 'GET',
  request: t.union([
    httpRequest({
      query: {
        type: t.literal('ping'),
      },
    }),
    httpRequest({
      query: {
        type: t.literal('message'),
        message: t.string,
      },
    }),
  ]),
  response: {
    200: t.string,
  },
});

// Decoded type:
type DecodedType = { type: 'ping' } | { type: 'message'; message: string };
```
