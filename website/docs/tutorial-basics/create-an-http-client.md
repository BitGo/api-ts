---
sidebar_position: 3
---

# Create an HTTP Client

`io-ts-http` API specifications are not coupled to any particular HTTP client. `api-ts`
provides helper libraries that wrap your favorite HTTP client and use the TypeScript
type-checker to ensure type-safe communication with a server implementing an
`io-ts-http` specification.

## Create a type-safe HTTP Client from an API specification

As before, first edit your `package.json` file to add our new dependencies
(highlighted):

```json package.json focus=10,12,17
{
  "name": "api-ts-example",
  "scripts": {
    "build": "tsc --lib es2015 --esModuleInterop *.ts"
  },
  "dependencies": {
    "@api-ts/express-wrapper": "1.0.0-beta.20",
    "@api-ts/io-ts-http": "0.2.0-beta.9",
    "@api-ts/response": "0.1.2-beta.2",
    "@api-ts/superagent-wrapper": "0.2.0-beta.13",
    "io-ts": "2.1.3",
    "superagent": "8.0.0"
  },
  "devDependencies": {
    "@types/express": "4.17.13",
    "@types/node": "18.6.1",
    "@types/superagent": "4.1.15",
    "typescript": "5.2.2"
  }
}
```

And install them by running:

```
$ npm install
```

Next, create a new file `client.ts`:

```typescript client.ts
import { superagentRequestFactory, buildApiClient } from '@api-ts/superagent-wrapper';
import superagent from 'superagent';

import { API } from './index';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}/`;

const requestFactory = superagentRequestFactory(superagent, BASE_URL);
const apiClient = buildApiClient(requestFactory, API);

async function main() {
  const response = await apiClient['api.v1.hello']
    .get({
      name: 'world',
    })
    .decodeExpecting(200);
  console.log('Response is:', response.body);
}

main();
```

Notice the inferred type of `response.body`.

Compile and run `client.ts` (make sure your server is still running!):

```
$ npm run build
$ node ./client.js
```

You will see output like

```
Response is: Hello, world!
```
