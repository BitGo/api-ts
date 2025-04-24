# `TypedRequestHandler` Type

A TypeScript helper type provided by `@api-ts/typed-express-router` to help you define
Express route handlers with correctly inferred types for the augmented `request` and
`response` objects.

**Purpose:**

When defining handlers for "checked" routes (such as using `typedRouter.get(...)`), this
type automatically infers:

- The type of `req.decoded` based on the `request` codec of the specific `httpRoute`
  linked via the `operationName`.
- The type signature of `res.sendEncoded`, ensuring the `payload` type is checked
  against the appropriate `response` codec for the given `status` code from the
  `httpRoute`.

**Definition (Conceptual):**

```typescript
import express from 'express';
import { HttpRoute } from '@api-ts/io-ts-http'; // Conceptual import
import * as t from 'io-ts'; // For TypeOf and OutputOf

// RouteDefinition represents the specific httpRoute object from the ApiSpec
// e.g., MyApi['my.operation']['get']
type RouteDefinition = HttpRoute<any, any>;

// Extracts the decoded request type from the route's request codec
type DecodedRequest<R extends RouteDefinition> = t.TypeOf<R['request']>;

// Represents the augmented response object
type TypedResponse<R extends RouteDefinition> = express.Response & {
  sendEncoded<Status extends keyof R['response'] & number>( // Status must be a key in response obj
    status: Status,
    // Payload type must match the codec for the given status
    payload: t.TypeOf<R['response'][Status]>,
  ): TypedResponse<R>; // Allows chaining like standard Express res
};

export type TypedRequestHandler<RouteDef extends RouteDefinition = any> = (
  req: express.Request & { decoded: DecodedRequest<RouteDef> },
  res: TypedResponse<RouteDef>,
  next: express.NextFunction,
) => void | Promise<void>; // Allow async handlers
```

(Note: The actual implementation may involve more complex generic constraints)

**Usage:** Import the type and use it when defining your handler functions. Provide the
specific `httpRoute` definition type from your imported `ApiSpec` as the generic
argument.

```typescript
import express from 'express';
import { TypedRequestHandler } from '@api-ts/typed-express-router';
import { MyApi } from 'my-api-package'; // Your generated ApiSpec object

// Define the type for the specific route handler
type HelloWorldRouteHandler = TypedRequestHandler<MyApi['hello.world']['get']>;
//                                             ^------------------------------^
//         Generic argument points to the specific httpRoute definition in the spec

const handler: HelloWorldRouteHandler = (req, res, next) => {
  // req.decoded is strongly typed based on MyApi['hello.world']['get'].request
  const name = req.decoded.name || 'World';

  // Payload for status 200 is type-checked against MyApi['hello.world']['get'].response[200]
  res.sendEncoded(200, { message: `Hello, ${name}!` });

  // If status 400 was defined in the spec with a different payload type:
  // const errorPayload = { error: 'Missing name' };
  // res.sendEncoded(400, errorPayload); // This would also be type-checked
};

// Use the handler
// typedRouter.get('hello.world', [handler]);
```

Using `TypedRequestHandler` significantly improves your developer experience by
providing type safety and autocompletion for the decoded request properties and the
`sendEncoded` payload within route handlers.
