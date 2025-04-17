---
sidebar_position: 2
---

# `apiSpec`

### Overview

A helper function that defines a collection of HTTP routes, associating them with
operation names to represent a service's complete API contract. Primarily serves as a
typed container for `httpRoute` definitions.

### Specification

Accepts a single argument: an object where keys represent operation names (e.g.,
`'api.v1.user'`) and values are objects that map HTTP methods (lowercase strings like
`'get'`, `'post'`) to corresponding `httpRoute` definitions.

### Metadata

`@version`: A JSDoc tag added to the exported `apiSpec` variable declaration that will
be used as the API `version` property when generating artifacts like OpenAPI schemas.

### Usage Example

```typescript
import { apiSpec } from '@api-ts/io-ts-http';
import * as t from 'io-ts'; // Assuming base io-ts types are needed elsewhere
import { httpRoute, httpRequest } from '@api-ts/io-ts-http'; // Assuming httpRoute/Request defined here or imported

// Assume GetUser, CreateUser etc. are pre-defined httpRoute objects
import { GetUser, CreateUser, UpdateUser, DeleteUser, PatchUser } from './routes/user';
import { GetMessage, CreateMessage } from './routes/message';

/**
 * Example service API definition.
 * @version 1.0.0
 */
export const API = apiSpec({
  'api.v1.message': {
    get: GetMessage,
    post: CreateMessage,
  },
  'api.v1.user': {
    get: GetUser,
    post: CreateUser,
    put: UpdateUser,
    delete: DeleteUser,
    patch: PatchUser,
  },
});
```
