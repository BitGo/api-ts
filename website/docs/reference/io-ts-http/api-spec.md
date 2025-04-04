---
sidebar_position: 1
---

# apiSpec

Define a collection of routes and associate them with operation names.

## Usage

Create a top-level export using `apiSpec` to define your service's API as a collection
of operations linked to routes. This function enforces the correct type for the
parameter you pass to it.

```typescript
import { apiSpec } from '@api-ts/io-ts-http';

import { GetMessage, CreateMessage } from './routes/message';
import { GetUser, CreateUser, PatchUser, UpdateUser, DeleteUser } from './routes/user';

/**
 * Example service
 *
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

Other packages can read these API specs to:

- Create type-checked API clients
- Bind functions to routes with automatic parsing and validation
- Generate OpenAPI schemas

## Metadata

Add a `@version` JSDoc tag to the exported API spec to set the API version when
generating an OpenAPI schema. We may add support for more tags in the future.
