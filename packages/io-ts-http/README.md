# io-ts-http

Runtime types for (de)serializing HTTP requests from both the client and server side

## Overview

The primary function in this library is `httpRequest`, which is used to build codecs
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
  body?: unknown;
}
```

Here, `params` represents the path parameters and `query` is minimally-parsed query
string parameters (basically just the results of splitting up the query string and
urlDecoding the values). The `httpRequest` function can be combined with codecs from
`io-ts` to build a combined codec that is able to validate, parse, and encode these
generic HTTP requests into a more refined object. For example:

```typescript
import { httpRequest, optional } from '@bitgo/io-ts-types';
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
// decodeOrElse is a function defined in our common-interface package
const { id, time } = decodeOrElse(
  'Request',
  ExampleHttpRequest,
  request,
  someErrorHandler,
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

## Documentation

- [API Reference](docs/apiReference.md)
