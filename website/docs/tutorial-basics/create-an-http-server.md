---
sidebar_position: 2
---

# Create an HTTP Server

An API specification is only useful when clients and servers adhere to its rules.

`io-ts-http` API specifications are not coupled to any particular HTTP server. `api-ts`
provides helper libraries that wrap your favorite web server and use the TypeScript
type-checker to ensure your server implementation satisfies the target API
specification.

## Create an HTTP server implementing your API specification

We'll use [express] as our underlying web server in this tutorial.

[express]: https://github.com/expressjs/express

First, edit your `package.json` file to add a few new dependencies (highlighted):

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
    "io-ts": "npm:@bitgo-forks/io-ts@2.1.4"
  },
  "devDependencies": {
    "@types/express": "4.17.13",
    "@types/node": "18.6.1",
    "typescript": "4.7.4"
  }
}
```

And install them by running:

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

Finally, submit an HTTP request to your server in a web browser or using a new terminal:

```
$ curl localhost:3000/hello/world
"Hello, world!"
```
