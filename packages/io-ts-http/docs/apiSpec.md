# `apiSpec`

Helper function for defining a collection of routes and associating them with operation
names.

## Usage

The intended usage is to create a top-level export that uses `apiSpec` to define a
service's API as a collection of operations linked to routes. This function itself does
not do anything aside from enforce the correct type of the parameter passed to it.

```typescript
import { apiSpec } from '@bitgo/io-ts-http';

import { GetMessage, CreateMessage } from './routes/message';
import { GetUser, CreateUser, UpdateUser, DeleteUser } from './routes/user';

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
  },
});
```

Other packages are designed to read these API specs for various purposes such as
creating a type-checked api client, binding functions to routes with automatic parsing
and validating, and generating things such as an OpenAPI schema.

## Metadata

Currently, if a `@version` JSDoc tag is added to the exported API spec, it will be used
as the API `version` when generating an OpenAPI schema. Support for other tags may be
added in the future.
