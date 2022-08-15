# @api-ts/io-ts-http

Runtime types for (de)serializing HTTP requests from both the client and server side

## Contents

- [@api-ts/io-ts-http](#api-tsio-ts-http)
  - [Contents](#contents)
  - [Preface](#preface)
  - [Introduction](#introduction)
  - [Overview](#overview)
  - [Example](#example)
    - [`apiSpec`](#apispec)
    - [`httpRoute`](#httproute)
      - [`path`](#path)
      - [`method`](#method)
      - [`request`](#request)
      - [`response`](#response)
    - [`httpRequest`](#httprequest)
      - [`params`](#params)
      - [`query`](#query)
      - [`headers`](#headers)
      - [`body`](#body)
      - [Decoding an `httpRequest`](#decoding-an-httprequest)
  - [Documentation](#documentation)

## Preface

This package extends [io-ts](https://github.com/gcanti/io-ts) with functionality useful
for typing HTTP requests. Start there for base knowledge required to use this package.

## Introduction

io-ts-http is the definition language for api-ts specifications, which define the API
contract for a web sever to an arbitrary degree of precision. Web servers can use the
io-ts-http spec to parse HTTP requests at runtime, and encode HTTP responses. Clients
can use the io-ts-http spec to enforce API compatibility at compile time, and to encode
requests to the server and decode responses.

## Overview

The primary function in this library is `httpRequest`. You can use this to build codecs
which can parse a generic HTTP request into a more refined type. The generic HTTP
request should conform to the following interface:

```typescript
interface GenericHttpRequest {
  params: {
    [K: string]: string;
  };
  query: {
    [K: string]: string | string[];
  };
  headers: {
    [K: string]: string;
  };
  body?: unknown;
}
```

Here, `params` represents the path parameters and `query` is minimally-parsed query
string parameters (basically just the results of splitting up the query string and
urlDecoding the values). The `httpRequest` function can be combined with codecs from
`io-ts` to build a combined codec that is able to validate, parse, and encode these
generic HTTP requests into a more refined object. For example:

```typescript
import { httpRequest, optional } from '@api-ts/io-ts-http';
import { DateFromString, NumberFromString } from 'io-ts-types';

const ExampleHttpRequest = httpRequest({
  query: {
    id: NumberFromString,
    time: optional(DateFromString),
  },
});
```

This builds a codec that can be given an arbitrary HTTP request and will ensure that it
contains an `id` parameter, and also optionally will check for a `time` parameter, and
if it is present, validate and parse it to a `Date`. If decoding succeeds, then the
resulting value's type will be:

```typescript
type ExampleDecodedResult = {
  id: number;
  time?: Date;
};
```

This type is properly inferred by TypeScript and can be used in destructuring like so:

```typescript
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

const { id, time } = pipe(
  ExampleHttpRequest.decode(request),
  E.getOrElseW((decodeErrors) => {
    someErrorHandler(decodeErrors);
  }),
);
```

to get request argument validation and parsing as a one-liner. These codecs can also be
used from the client-side to get the type safety around making outgoing requests. An API
client could hypothetically have a method like:

```typescript
apiClient.request(route, ExampleHttpRequest, {
  id: 1337,
  time: new Date(),
});
```

If both the server and client use the same codec for the request, then it becomes
possible to encode the API contract (or at least as much of it that is possible to
express in the type system) and therefore someone calling the API can be confident that
the server will correctly interpret a request if the arguments typecheck.

## Example

Let's define the api-ts spec for a hypothetical `message-user` service. The conventional
top-level export is an
[`apiSpec`](https://github.com/BitGo/api-ts/blob/master/packages/io-ts-http/docs/apiSpec.md)
value; for example:

### `apiSpec`

```typescript
import { apiSpec } from '@api-ts/io-ts-http';

import { GetMessage, CreateMessage } from './routes/message';
import { GetUser, CreateUser, UpdateUser, DeleteUser } from './routes/user';

/**
 * message-user service
 *
 * @version 1.0.0
 */
export const API = apiSpec({
  'api.v1.message': {
    get: GetMessage,
    post: CreateMessage,
  },
  'api.v1.user': {
    get: GetUser,
    post: CreateUser,
    put: UpdateUser,
    delete: DeleteUser,
  },
});
```

The `apiSpec` is imported, along with some named `httpRoute`s (`{Get|Create}Message`,
and `{Get|Create|Update|Delete}User`) [which we'll discuss below](#httproute).

> Currently, if you add the `@version` JSDoc tag to the exported API spec, it will be
> used as the API `version` when generating an OpenAPI schema. Support for other tags
> may be added in the future.

The top-level export for `message-user-types` is `API`, which we define as an `apiSpec`
with two endpoints `api/v1/message` and `api/v1/user`. The `api/v1/message` endpoint
responds to `GET` and `POST` verbs while the second reponds to `GET`, `POST`, `PUT`, and
`DELETE` verbs using `httpRoute`s defined in `./routes/message`. The following are the
`httpRoute`s defined in `./routes/message`.

### `httpRoute`

```typescript
import * as t from 'io-ts';
import { httpRoute, httpRequest } from '@api-ts/io-ts-http';

export const GetMessage = httpRoute({
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

export const CreateMessage = httpRoute({
  path: '/message',
  method: 'POST',
  request: httpRequest({
    body: {
      message: t.string,
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
```

The first import is the `io-ts` package. It's usually imported `as t` for use in
describing the types of data properties. Again, review
[io-ts](https://github.com/gcanti/io-ts) documentation for more context on how to use it
and this package.

Then `httpRoute` and `httpRequest` are imported. We'll review the
[`httpRequest`](#httprequest) below, but first, let's review the `GetMessage`
`httpRoute`.

```typescript
export const GetMessage = httpRoute({
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
```

[`httpRoute`](https://github.com/BitGo/api-ts/blob/master/packages/io-ts-http/docs/httpRoute.md)s
`apiSpec`s use
[`httpRoute`](https://github.com/BitGo/api-ts/blob/master/packages/io-ts-http/docs/httpRoute.md)s
to define the `path`, `method`, `request` and `response` of a route.

#### `path`

The route's `path` along with possible path variables. You should surround variables
with brackets like `{name}`, and are to the `request` codec under the `params` property.

#### `method`

The route's `method` is the
[HTTP request method](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) to use
for that route. In our `GetMessage` example, the `method` is `GET`, while in our
`PostMessage` example, the `method` is `POST`.

#### `request`

The route's `request` is the output of the `httpRequest` function. This will be
described below.

#### `response`

The route's `response` describes the possible
[HTTP responses](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status) the route can
produce. The key-value pairs of the `response` object are an HTTP status code followed
by the `io-ts` type of the response body. In our `GetMessage` example, a `200` status
response yields a payload of a JSON object with two properties, `message` which is a
`string` and `id` which is also a `string`, and a `404` yeilds a payload of a JSON
object with a single property `error` which is a `String`.

### `httpRequest`

Use `httpRequest` to build the expected type that you pass in a request to the route. In
our example `GetMessage`

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

`httpRequest`s have a total of 4 optional properties: `params` (shown in the example),
`query`, `headers`, and `body`.

#### `params`

`params` is an object representing the types of path parameters in a URL. Any URL
parameters in the `path` property of an `httpRoute` must be accounted for in the
`params` property of the `httpRequest`. Our request has a single URL parameter it is
expecting, `id`. This is the type of this parameter is captured in the `params` object
of our `httpRequest`.

#### `query`

`query` is the object representing the values passed in via query parameters at the end
of a URL. The following example uses a new route, `GetMessages`, to our API that
searches messages related to a specific `author`:

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

#### `headers`

`headers` is an object representing the types of the
[HTTP headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers) passed in with
a request.

#### `body`

`body` is an object representing the type of the
[HTTP body](https://developer.mozilla.org/en-US/docs/Web/HTTP/Messages#body) of a
request. Often this is a JSON object. The `CreateMessage` `httpRoute` in our example
uses the `body` property:

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

#### Decoding an `httpRequest`

When you decode `httpRequests` using `io-ts` helpers, the properties of the request are
flattened like this:

```typescript
import { DateFromString, NumberFromString } from 'io-ts-types';

// build an httpRequest with one parameter id and a body with content and a timestamp
const Request = httpRequest({
  params: {
    id: NumberFromString,
  },
  body: {
    content: t.string,
    timestamp: DateFromISOString,
  },
});

// use io-ts to get the type of the Request
type Request = t.TypeOf<typeof Request>;

// same as
type Request = {
  id: number;
  content: string;
  timestamp: Date;
};
```

## Documentation

- [API Reference](https://github.com/BitGo/api-ts/blob/master/packages/io-ts-http/docs/apiReference.md)
