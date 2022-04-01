# @api-ts/superagent-wrapper

Combines an api spec with `superagent`/`supertest` to create a type-checked api client.

## Getting started

First, either define or import an `io-ts-http` api spec. The following one will be used
for this guide:

```typescript
import * as h from '@api-ts/io-ts-http';
import * as t from 'io-ts';
import { NumberFromString } from 'io-ts-types';

export const Example = t.type({
  foo: t.string,
  bar: t.number,
});

export const GenericAPIError = t.type({
  message: t.string,
});

export const PutExample = h.httpRoute({
  path: '/example/{id}',
  method: 'PUT',
  request: h.httpRequest({
    params: {
      id: NumberFromString,
    },
    body: {
      example: Example,
    },
  }),
  response: {
    ok: Example,
    invalidRequest: GenericAPIError,
  },
});

export const ExampleAPI = h.apiSpec({
  'api.example': {
    put: PutExample,
  },
});
```

`ExampleAPI` can then be used to create a type-safe api client for either `superagent`
or `supertest`. This requires two steps: wrapping the `superagent`/`supertest` instance,
then binding it to the api spec.

For `superagent`:

```typescript
import { superagentRequestFactory, buildApiClient } from '@api-ts/superagent-wrapper';
import superagent from 'superagent';

import { ExampleAPI } from './see-the-above-example';

// The api root, in a real project probably coming from a config option
const BASE_URL = 'http://example.com/';

// Step one: wrap `superagent` and the api root
const requestFactory = superagentRequestFactory(superagent, BASE_URL);

// Step two: combine the request factory and imported api spec into an api client
// This is intended to be exported and used
export const apiClient = buildApiClient(requestFactory, ExampleAPI);
```

For `supertest` the process is almost identical except that `supertest` itself handles
knowing the root api url:

```typescript
import { supertestRequestFactory, buildApiClient } from '@api-ts/superagent-wrapper';
import supertest from 'superagent';

import { ExampleAPI } from './see-the-above-example';

// For the purposes of this guide, say we have an Express app that can be imported from the project.
// See the `supertest` docs for the options it has for instantiation.
import { app } from '../src/index';
const request = supertest(app);

// Step one: wrap the `supertest` request function created above
const requestFactory = superatestRequestFactory(request);

// Step two: combine the request factory and imported api spec into an api client
// This is intended to be exported and used
export const apiClient = buildApiClient(requestFactory, ExampleAPI);
```

The resulting `apiClient` can then be imported elsewhere and used:

```typescript
import { apiClient } from './api-client-example';

const doSomething = async () => {
  // The `api.example` here comes from the operation in the `ExampleAPI` definition from above
  const response = await apiClient['api.example']
    // The object passed to this function is type-checked against the request codec
    .put({ id: 42, example: { foo: 'hello', bar: 1 } })
    // This will use the set of response codecs to decode the response
    .decode();

  // The two main properties on `response` are `status` and `body`
  // If the value of `status` is checked, then TypeScript will infer the correct body type
  if (response.status === 200) {
    const { foo, bar } = response.body; // We know the correct body type here
  } else if (response.status === 400) {
    // The body is a GenericAPIError
    console.log(response.body.message);
  } else {
    // In case an unexpected status code comes back, or the response body does not correctly
    // decode, we can still access it as an `unknown` type.
    if (
      response.body &&
      typeof response.body === 'object' &&
      response.body.hasOwnProperty('message')
    ) {
      console.log(response.body.message);
    }
  }
};
```

For convenience, a `decodeExpecting` function is also added to requests. It accepts an
HTTP status code and throws if either the response code doesn't match, or it does but
the response body failed to decode.

```typescript
const expectOk = async () => {
  // The `api.example` here comes from the operation in the `ExampleAPI` definition from above
  const response = await apiClient['api.example']
    // The object passed to this function is type-checked against the request codec
    .put({ id: 42, example: { foo: 'hello', bar: 1 } })
    // This will use the set of response codecs to decode the response
    .decodeExpecting(200);

  const { foo, bar } = response.body;
};
```
