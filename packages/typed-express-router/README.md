# @api-ts/typed-express-router

A thin wrapper around Express's `Router`

## Goals

- Define Express routes that are associated with routes in an api-ts `apiSpec`
- Augment the existing Express request with the decoded request object and api-ts route
  metadata
- Augment the existing Express response with a type-checked `encode` function
- Allow customization of what to do on decode/encode errors, per-route if desired
- Allow action to be performed after an encoded response is sent, per-route if desired
- Allow routes to define alias routes with path that is different than the one specified
  in the `httpRoute`
- Follow the express router api as closely as possible otherwise

## Non-Goals

- Enforce that all routes listed in an `apiSpec` have an associated route handler
- Layer anything on top of the `express.RequestHandler[]` chain beyond the additional
  properties described in `Goals` (projects and other libraries can do this)

## Usage

### Creating a router

Two very similar functions are provided by this library that respectively create or wrap
an Express router:

```ts
import { createRouter, wrapRouter } from '@api-ts/typed-express-router';
import express from 'express';

import { MyApi } from 'my-api-package';

const app = express();

const typedRouter = createRouter(MyApi);
app.use(typedRouter);
```

### Adding routes

Once you have the `typedRouter`, you can start adding routes by the api-ts api name:

```ts
typedRouter.get('hello.world', [HelloWorldHandler]);
```

Here, `HelloWorldHandler` is a almost like an Express request handler, but `req` and
`res` have an extra property. `req.decoded` contains the validated and decoded request.
On the response side, there is an extra `res.sendEncoded(status, payload)` function that
will enforce types on the payload and encode types appropriately (e.g.
`BigIntFromString` will be converted to a string). The exported `TypedRequestHandler`
type may be used to infer the parameter types for these functions.

### Route aliases

If more flexibility is needed in the route path, a `routeAliases` function may be
provided to match multiple paths. These paths may use the full Express matching syntax,
but take care to preserve any path parameters or else you will likely get decode errors.

```ts
typedRouter.get('hello.world', [HelloWorldHandler], {
  routeAliases: ['/oldDeprecatedHelloWorld'],
});
```

### Hooks and error handlers

The `createRouter`, `wrapRouter`, and individual route methods all take an optional last
parameter where a post-response and error handling function may be provided. Ones
specified for a specific route take precedence over the top-level ones. These may be
used to customize error responses and perform other actions like metrics collection or
logging.

```ts
const typedRouter = createRouter(MyApi, {
  decodeErrorFormatter: (errs, req) => {
    // Format `errs` however you want
    return { message: 'Bad request' };
  },
  getDecodeErrorStatusCode: (errs, req) => {
    return 400;
  },
  encodeErrorFormatter: (err, req) => {
    return { message: 'Internal server error' };
  },
  getEncodeErrorStatusCode: (err, req) => {
    // Ideally won't happen unless type safety is violated, so it's a 500
    return 500;
  },
  afterEncodedResponseSent: (status, payload, req, res) => {
    // Perform side effects or other things, `res` should be ended by this point
    endRequestMetricsCollection(req);
  },
});

// Override the decode error handler on one route
typedRouter.get('hello.world', [HelloWorldHandler], {
  decodeErrorFormatter: customHelloDecodeErrorFormatter,
});
```

### Unchecked routes

If you need custom behavior on decode errors that is more involved than just sending an
error response, then the unchecked variant of the router functions can be used. They do
not fail and send a http response using `decodeErrorFormatter` and
`getDecodeErrorStatusCode` when a request is invalid. Instead, they will still populate
`req.decoded`, except this time it'll contain the `Either<Errors, DecodedRequest>` type
for route handlers to inspect.

```ts
// Just a normal express route
typedRouter.getUnchecked('hello.world', (req, res) => {
  if (E.isLeft(req.decoded)) {
    console.warn('Route failed to decode! Continuing anyway');
  })

  res.send(200).end();
});
```

### Router middleware

Middleware added with `typedRouter.use()` is ran just after the request is decoded but
before it is validated, even on checked routes. It'll have access to `req.decoded` in
the same way that unchecked routes do.

### Other usage

Other than what is documented above, a wrapped router should behave like a regular
Express one, so things like `typedRouter.use()` should behave the same.
