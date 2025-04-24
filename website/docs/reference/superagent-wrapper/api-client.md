# API Client Usage

This page describes the structure and methods of the type-safe API client object that
the [`buildApiClient`](./build-api-client) function returns.

## `ApiClient` Object Structure

The `buildApiClient` function returns an object that provides a type-safe interface to
interact with the API defined in the `apiSpec`.

**Structure:**

- **Top-level Keys:** Match the operation names (strings) defined as the top-level keys
  in the input `apiSpec`.
- **Nested Keys:** Under each operation name key, the keys match the HTTP methods (e.g.,
  `'get'`, `'put'`) defined for that operation in the `apiSpec`.
- **Method Functions:** The value associated with each HTTP method key is a function
  representing the API call for that specific route.

## Operation Method (e.g., `client[opName].method(props)`)

**Parameters:**

- `props` (Object): A single argument object. Its type is inferred from the _decoded
  type_ of the `request` codec associated with this specific route
  (`apiSpec[opName][method].request`). This object contains the combined, flattened
  properties expected by the route (path params, query params, headers, body properties
  all merged into one object). The `superagent-wrapper` handles encoding this object and
  placing the properties into the correct parts of the HTTP request (path, query, body,
  etc.) based on the `httpRequest` definition.

**Return Value:**

- `PreparedRequest`: An object containing the `.decode()` and `.decodeExpecting()`
  methods for executing the request and handling the response.

**Example Access:**

```typescript
declare const apiClient: any; // Assume apiClient was built previously
// Assuming apiClient has type ApiClient<ExampleAPI> from the README example

const putRequest = apiClient['api.example'].put({
  // Type-checked against { id: number; example: { foo: string; bar: number; } }
  id: 123,
  example: { foo: 'data', bar: 456 },
});
// putRequest now holds an object with .decode() and .decodeExpecting() methods
```

## `PreparedRequest` Methods

You can use these methods on the object that is returned after you call an operation
method (like `apiClient['op'].put(...)`) but before the request is executed.

### `.decode()`

Executes the configured HTTP request and attempts to decode the response body based on
the received status code and the `response` codecs defined in the corresponding
`httpRoute`.

**Signature:**

```typescript
// Conceptual representation - RouteDef would be the specific route definition type
type ApiResponse<RouteDef> = {
    status: number;
    body: /* Union of all possible decoded response types for RouteDef | unknown */ any;
    // Potentially other properties from superagent response (headers, etc.)
    [key: string]: any; // To represent potential superagent pass-throughs
};

// Method signature on the PreparedRequest object
// decode: () => Promise<ApiResponse</* Corresponding Route Definition */>>;
decode(): Promise<ApiResponse<any>>; // Use 'any' if RouteDef is too complex to represent here
```

**Parameters:**

- `expectedStatus` (`number`): The specific HTTP status code that is expected in the
  response. This status code must be one of the keys defined in the `response` object of
  the corresponding `httpRoute`.

**Behavior:**

1. Sends the HTTP request.
2. Receives the HTTP response.
3. Compares the received status code with expectedStatus.
4. If status matches expectedStatus: Attempts to decode the response body using the
   io-ts codec associated with expectedStatus in the httpRoute.
   - If decoding succeeds, the Promise resolves with the SpecificApiResponse object.
   - If decoding fails, the Promise is rejected with an error.
5. If status does not match expectedStatus: The Promise is rejected with an error
   indicating the status code mismatch.

**Return Value:**

- `Promise<SpecificApiResponse>`: A Promise that resolves with a `SpecificApiResponse`
  object only if the received status matches `expectedStatus` and the body is
  successfully decoded according to the corresponding codec. The `body` type in the
  resolved object is narrowed specifically to the type defined for `expectedStatus`. If
  the conditions are not met, the Promise rejects.

## Response Object Structure (`ApiResponse` / `SpecificApiResponse`)

This is the object type that the Promises returned from `.decode()` and
`.decodeExpecting()` resolve to.

**Properties:**

- `status` (`number`): The HTTP status code received from the server.
- `body` (`DecodedType | unknown`): The response body.
  - For `.decode()`: The type is a union of all possible types successfully decoded
    based on the status codes defined in the `httpRoute['response']` object. If the
    status code was not defined or decoding failed, it might be `unknown` or hold raw
    response data/error info.
  - For `.decodeExpecting(status)`: The type is narrowed to the specific decoded type
    associated with the `status` key in `httpRoute['response']`.

**Type Narrowing:** TypeScript can effectively narrow the type of the `body` property
when using conditional checks on the `status` property, especially after using
`.decode()`:

```typescript
declare const apiClient: any; // Assume apiClient was built previously
// Assuming apiClient has type ApiClient<ExampleAPI> from the README example

async function exampleUsage() {
  const response = await apiClient['api.example']
    .put({ id: 1, example: { foo: '', bar: 0 } })
    .decode();

  if (response.status === 200) {
    // response.body is now typed as the decoded type for status 200 (Example)
    console.log(response.body.foo);
  } else if (response.status === 400) {
    // response.body is now typed as the decoded type for status 400 (GenericAPIError)
    console.log(response.body.message);
  } else {
    // response.body might be unknown or some other type
    const maybeError = response.body as any;
    if (maybeError?.message) {
      console.error('Unknown error:', maybeError.message);
    }
  }
}
```
