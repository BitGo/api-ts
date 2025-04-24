# `createRouter`

Creates a new Express Router instance that's typed according to a provided
`@api-ts/io-ts-http` API specification.

**Signature:**

```typescript
import express from 'express';
import { ApiSpec } from '@api-ts/io-ts-http'; // Conceptual import
import { TypedRouter } from './typed-router'; // Conceptual import of the return type
import { TypedRouterOptions } from './configuration'; // Conceptual import

declare function createRouter<T extends ApiSpec>(
  apiSpec: T,
  options?: TypedRouterOptions<T>, // Global options/hooks
): TypedRouter<T>; // Returns the specialized router object
```

**Parameters:**

- `apiSpec` (`ApiSpec`): An API specification object created using
  `@api-ts/io-ts-http`'s `apiSpec` function. This defines the routes that you can attach
  to this router.
- `options` (Optional `TypedRouterOptions<T>`): An optional object containing global
  configuration hooks for error handling and post-response actions. See
  [Configuration Options](./configuration) for details.

**Return Value:**

- `TypedRouter<T>`: A specialized Express Router instance. This object has methods (like
  `.get`, `.post`) that accept operation names from the `apiSpec` and provide augmented
  `req` and `res` objects to the handlers. See [`TypedRouter` Object](./typed-router)
  for details.

**Usage Example:**

```typescript
import express from 'express';
import { createRouter } from '@api-ts/typed-express-router';
import { MyApi } from 'my-api-package'; // Your apiSpec import

const app = express();
const typedRouter = createRouter(MyApi, {
  // Optional global configuration
  onDecodeError: (errs, req, res, next) => {
    res.status(400).json({ error: 'Invalid request format', details: errs });
  },
});

app.use('/api', typedRouter); // Mount the typed router
```
