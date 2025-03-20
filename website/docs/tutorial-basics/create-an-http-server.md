---
sidebar_position: 2
---

# Create an HTTP Server

Learn how API specifications enable type-safe communication between clients and servers.

`io-ts-http` API specifications are not coupled to any particular HTTP server. `api-ts`
provides helper libraries that integrate with various web servers and use the TypeScript
type-checker to ensure server implementations satisfy the target API specification.

## Building a server with your API specification

This tutorial uses [express] as the underlying web server.

[express]: https://github.com/expressjs/express

First, edit the `package.json` file to add a few new dependencies (highlighted):

```json package.json focus=7,9,13,14
{
  "name": "api-ts-example",
  "scripts": {
    "build": "tsc --lib es2015 --esModuleInterop *.ts"
  },
  "dependencies": {
    "@api-ts/express-wrapper": "1.0.0-beta.20",
    "@api-ts/io-ts-http": "0.2.0-beta.9",
    "@api-ts/response": "0.1.2-beta.2",
    "io-ts": "2.1.3"
  },
  "devDependencies": {
    "@types/express": "4.17.13",
    "@types/node": "18.6.1",
    "typescript": "4.7.4"
  }
}
```

Install them by running:

```
$ npm install
```

Next, create a new file `server.ts`:

```typescript server.ts
import { Response } from '@api-ts/response';
import { createServer } from '@api-ts/express-wrapper';

import { API } from './index';

const PORT = 3000;

const hello = (parameters: { name: string }) => {
  return Response.ok(`Hello, ${parameters.name}!`);
};

const app = createServer(API, () => {
  return {
    'api.v1.hello': {
      get: hello,
    },
  };
});

app.listen(PORT, () => `Server is listening at http://localhost:${PORT}`);
```

Compile and run `server.ts`:

```
$ npm run build
$ node ./server.js
```

Test the server by submitting an HTTP request in a web browser or using a new terminal:

```
$ curl localhost:3000/hello/world
"Hello, world!"
```
