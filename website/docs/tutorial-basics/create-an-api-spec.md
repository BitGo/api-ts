---
sidebar_position: 1
---

# Create an API Specification

Learn to define a standalone **API specification** in TypeScript using
`@api-ts/io-ts-http`.

## Understanding API Contracts

Web services use an [API] as a contract to describe how _clients_ communicate with
_servers_.

When a server receives a request from a client, the server needs to answer a few
questions before it can begin fulfilling that request:

- Did the client satisfy the API contract?

  For example, did the client provide a number where I asked for a number?

- If the client satisfied the API contract, did it give me values I can use?

  For example, if the client is requesting to reserve some number of concert tickets,
  did the client try to reserve at least 1 ticket? How can I fulfill a request to
  reserve -2 tickets?

We'll call the first _type analysis_ and the second _semantic analysis_.

`io-ts-http` enables defining API contracts to an **arbitrary degree of precision**,
removing the burden of semantic analysis from business logic.

[api]: https://en.wikipedia.org/wiki/API

## Create your first `apiSpec`

First, create a new directory for a Node.js project by running the following commands in
your terminal:

```
$ mkdir api-ts-example
$ cd api-ts-example
```

In the new directory, create a `package.json` file:

```json package.json
{
  "name": "api-ts-example",
  "scripts": {
    "build": "tsc --lib es2015 --esModuleInterop *.ts"
  },
  "dependencies": {
    "@api-ts/io-ts-http": "0.2.0-beta.9",
    "io-ts": "2.1.3"
  },
  "devDependencies": {
    "typescript": "4.7.4"
  }
}
```

Install these dependencies with the following command:

```
$ npm install
```

Finally, create a new file named `index.ts`, where we'll define our API specification:

```typescript index.ts
import * as t from 'io-ts';
import { apiSpec, httpRoute, httpRequest } from '@api-ts/io-ts-http';

const GetHelloWorld = httpRoute({
  path: '/hello/{name}',
  method: 'GET',
  request: httpRequest({
    params: {
      name: t.string,
    },
  }),
  response: {
    200: t.string,
  },
});

export const API = apiSpec({
  'api.v1.hello-world': {
    get: GetHelloWorld,
  },
});
```

Compile the API specification with:

```
$ npm run build
```
