---
sidebar_position: 4
---

# `httpRequest`

### Overview

`httpRequest` is a helper function that builds `io-ts` codecs specifically for HTTP
requests. It defines the expected structure of path parameters, query parameters,
headers, and the request body. The resulting codec flattens these distinct parts into a
single object upon successful decoding.

### Specification

Accepts a single optional argument: an object that can contain the following optional
properties:

- `params`: (`object`) An object that maps path parameter names (strings matching
  `{name}` syntax in `httpRoute` path) to `io-ts` codecs for validation and type
  conversion.
- `query`: (`object`) An object that maps query parameter names (strings) to `io-ts`
  codecs.
- `headers`: (`object`) An object that maps HTTP header names (lowercase strings) to
  `io-ts` codecs.
- `body`: (`object` | `io-ts` Codec) An object that maps field names within the request
  body to `io-ts` codecs. Assumes an object structure by default. (See Limitations).

The function returns an `io-ts` codec.

### Behavior

- Decoding: Takes an input object that conforms to `GenericHttpRequest` (see below).
  Validates and parses the `params`, `query`, `headers`, and `body` based on the
  provided codecs. If successful, returns a flattened object that contains all decoded
  properties directly.
- Encoding: Takes a flattened object (matching the decoded type). Encodes the properties
  back into the structured `GenericHttpRequest` format, suitable for sending as a
  request.

### Decoded Type Structure

The `t.TypeOf` of the resulting codec is a flat object that contains properties from
`params`, `query`, `headers`, and `body` combined.

```typescript
import * as t from 'io-ts';
import { httpRequest } from '@api-ts/io-ts-http';
import { NumberFromString, DateFromISOString } from 'io-ts-types'; // Example types

const ExampleRequestCodec = httpRequest({
  params: {
    id: NumberFromString, // from path '/.../{id}'
  },
  query: {
    filter: t.string, // from query '?filter=...'
  },
  body: {
    content: t.string,
    timestamp: DateFromISOString,
  },
});

// The resulting decoded type:
type ExampleDecoded = t.TypeOf<typeof ExampleRequestCodec>;
// Equivalent to:
// type ExampleDecoded = {
//   id: number;        // from params
//   filter: string;    // from query
//   content: string;   // from body
//   timestamp: Date;   // from body
// };
```

### Limitations

Assumes the request `body`, if present and defined via the shorthand object syntax, is
an object whose properties can be flattened. For non-object bodies, see the advanced
usage notes under `httpRoute`.

### Usage Examples

- Query Parameters Only:

```typescript
const RequestWithQuery = httpRequest({
  query: { message: t.string, count: NumberFromString },
});
// Decoded type: { message: string; count: number }
```

- Path and body parameters:

```typescript
const RequestWithPathAndBody = httpRequest({
  params: { userId: t.string },
  body: { data: t.unknown },
});
// Decoded type: { userId: string; data: unknown }
```
