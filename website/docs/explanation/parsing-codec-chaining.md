# Decoding JSON from Headers, Query Parameters, and URL Parameters

Though we know headers, URL parameters, and query parameters will be received as a
`string` or `string[]` value, due to a limitation in api-ts, `httpRequest` only accepts
codecs that decode values starting from the `unknown` type. Consequently, decoding a
header, URL parameter, or query parameter with a codec like `JsonFromString`, which can
only decode values typed as `string`, will produce a error like:

```
Type 'Type<Json, string, string>' is not assignable to type 'Mixed'.
  Types of property 'validate' are incompatible.
    Type 'Validate<string, Json>' is not assignable to type 'Validate<unknown, any>'.
      Type 'unknown' is not assignable to type 'string'.
```

There's a straightforward pattern you can use when you have a value typed as `unknown`
but need to decode it with a codec that can only decode a narrower type. This pattern is
called <em>codec chaining</em>:

```typescript
declare const JsonFromString: t.Type<Json, string, string>;
declare const t.string: t.Type<string, string, unknown>;

const myCodec: t.Type<Json, string, unknown> = t.string.pipe(JsonFromString);
```

Here, `t.string` decodes a value from `unknown` to `string`, and then `JsonFromString`
decodes the same value from `string` to `Json`.

For example:

```typescript
import * as t from 'io-ts';
import { nonEmptyArray, JsonFromString, NumberFromString } from 'io-ts-types';
import { httpRequest, optional } from '@api-ts/io-ts-http';

// Define the Filter type for the JSON string
const Filter = t.type({
  category: t.string,
  tags: t.array(t.string),
  price: t.type({
    min: t.number,
    max: t.number,
  }),
});

// Define the SearchRequest codec
const SearchRequest = httpRequest({
  params: {
    userId: NumberFromString,
  },
  query: {
    q: t.string,
    filter: t.string.pipe(JsonFromString).pipe(Filter),
    tags: nonEmptyArray(t.string),
    sort: optional(t.string),
  },
  headers: {
    authorization: t.string,
  },
});

// Example request object
const example = {
  params: {
    userId: '84938492',
  },
  query: {
    q: 'test',
    filter:
      '{"category":"books","tags":["crypto","trading"],"price":{"min":10,"max":50}}',
    tags: ['tag1', 'tag2', 'tag3'],
    sort: 'price',
  },
  headers: {
    authorization: 'Bearer token',
  },
};

// Decode the example
const decoded = SearchRequest.decode(example);
if (decoded._tag === 'Right') {
  console.log(decoded);
  /* 
    Expected decoded output
    {
        userId: 84938492,
        q: 'test',
        filter: {
        category: 'books',
        tags: ['crypto', 'trading'],
        price: { min: 10, max: 50 },
        },
        tags: ['tag1', 'tag2', 'tag3'],
        sort: 'price',
        authorization: 'Bearer token',
    };
    */
} else {
  console.error('Decoding failed:', decoded.left);
}
```
