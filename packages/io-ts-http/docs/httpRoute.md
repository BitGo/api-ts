## `httpRoute`

Helper function for defining an individual HTTP route. It accepts an object with 4
properties.

### `path`

The route's path along with possible path variables. Variables should be surrounded with
brackets like `{name}`. They will be passed to the request codec under the `params`
object.

Example route with no path params:

```typescript
httpRoute({
  path: '/example',
  method: 'GET',
  request: httpRequest({
    params: {
      // Nothing in here, in fact `params` can just be undefined
    },
  }),
  response: {
    ok: t.string,
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
    ok: t.string,
  },
});
```

### `method`

The HTTP method for this route. Currently one of GET, POST, PUT, or DELETE. Others can
be added in the future.

### `request`

The codec used to decode incoming HTTP requests on the server side, and encode outgoing
ones on the client side. The primary intended usage here is to combine it with the
`httpRequest` codec builder function.

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
    ok: t.string,
  },
});

// Due to property flattening, the decoded type of the above request codec is this
type RequestProps = {
  id: number;
};

// Now imagine I have some api client using the above route definition. `superagent-wrapper`
// can be used to create a client like this for a whole group of routes in one line.
const routeApiClient: (props: RequestProps) => Promise<string>;

// The parameters passed to the client are typechecked and also abstracted such that the caller does
// not need to know which parameters go in the path/query/body/etc. In addition, any necessary type
// conversions happen automatically
const response: string = await routeApiClient({ id: 1337 });
```

### `response`

Declares the potential responses that a route may return along with the codec associated
to each response. The possible response keys can be found in the `io-ts-response`
package. Incoming responses are assumed to be JSON.

```typescript
const Route = httpRoute({
  path: '/example',
  method: 'GET',
  request: httpRequest({}),
  response: {
    ok: t.type({
      foo: t.string,
    }),
    notFound: t.type({
      message: t.string,
    }),
    invalidRequest: t.type({
      message: t.string,
    }),
  },
});
```

### Advanced Usage

In some cases, the `httpRequest` function isn't expressive enough for a particular route
on its own. It is possible to combine it with other `io-ts` functions to work around
some of these issues until better support is added. The `request` property passed to
`httpRoute` only needs to conform to a certain output type, defined as
`GenericHttpRequest`:

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

Any codec that outputs an object matching that type is accepted. Here are some examples
of known limitations and their workarounds.

#### A route accepts a body type that is not an object

Currently `httpRequest` assumes a request body is an object with properties that can be
flattened into the decoded object. If this isn't the case, for example if request just
wants a string body (though still a JSON string rather than plain text), then
`httpRequest` can be combined with another codec that has the desired type.

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
    ok: t.string,
  },
});

// Decoded type
// t.TypeOf<typeof StringBodyRoute['request']>
type DecodedType = {
  id: string;
  body: string;
};
```

This results in the decoded type having a `body` property breaking the desired
abstraction, but it works.

### A route's has query parameters that may or may not be required depending on the value of other ones

This can be supported with a union of multiple `httpRequests`

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
    ok: string,
  },
});

// Decoded type
// t.TypeOf<typeof UnionRoute['request']>
type DecodedType = { type: 'ping' } | { type: 'message'; message: string };
```
