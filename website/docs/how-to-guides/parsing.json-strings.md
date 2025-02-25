# Understanding Atypical Type Behavior from JsonFromString in io-ts-types

There are three type parameters to a codec: `t.Type<I, O, A>`. The third parameter
determines the type that the `decode` function receives. Most codecs have the third
parameter set to `unknown`. However, the type for `JsonFromString` in `io-ts-types` is
`t.Type<Json, string, string>`. Therefore, `JsonFromString` expects a string type before
passing it to `decode`. You can easily convert `JsonFromString` to
`t.Type<Json, string, unknown>` using `t.string`.

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
