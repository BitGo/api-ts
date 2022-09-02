---
sidebar_position: 1
---

# How to Parse a number from a Query Parameter

Query parameters are represented as the type
`Record<string, string | string[] | undefined>`, so using a codec that doesn't decode
from a `string | string[] | undefined` will produce a type error.

<CH.Spotlight>

Consider this `httpRoute` that compiles successfully.

```typescript spec.ts
import * as t from 'io-ts';
import { httpRoute, httpRequest } from '@api-ts/io-ts-http';

const GetHello = httpRoute({
  path: '/hello/{name}',
  method: 'GET',
  request: httpRequest({
    params: {
      name: t.string,
    },
  }),
  response: {
    200: t.string,
  },
});
```

---

```typescript spec.ts focus=14:16
import * as t from 'io-ts';
import { httpRoute, httpRequest } from '@api-ts/io-ts-http';

const GetHello = httpRoute({
  path: '/hello/{name}',
  method: 'GET',
  request: httpRequest({
    params: {
      name: t.string,
    },
    query: {
      repeat: t.number, // Compilation error!
    },
  }),
  response: {
    200: t.string,
  },
});
```

If you add an expected `number` value to the `httpRoute`'s query parameters, you'll see
the following compilation error:

```
index.ts:16:7 - error TS2322:
  Codec's output type is not assignable to
  string | string[] | undefined.
  Try using one like `NumberFromString`

13       repeat: t.number
```

Recall that `t.number` decodes an `unknown` value into a `number` without any
manipulation of the starting value. If you started with a number, you'll decode a
number.

We need a codec that decodes a `string` into a `number` and converts the
string-representation of a number into the `number` type.

---

This is a fairly common requirement, so this codec already exists: [io-ts-types] offers
the [NumberFromString] codec that decodes a `string` value into a `number`. Use
`NumberFromString` to fix your compilation error.

[io-ts-types]: https://github.com/gcanti/io-ts-types
[numberfromstring]:
  https://gcanti.github.io/io-ts-types/modules/NumberFromString.ts.html

```typescript spec.ts focus=2,15:17
import * as t from 'io-ts';
import { NumberFromString } from 'io-ts-types';
import { httpRoute, httpRequest } from '@api-ts/io-ts-http';

const GetHello = httpRoute({
  path: '/hello/{name}',
  method: 'GET',
  request: httpRequest({
    params: {
      name: t.string,
    },
    query: {
      repeat: NumberFromString,
    },
  }),
  response: {
    200: t.string,
  },
});
```

</CH.Spotlight>

In general, the solution to decoding a query parameter into a non-string type is to use
a codec that decodes and encodes from a `string` into your desired type.
