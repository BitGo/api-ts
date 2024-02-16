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
  onDecodeError: (errs, req, res) => {
    // Format `errs` however you want
    res.send(400).json({ message: 'Bad request' }).end();
  },
  onEncodeError: (err, req, res) => {
    // Ideally won't happen unless type safety is violated, so it's a 500
    res.send(500).json({ message: 'Internal server error' }).end();
  },
  afterEncodedResponseSent: (status, payload, req, res) => {
    // Perform side effects or other things, `res` should be ended by this point
    endRequestMetricsCollection(req);
  },
});

// Override the decode error handler on one route
typedRouter.get('hello.world', [HelloWorldHandler], {
  onDecodeError: customHelloDecodeErrorHandler,
});
```

### Transformations and error handlers

In order to decouple handlers from an API Spec, facilities are provided for applying
transformations to request body after they are decoded, and applying transformations to
response body before they are encoded.

```ts
// Create an error handler for errors that result while attempting transformation of a decoded request body
const transformReqErrHandler: OnRequestTransformErrorFn = (err: unknown, _req, res) => {
  res
    .status(500)
    .json({ errorName: 'TransformRequestError', error: E.toError(err).toString() })
    .end();
};

// Create an error handler for errors that result while attempting transformation of an unencoded response body
const transformResErrHandler: OnResponseTransformErrorFn = (
  err: unknown,
  _req,
  res,
) => {
  res
    .status(500)
    .json({ errorName: 'TransformResponseError', error: E.toError(err).toString() })
    .end();
};

// Override the default error handlers for all routes
const typedRouter = createRouter(MyApi, {
  onRequestTransformError: transformReqErrHandler,
  onResponseTransformError: transformResErrHandler,
});
```

We can now define routes with route-specific transformations. In the below example we
have defined an API Spec such that an `id` attribute of type `string` will be provided
to the handler, by default. By using a request transformer, we will transform this input
to `newIdIn` of type `string`, which will be provided to the handler instead.

```ts
type TransformedInput = { newIdIn: string };

const requestTransformer: RequestTypeTransformer<
  MyApiSpec, // Api Spec
  'hello.world', // API Name
  'get', // Method
  TransformedInput // Output of the transformation
> = (req): TransformedInput => {
  return { newIdIn: req.decoded.id };
};
```

Similarly, we will define a response transformer that will accept output from the
handler in the form of `newIdOut` of type `string` and provide `id` of type `string` to
the encoder instead.

```ts
// Input to the transformation function, per status, for a specific route (the output of the handler)
type TransformedResponses = { 200: { newIdOut: string } };

const responseTransformer: ResponseTypeTransformer<
  TestApiSpec, // Api Spec
  'hello.world', // Api Name
  'get', // Method
  TransformedInput, // Output of the request transformation
  TransformedResponses // Input to the transformation function
> = (
  _req,
  _status,
  payload,
): t.TypeOf<TestApiSpec['hello.world']['get']['response']['200']> => ({
  id: payload.newIdOut,
});
```

We can now define our handler as such:

```ts
const handler: TransformedRequestHandler<
  TestApiSpec,
  'hello.world',
  'get',
  TransformedInput,
  TransformedResponses
> = (req, res) => {
  res.sendEncoded(200, { newIdOut: req.transformed.newIdIn });
};
```

And finally specify the transformations for the route at definition time:

```ts
router.getTransformed(
  'hello.world',
  [{ requestTransformer, responseTransformer, handler }],
  {
    onRequestTransformError: transformReqErrHandler, // route-level override, optional
    onResponseTransformError: transformResErrHandler, // route-level override, optional
  },
);
```

### Unchecked routes

If you need custom behavior on decode errors that is more involved than just sending an
error response, then the unchecked variant of the router functions can be used. They do
not fail and call `onDecodeError` when a request is invalid. Instead, they will still
populate `req.decoded`, except this time it'll contain the
`Either<Errors, DecodedRequest>` type for route handlers to inspect.

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
