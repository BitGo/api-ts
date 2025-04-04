# Work with io-ts-http combinators

Learn how to use combinators in `io-ts-http` to create more expressive and maintainable
API specifications.

## Use the optional combinator

Make specific properties optional in your request or response types with the `optional`
combinator.

### Basic usage

```typescript
import * as t from 'io-ts';
import { httpRequest, optional } from '@api-ts/io-ts-http';

const UserSearchRequest = httpRequest({
  query: {
    name: t.string,
    age: optional(t.number),
    city: optional(t.string),
  },
});

// Accepts requests with or without age and city parameters
// Decoded type:
// {
//   name: string;
//   age?: number;
//   city?: string;
// }
```

### With nested objects

```typescript
const ProductRequest = httpRequest({
  body: {
    name: t.string,
    price: t.number,
    details: optional(
      t.type({
        description: t.string,
        dimensions: t.type({
          width: t.number,
          height: t.number,
          depth: t.number,
        }),
      }),
    ),
  },
});

// Includes an optional details object in the decoded type
```

## Use the optionalize combinator

Define object types with both required and optional properties easily using the
`optionalize` combinator.

### Basic usage

```typescript
import { optionalize } from '@api-ts/io-ts-http';

const UserProfile = optionalize({
  id: t.string,
  name: t.string,
  email: t.string,
  phone: t.union([t.string, t.undefined]), // Optional
  address: t.union([
    t.type({
      street: t.string,
      city: t.string,
    }),
    t.undefined,
  ]), // Optional
});

// Decoded type:
// {
//   id: string;
//   name: string;
//   email: string;
//   phone?: string;
//   address?: {
//     street: string;
//     city: string;
//   };
// }
```

### Combine with optional

Make your code more readable by using `optionalize` with `optional`:

```typescript
const UserProfile = optionalize({
  id: t.string,
  name: t.string,
  email: t.string,
  phone: optional(t.string),
  address: optional(
    t.type({
      street: t.string,
      city: t.string,
    }),
  ),
});

// Same decoded type as above, but clearer intent
```

## Use the flattened combinator

Decode nested objects into a flat structure, or encode flat objects into a nested
structure with the `flattened` combinator.

### Basic usage

```typescript
import { flattened } from '@api-ts/io-ts-http';

const NestedRequest = flattened({
  user: {
    id: t.string,
    name: t.string,
  },
  metadata: {
    createdAt: DateFromISOString,
    updatedAt: DateFromISOString,
  },
});

// Input when encoding:
// {
//   id: 'user123',
//   name: 'John Doe',
//   createdAt: new Date(),
//   updatedAt: new Date(),
// }

// Output after encoding:
// {
//   user: {
//     id: 'user123',
//     name: 'John Doe',
//   },
//   metadata: {
//     createdAt: '2023-01-01T00:00:00.000Z',
//     updatedAt: '2023-01-02T00:00:00.000Z',
//   },
// }
```

### With httpRequest

Organize related properties in `httpRequest` using the `flattened` combinator:

```typescript
const OrderRequest = httpRequest({
  params: {
    orderId: t.string,
  },
  body: flattened({
    customer: {
      name: t.string,
      email: t.string,
    },
    shipping: {
      address: t.string,
      city: t.string,
      zipCode: t.string,
    },
    payment: {
      method: t.union([t.literal('credit'), t.literal('debit'), t.literal('paypal')]),
      amount: t.number,
    },
  }),
});

// Decoded type:
// {
//   orderId: string;
//   name: string;
//   email: string;
//   address: string;
//   city: string;
//   zipCode: string;
//   method: 'credit' | 'debit' | 'paypal';
//   amount: number;
// }
```

## Real-world examples

### Create a user registration API

```typescript
import * as t from 'io-ts';
import { httpRoute, httpRequest, optional, optionalize } from '@api-ts/io-ts-http';

const RegisterUserRoute = httpRoute({
  path: '/users',
  method: 'POST',
  request: httpRequest({
    body: optionalize({
      username: t.string,
      email: t.string,
      password: t.string,
      fullName: optional(t.string),
      preferences: optional(
        t.type({
          theme: t.union([t.literal('light'), t.literal('dark')]),
          language: t.string,
        }),
      ),
    }),
  }),
  response: {
    201: t.type({
      id: t.string,
      username: t.string,
      email: t.string,
    }),
    400: t.type({
      error: t.string,
    }),
  },
});
```

### Create a search API with multiple parameters

```typescript
const ProductSearchRoute = httpRoute({
  path: '/products/search',
  method: 'GET',
  request: httpRequest({
    query: optionalize({
      query: t.string,
      category: optional(t.string),
      minPrice: optional(NumberFromString),
      maxPrice: optional(NumberFromString),
      sort: optional(
        t.union([
          t.literal('price_asc'),
          t.literal('price_desc'),
          t.literal('newest'),
          t.literal('popular'),
        ]),
      ),
      page: optional(NumberFromString),
      limit: optional(NumberFromString),
    }),
  }),
  response: {
    200: t.type({
      products: t.array(
        t.type({
          id: t.string,
          name: t.string,
          price: t.number,
          // Other product fields
        }),
      ),
      total: t.number,
      page: t.number,
      pages: t.number,
    }),
  },
});
```

## Summary

The combinators in `io-ts-http` help you define complex API specifications while keeping
your code readable and maintainable. Use these combinators to create type-safe API
contracts that accurately represent your application's requirements.
