# SuperagentRequestFactory

The `superagentRequestFactory` function creates a request factory function for making
HTTP requests. This factory works with `buildApiClient` and uses `superagent` to handle
the requests.

## Syntax

```typescript
import * as superagent from 'superagent';

// Function type returned by superagentRequestFactory
type RequestFactory = (
  method: string,
  path: string,
  options?: { params?: any; query?: any; headers?: any; body?: any },
) => superagent.SuperAgentRequest;

function superagentRequestFactory(
  agent: superagent.SuperAgentStatic | superagent.SuperAgent<any>,
  baseUrl: string,
): RequestFactory;
```

## Parameters

- `agent`: The superagent library object or a pre-configured superagent instance.

  - Type: `superagent.SuperAgentStatic | superagent.SuperAgent<any>`
  - Example: `superagent` or a custom agent

- `baseUrl`: The base URL prepended to all request paths defined in the API
  specification.
  - Type: `string`
  - Example: `"http://api.example.com/v1"`

## Return Value

- A request factory function that `buildApiClient` uses to initiate HTTP requests.
  - Type: `RequestFactory`
  - Takes HTTP method, path template, and request data (params, query, headers, body).
  - Returns a `superagent` request object.

## Example

```typescript
import * as superagent from 'superagent';
import { superagentRequestFactory } from '@api-ts/superagent-wrapper';
import { buildApiClient } from '@api-ts/superagent-wrapper';
import { myApiSpec } from './my-api-spec';

// Create a request factory with the base URL
const requestFactory = superagentRequestFactory(
  superagent,
  'https://api.example.com/v1',
);

// Build the API client
const apiClient = buildApiClient(requestFactory, myApiSpec);

// Now you can use apiClient to make HTTP requests to the API
```
