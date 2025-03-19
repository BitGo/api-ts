# @api-ts/jsonapi-error-reporter

An io-ts path reporter that formats validation errors according to the
[JSON API error specification](https://jsonapi.org/format/#errors).

## Installation

```bash
npm install @api-ts/jsonapi-error-reporter
```

## Usage

### Basic Usage

```typescript
import * as t from 'io-ts';
import { JSONAPIErrorReporter } from '@api-ts/jsonapi-error-reporter';

// Define an io-ts codec
const User = t.type({
  name: t.string,
  age: t.number,
  email: t.string,
});

// Validate some data
const result = User.decode({
  name: 123, // Should be a string
  age: '42', // Should be a number
  email: null, // Should be a string
});

if (result._tag === 'Left') {
  // Format errors using JSON API format
  const errorResponse = JSONAPIErrorReporter.report(result.left);
  console.log(JSON.stringify(errorResponse, null, 2));
  // {
  //   "errors": [
  //     {
  //       "status": "422",
  //       "title": "Validation Error",
  //       "detail": "Expected name to be string, but got number (123)",
  //       "source": {
  //         "pointer": "/name"
  //       }
  //     },
  //     {
  //       "status": "422",
  //       "title": "Validation Error",
  //       "detail": "Expected age to be number, but got string (42)",
  //       "source": {
  //         "pointer": "/age"
  //       }
  //     },
  //     {
  //       "status": "422",
  //       "title": "Validation Error",
  //       "detail": "Expected email to be string, but got object (null)",
  //       "source": {
  //         "pointer": "/email"
  //       }
  //     }
  //   ]
  // }
}
```

### Express Integration

You can use the `createJSONApiRouter` function to create an Express router with JSON API
error handling:

```typescript
import express from 'express';
import { apiSpec, httpRoute } from '@api-ts/io-ts-http';
import { createJSONApiRouter } from '@api-ts/jsonapi-error-reporter';

// Define your API spec
const MyApi = apiSpec({
  // ...
});

// Create an Express app
const app = express();
app.use(express.json());

// Create the router with JSON API error handling
const router = createJSONApiRouter({
  spec: MyApi,
  handlers: {
    // Your route handlers...
  },
});

// Mount the router
app.use('/api', router);

// Start the server
app.listen(3000, () => {
  console.log('Server listening on port 3000');
});
```

### Custom Error Middleware

You can also use the `onDecodeError` middleware with the `typed-express-router`
directly:

```typescript
import { createRouter } from '@api-ts/typed-express-router';
import { onDecodeError } from '@api-ts/jsonapi-error-reporter';

const router = createRouter({
  spec: MyApi,
  handlers: {
    // Your route handlers...
  },
  onDecodeError,
});
```

## API Reference

### `JSONAPIErrorReporter`

The main reporter object with a `report` method that converts io-ts validation errors to
JSON API format.

### `onDecodeError`

Middleware for handling io-ts decode errors in Express applications.

### `errorHandler`

Express error handler middleware that formats errors according to JSON API
specification.

### `createJSONApiRouter`

Factory function that creates an Express router with JSON API error handling.

## License

Apache-2.0
