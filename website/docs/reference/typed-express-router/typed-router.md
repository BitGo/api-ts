# `TypedRouter` Object

The `TypedRouter` is the specialized Express Router object returned by
[`createRouter`](./create-router) and [`wrapRouter`](./wrap-router). It exposes methods
for defining routes that are linked to operations in an `ApiSpec`, providing type safety
for requests and responses.

It largely mirrors the standard `express.Router` API but provides typed versions of HTTP
method functions (`get`, `post`, `put`, `delete`, `patch`, etc.) and specialized
unchecked variants.

## Checked Route Methods

These methods (such as `.get`, `.post`, `.put`, etc.) add route handlers linked to a
specific operation name defined in the `ApiSpec`. They automatically handle request
decoding and validation based on the `httpRoute` definition.

**Signature Example (`.get`)**

```typescript
import { TypedRequestHandler } from './typed-request-handler';
import { RouteOptions } from './configuration';
import { ApiSpec } from '@api-ts/io-ts-http'; // Conceptual

type TypedRouter<T extends ApiSpec> = {
  get<OperationName extends keyof T & string>( // Restrict to string keys of the ApiSpec
    operationName: OperationName,
    handlers: Array<TypedRequestHandler<T[OperationName]['get']>>, // Type handlers based on the specific HttpRoute
    routeOptions?: RouteOptions<T[OperationName]['get']>,
  ): this;
  // Similar signatures for .post, .put, .delete, .patch, etc.
  // ... other express.Router methods like .use
};
```

**Parameters:**

- `operationName` (`string`): The key (operation name) from the `ApiSpec` corresponding
  to the `httpRoute` definition for this endpoint.
- `handlers` (`Array<TypedRequestHandler<...>>`): An array of one or more request
  handler functions. These handlers receive augmented `req` and `res` objects. See
  [Augmented Request & Response](./request-response) and `TypedRequestHandler`.
- `routeOptions` (Optional `RouteOptions<...>`): An optional object containing
  route-specific configuration, including `routeAliases` and hooks that override global
  ones. See [Configuration Options](./configuration).

**Behavior:**

1. The router registers the handlers for the path defined in the `httpRoute` associated
   with the `operationName`.
2. The router adds middleware internally to automatically decode and validate incoming
   requests against the `httpRoute`'s `request` codec.
3. If decoding/validation succeeds, the router populates `req.decoded` with the result
   and calls the provided `handlers`.
4. If decoding/validation fails, the router prevents the `handlers` from being called
   and invokes the `onDecodeError` hook (either route-specific or global).

**Route Aliases (`routeOptions.routeAliases`)**

- You can provide an array of alternative path strings in `routeOptions.routeAliases`.
  These paths will also route to the same handlers.
- These alias paths use standard Express path syntax (including parameters like `:id`).
- **Important**: Ensure any path parameters defined in the `httpRoute`'s original path
  are also present in the alias paths if your `request` codec expects them in
  `req.decoded.params`. If they're missing, decoding will likely fail.

**Example**

```typescript
// Route handles both '/api/v1/item/{id}' (from spec) and '/api/item/:id' (alias)
typedRouter.get('api.v1.getItem', [getItemHandler], {
  routeAliases: ['/api/item/:id'], // Express syntax for path param
});
```

## Unchecked Route Methods

These methods (such as `.getUnchecked`, `.postUnchecked`, etc.) also add route handlers
linked to an `ApiSpec` operation, but they don't automatically trigger the
`onDecodeError` hook if request decoding fails.

Signature Example (`.getUnchecked`)

```typescript
import express from 'express';
import { RouteOptions } from './configuration';
import { ApiSpec } from '@api-ts/io-ts-http'; // Conceptual
import * as E from 'fp-ts/Either';
import * as t from 'io-ts'; // For Errors type

type UncheckedRequestHandler = (
  req: express.Request & { decoded: E.Either<t.Errors, any> }, // req.decoded is Either
  res: express.Response & { sendEncoded: (...args: any[]) => void }, // res is still augmented
  next: express.NextFunction,
) => void;

type TypedRouter<T extends ApiSpec> = {
  getUnchecked<OperationName extends keyof T & string>(
    operationName: OperationName,
    handlers: Array<UncheckedRequestHandler>, // Use standard or custom handler type
    routeOptions?: RouteOptions<T[OperationName]['get']>,
  ): this;
  // Similar signatures for .postUnchecked, .putUnchecked, etc.
  // ...
};
```

**Behavior:**

1. The router registers handlers similarly to checked methods.
2. The router attempts to decode the request internally.
3. The router populates `req.decoded` with the result of the decoding attempt, which is
   of type `Either<Errors, DecodedRequest>` from `fp-ts/Either`. Errors is from `io-ts`.
4. The router always calls the provided `handlers`, regardless of whether decoding
   succeeded (`isRight`) or failed (`isLeft`).
5. The handler is responsible for checking the state of `req.decoded` using `E.isLeft`
   or `E.isRight` and acting accordingly.

**Use Case**: These methods let you handle invalid requests directly within the route
logic. You can log errors but still proceed, or return specific error formats without
relying on the global/route-specific `onDecodeError` hook.

## Middleware (`.use`)

Middleware added via `typedRouter.use()` functions similarly to standard Express
middleware.

**Behavior:**

- Middleware handlers registered with `.use` run after the initial request decoding
  attempt but before validation logic fully completes for checked routes.
- Middleware handlers have access to `req.decoded` containing the
  `Either<Errors, DecodedRequest>`, just like handlers added via `.getUnchecked`. This
  lets middleware inspect or react to the raw decoding result.

**Example:**

```typescript
typedRouter.use((req, res, next) => {
  // Can inspect the raw decode result here, even before checked routes
  if (req.decoded && E.isLeft(req.decoded)) {
    console.log('Middleware saw a decode failure');
  }
  next();
});
```

## Other Methods

The `TypedRouter` object is compatible with the standard `express.Router` interface for
methods not explicitly overridden (like `.param`, `.route`, etc.). However, only routes
added via the typed methods (`.get`, `.post`, `.getUnchecked`, etc.) benefit from the
automatic decoding, augmented req/res, and hook system provided by this library.
