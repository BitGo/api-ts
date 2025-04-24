# SupertestRequestFactory

The `supertestRequestFactory` function creates a request factory function for testing
HTTP servers. This factory works with `buildApiClient` and uses `supertest` to make HTTP
requests.

## Syntax

```typescript
import * as supertest from 'supertest';
import * as superagent from 'superagent';

// Function type returned by supertestRequestFactory
type RequestFactory = (
  method: string,
  path: string,
  options?: { params?: any; query?: any; headers?: any; body?: any },
) => superagent.SuperAgentRequest; // supertest uses superagent requests internally

function supertestRequestFactory(
  request: supertest.SuperTest<supertest.Test>,
): RequestFactory;
```

## Parameters

- `request`: The request function created by initializing `supertest` with an HTTP
  server or app instance.
  - Type: `supertest.SuperTest<supertest.Test>`
  - Example: `supertest(app)`

## Return Value

- A request factory function that `buildApiClient` uses to initiate HTTP requests.
  - Type: `RequestFactory`
  - Integrates with the provided `supertest` request function.

## Example

```typescript
import * as supertest from 'supertest';
import { supertestRequestFactory } from '@api-ts/superagent-wrapper';
import { buildApiClient } from '@api-ts/superagent-wrapper';
import { myApiSpec } from './my-api-spec';
import express from 'express';

// Create an Express app
const app = express();

// Initialize supertest with the app
const request = supertest(app);

// Create a request factory
const requestFactory = supertestRequestFactory(request);

// Build the API client
const apiClient = buildApiClient(requestFactory, myApiSpec);

// Now you can use apiClient for testing your Express app
```
