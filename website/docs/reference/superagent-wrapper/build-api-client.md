# BuildApiClient

The `buildApiClient` function creates a type-safe API client by combining a request
factory and an API specification.

## Syntax

```typescript
import { ApiSpec } from '@api-ts/io-ts-http';

function buildApiClient<T extends ApiSpec>(
  requestFactory: RequestFactory,
  apiSpec: T,
): ApiClient<T>;

// Types used by buildApiClient
type RequestFactory = (method: string, path: string, options?: any) => any; // Returns a superagent/supertest request

// ApiClient structure based on the input ApiSpec 'T'
type ApiClient<T extends ApiSpec> = {
  [OperationName in keyof T]: {
    [MethodName in keyof T[OperationName]]: (
      props: any, // Inferred from T[OperationName][MethodName]['request']
    ) => PreparedRequest<T[OperationName][MethodName]>;
  };
};

// Response types
type ApiResponse<RouteDef> = {
  status: number;
  body: any;
  // Additional properties from the response
};

type SpecificApiResponse<RouteDef, Status extends number> = {
  status: Status;
  body: any;
  // Additional properties from the response
};

// Object returned before executing the request
type PreparedRequest<RouteDef> = {
  decode: () => Promise<ApiResponse<RouteDef>>;
  decodeExpecting: (status: number) => Promise<SpecificApiResponse<RouteDef, number>>;
};
```

## Parameters

- `requestFactory`: A function that creates HTTP requests.

  - Type: `RequestFactory`
  - Source: Returned by `superagentRequestFactory` or `supertestRequestFactory`.

- `apiSpec`: An object that defines the API structure, routes, requests, and responses.
  - Type: `ApiSpec`
  - Source: Created using `@api-ts/io-ts-http`'s `apiSpec` function.

## Return Value

- A strongly-typed object representing the API client.
  - Type: `ApiClient<T>`
  - See [API Client Usage](./api-client) for details on structure and methods.

## Example

```typescript
import { superagentRequestFactory, buildApiClient } from '@api-ts/superagent-wrapper';
import * as superagent from 'superagent';
import { apiSpec } from './my-api-spec';

// Create a request factory
const requestFactory = superagentRequestFactory(
  superagent,
  'https://api.example.com/v1',
);

// Build the API client
const apiClient = buildApiClient(requestFactory, apiSpec);

// Use the client to make type-safe API calls
const response = await apiClient.users.get({ id: 123 }).decode();
```
