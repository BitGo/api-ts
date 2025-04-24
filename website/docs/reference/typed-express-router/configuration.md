# Configuration Options

You can provide configuration options, primarily hooks for handling errors and
post-response actions, globally when creating/wrapping a router or on a per-route basis.
Per-route options override global ones.

## Global Options (`TypedRouterOptions`)

Passed as the optional second argument to [`createRouter`](./create-router) or the
optional third argument to [`wrapRouter`](./wrap-router).

```typescript
import express from 'express';
import * as t from 'io-ts'; // For Errors type
import { ApiSpec } from '@api-ts/io-ts-http'; // Conceptual

// Simplified representation of hook signatures
type DecodeErrorHandler<Req = any, Res = any> = (
  errors: t.Errors,
  req: express.Request & { decoded?: any }, // May not have decoded fully
  res: express.Response & { sendEncoded?: any },
  next: express.NextFunction,
) => void;

type EncodeErrorHandler<Req = any, Res = any> = (
  error: unknown, // The error during encoding/validation
  req: express.Request & { decoded?: any },
  res: express.Response & { sendEncoded?: any },
  next: express.NextFunction,
) => void;

type AfterResponseHandler<Req = any, Res = any> = (
  status: number,
  payload: any, // The successfully encoded payload
  req: express.Request & { decoded?: any },
  res: express.Response & { sendEncoded?: any },
) => void;

export type TypedRouterOptions<T extends ApiSpec = any> = {
  onDecodeError?: DecodeErrorHandler;
  onEncodeError?: EncodeErrorHandler;
  afterEncodedResponseSent?: AfterResponseHandler;
};
```

- `onDecodeError(errors, req, res, next)`:
  - **Triggered**: When using a "checked" route method (such as `.get`) and the incoming
    request fails decoding or validation against the `httpRoute`'s `request` codec.
  - **Purpose**: Allows custom formatting and sending of error responses (such as 400
    Bad Request). If not provided, a default basic error handler might be used or the
    error might propagate.
  - `errors`: The `t.Errors` array from `io-ts` detailing the validation failures.
  - **Note**: You typically end the response (`res.status(...).json(...).end()`) within
    this handler. Calling `next()` might lead to unexpected behavior.
- `onEncodeError(error, req, res, next)`:
  - **Triggered**: When `res.sendEncoded(status, payload)` is called, but the provided
    `payload` fails validation against the `httpRoute`'s `response` codec for the given
    `status`.
  - **Purpose**: Handles server-side errors where the application tries to send data
    inconsistent with the API specification. This usually indicates a bug.
  - `error`: The validation error encountered.
  - **Note**: You typically send a 500 Internal Server Error response here and should
    end the response.
- `afterEncodedResponseSent(status, payload, req, res)`:
  - **Triggered**: After `res.sendEncoded(status, payload)` has successfully validated,
    encoded, and finished sending the response.
  - **Purpose**: Lets you perform side-effects after a successful response, such as
    logging, metrics collection, cleanup, etc.
  - `status`: The status code that was sent.
  - `payload`: The original (pre-encoding) payload object that was sent.
  - **Note**: The response stream (`res`) is likely ended at this point. Don't attempt
    to send further data.

## Per-Route Options (`RouteOptions`)

Pass these as the optional third argument to the route definition methods (such as
`typedRouter.get(..., ..., routeOptions)`).

```typescript
// RouteOptions includes the global hooks plus routeAliases
export type RouteOptions<RouteDef = any> = TypedRouterOptions & {
  routeAliases?: string[];
};
```

- `onDecodeError` / `onEncodeError` / `afterEncodedResponseSent`: Same hooks as the
  global options, but these versions apply only to the specific route they're defined on
  and take precedence over any global hooks defined via `createRouter` or `wrapRouter`.
- `routeAliases` (`string[]`):
  - An array of additional path strings that should also map to this route handler.
  - Uses Express path syntax (such as `/path/:param`).
  - See [`TypedRouter` Object](./typed-router) for more details and caveats regarding
    path parameters.

## Example (Global and Per-Route):

```typescript
import { createRouter } from '@api-ts/typed-express-router';
import { MyApi } from 'my-api-package';

// Global options
const typedRouter = createRouter(MyApi, {
  onDecodeError: globalDecodeErrorHandler,
  afterEncodedResponseSent: globalMetricsHandler,
});

// Per-route options overriding global and adding alias
typedRouter.get('some.operation', [myHandler], {
  routeAliases: ['/legacy/path'],
  onDecodeError: specificDecodeErrorHandler, // Overrides globalDecodeErrorHandler for this route
  // afterEncodedResponseSent is inherited from global options
});

typedRouter.post('another.operation', [otherHandler], {
  // Inherits onDecodeError from global options
  // No afterEncodedResponseSent hook will run for this route
  afterEncodedResponseSent: undefined, // Explicitly disable global hook for this route
});
```
