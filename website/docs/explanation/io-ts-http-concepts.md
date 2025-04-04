---
sidebar_position: 2
---

# Understanding io-ts-http

## Introduction

Use `io-ts-http` as the definition language for api-ts specifications. It helps you
define precise API contracts for web servers. This article explains the key concepts and
design principles behind `io-ts-http`.

## Core concepts

### API contract as a type system

Express your API contract through TypeScript's type system with runtime validation using
`io-ts`. This approach offers three main benefits:

1. **Type safety**: Use the same types for both clients and servers to ensure
   compatibility.
2. **Runtime validation**: Validate data at runtime, unlike TypeScript's types which are
   erased during compilation.
3. **Parse, don't validate**: Not only validate input but also parse it into the correct
   shape and types.

### Building blocks

`io-ts-http` has three main components:

1. **`apiSpec`**: Create the top-level definition of your API and organize routes under
   operation names.
2. **`httpRoute`**: Define individual routes with their paths, methods, request schemas,
   and response schemas.
3. **`httpRequest`**: Specify the expected shape of HTTP requests, including parameters,
   query strings, headers, and bodies.

## How it works

When you define an API with `io-ts-http`, you create a specification that works in
multiple ways:

1. **Server-side**: Validate and parse incoming requests to ensure they match your API
   contract.
2. **Client-side**: Ensure requests are properly formed before sending them to the
   server.
3. **Documentation**: Generate API documentation such as OpenAPI specifications.

The same specification works everywhere, eliminating discrepancies between your
implementation and documentation.

### Property flattening

Property flattening is an important concept in `io-ts-http`. When you decode HTTP
requests, the system flattens properties from different sources (path parameters, query
parameters, headers, and body) into a single object.

For example, if you have:

- A path parameter `id`
- A query parameter `filter`
- A body with properties `name` and `email`

The decoded object becomes:

```typescript
{
  id: string,
  filter: string,
  name: string,
  email: string
}
```

This makes it easier to work with the data without accessing different parts of the
request separately.

## Design principles

### 1. Type safety first

`io-ts-http` prioritizes type safety. It uses `io-ts` codecs to ensure your API
contracts are type-checked at compile time and validated at runtime.

### 2. Separation of concerns

The library separates:

- Defining what your API looks like (`apiSpec` and `httpRoute`)
- Defining how requests and responses should be structured (`httpRequest`)
- Processing HTTP requests and responses (handled by other packages)

### 3. Flexibility

`io-ts-http` is flexible. It doesn't dictate how to implement your server or client—only
how to define your API contract. You can use it with any HTTP framework or client
library.

## When to use io-ts-http

Use `io-ts-http` when you need to:

1. Build a TypeScript API with type safety between client and server
2. Validate complex request structures with nested objects, arrays, or optional fields
3. Generate documentation from your code to keep it current
4. Implement the "Parse, Don't Validate" pattern for robust error handling

## Conclusion

`io-ts-http` offers a powerful way to define type-safe API contracts for your entire
application stack. By centralizing your API definition in a single source of truth, you
can ensure consistency and reduce errors in your application.
