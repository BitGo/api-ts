# `wrapRouter`

Wraps an existing Express Router instance, augmenting it with type-checking capabilities
based on a provided `@api-ts/io-ts-http` API specification. This lets you integrate
typed routes into an existing router setup.

**Signature:**

```typescript
import express from 'express';
import { ApiSpec } from '@api-ts/io-ts-http'; // Conceptual import
import { TypedRouter } from './typed-router'; // Conceptual import of the return type
import { TypedRouterOptions } from './configuration'; // Conceptual import

declare function wrapRouter<T extends ApiSpec>(
  router: express.Router, // The existing Express router
  apiSpec: T,
  options?: TypedRouterOptions<T>, // Global options/hooks
): TypedRouter<T>; // Returns the augmented router object
```

**Parameters:**

- `router` (`express.Router`): An existing instance of an Express Router.
- `apiSpec` (`ApiSpec`): An API specification object created using
  `@api-ts/io-ts-http`'s `apiSpec` function.
- `options` (Optional `TypedRouterOptions<T>`): An optional object containing global
  configuration hooks for error handling and post-response actions. These hooks apply
  only to routes added via the returned `TypedRouter` interface, not to routes already
  on the original router. See [Configuration Options](./configuration) for details.

**Return Value:**

- `TypedRouter<T>`: The same router instance passed in (`router`), but augmented with
  the typed methods (like `.get`, `.post`) described in
  [`TypedRouter` Object](./typed-router). Calling these typed methods adds routes linked
  to the `apiSpec`. The original router methods remain functional but without the typed
  features.

**Usage Example:**

```typescript
import express from 'express';
import { wrapRouter } from '@api-ts/typed-express-router';
import { MyApi } from 'my-api-package'; // Your apiSpec import

const app = express();
const existingRouter = express.Router();

// Add some non-typed routes
existingRouter.get('/status', (req, res) => res.send('OK'));

// Wrap the existing router
const typedRouter = wrapRouter(existingRouter, MyApi);

// Now add typed routes using the wrapped router
// typedRouter.get('my.api.operation', ...);

app.use('/api', typedRouter); // Mount the router (which is the original instance)
```
