import test from 'node:test';
import { strict as assert } from 'node:assert';

import * as t from 'io-ts';
import express from 'express';
import supertest from 'supertest';

import { apiSpec, httpRequest, httpRoute, optional } from '@api-ts/io-ts-http';
import { buildApiClient, supertestRequestFactory } from '@api-ts/superagent-wrapper';

import { createRouter } from '../src';
import { TypedRequestHandler } from '../src/types';

const PutHello = httpRoute({
  path: '/hello',
  method: 'PUT',
  // DISCUSS: what about req.user?
  // and more generally, things that aren't in headers/body/query/route
  request: httpRequest({
    body: {
      secretCode: t.number,
      appMiddlewareRan: optional(t.boolean),
    },
  }),
  response: {
    // TODO: create prettier names for these codecs at the io-ts-http level
    200: t.type({
      message: t.string,
      appMiddlewareRan: t.boolean,
      routeMiddlewareRan: t.boolean,
    }),
    400: t.type({
      errors: t.string,
    }),
    404: t.unknown,
    // DISCUSS: what if a response isn't listed here but shows up?
    500: t.unknown,
  },
});
type PutHello = typeof PutHello;

const GetHello = httpRoute({
  path: '/hello/{id}',
  method: 'GET',
  request: httpRequest({
    params: {
      id: t.string,
    },
  }),
  response: {
    200: t.type({
      id: t.string,
    }),
  },
});

const GetHelloOverlap = httpRoute({
  path: '/hello/world',
  method: 'GET',
  request: httpRequest({}),
  response: {
    200: t.literal('Hello World!'),
  },
});

const TestApiSpec = apiSpec({
  'hello.world': {
    put: PutHello,
    get: GetHello,
  },
  'hello.world.overlap': {
    get: GetHelloOverlap,
  },
});

type TestApiSpec = typeof TestApiSpec;

const appMiddleware: express.RequestHandler = (req, _res, next) => {
  req.body.appMiddlewareRan = true;
  next();
};

const routeMiddleware: express.RequestHandler = (req, _res, next) => {
  (req as any).routeMiddlewareRan = true;
  next();
};

const CreateHelloWorld: TypedRequestHandler<TestApiSpec, 'hello.world', 'put'> = (
  req,
  res,
) => {
  const { secretCode, appMiddlewareRan } = req.decoded;
  if (secretCode === 0) {
    res.sendEncoded(400, {
      errors: 'Please do not tell me zero! I will now explode',
    });
  } else {
    res.sendEncoded(200, {
      message:
        secretCode === 42 ? 'Everything you see from here is yours' : "Who's there?",
      appMiddlewareRan: appMiddlewareRan ?? false,
      routeMiddlewareRan: (req as any).routeMiddlewareRan ?? false,
    });
  }
};

const GetHelloWorld: TypedRequestHandler<TestApiSpec, 'hello.world', 'get'> = (
  { decoded: { id } },
  res,
) => res.sendEncoded(200, { id });

test('should match basic routes', async () => {
  const router = createRouter(TestApiSpec);

  router.put('hello.world', [routeMiddleware, CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(express.json());
  app.use(appMiddleware);
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  assert.equal(response.message, "Who's there?");
});

test('should match aliased routes', async () => {
  const router = createRouter(TestApiSpec);

  router.get('hello.world', [GetHelloWorld], { routeAliases: ['/alternateHello/:id'] });

  const app = express();
  app.use(express.json());
  app.use(appMiddleware);
  app.use(router);

  const apiClient = supertest(app);

  const response = await apiClient
    .get('/alternateHello/1234')
    .expect(200)
    .then((res) => res.body);

  assert.equal(response.id, '1234');
});

test('should invoke post-response hook', async () => {
  const router = createRouter(TestApiSpec);

  let hookRun = false;

  router.put('hello.world', [routeMiddleware, CreateHelloWorld], {
    afterEncodedResponseSent: () => {
      hookRun = true;
    },
  });

  const app = express();
  app.use(express.json());
  app.use(appMiddleware);
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  await apiClient['hello.world'].put({ secretCode: 1000 }).expect(200);

  assert.ok(hookRun);
});

test('should match first defined route when there is an overlap', async () => {
  const router = createRouter(TestApiSpec);

  router.get('hello.world', [GetHelloWorld]);

  // This won't be matched because of definition order
  router.get('hello.world.overlap', [
    (_req, res) => {
      res.sendEncoded(200, 'Hello World!');
    },
  ]);

  const app = express();
  app.use(router);
  app.use(express.json());

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world.overlap'].get({}).decode();

  // Defined the wider route first, so that should be matched and cause a decode error
  assert.equal(response.status, 'decodeError');
  assert.equal((response.body as any).id, 'world');
});

test('should handle io-ts-http formatted path parameters', async () => {
  const router = createRouter(TestApiSpec);

  router.put('hello.world', [routeMiddleware, CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(express.json());
  app.use(appMiddleware);
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .get({ id: '1337' })
    .decodeExpecting(200)
    .then((res) => res.body);

  assert.equal(response.id, '1337');
});

test('should invoke app-level middleware', async () => {
  const router = createRouter(TestApiSpec);

  router.put('hello.world', [CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(express.json());
  app.use(appMiddleware);
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  assert.equal(response.message, "Who's there?");
  assert.equal(response.appMiddlewareRan, true);
});

test('should invoke router-level middleware', async () => {
  const router = createRouter(TestApiSpec);

  let routerMiddlewareRan: string = '';
  router.use((req, _res, next) => {
    routerMiddlewareRan = req.apiName;
    next();
  });

  router.put('hello.world', [CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  assert.equal(response.message, "Who's there?");
  assert.equal(response.appMiddlewareRan, false);
  assert.equal(routerMiddlewareRan, 'hello.world');
});

test('router-level middleware should run before request validation on checked routes', async () => {
  const router = createRouter(TestApiSpec);

  let routerMiddlewareRan: string = '';
  router.use((req, _res, next) => {
    routerMiddlewareRan = req.apiName;
    next();
  });

  router.put('hello.world', [CreateHelloWorld]);

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  await apiClient['hello.world'].put({} as any).expect(400);

  assert.equal(routerMiddlewareRan, 'hello.world');
});

test('should invoke route-level middleware', async () => {
  const router = createRouter(TestApiSpec);

  router.put('hello.world', [routeMiddleware, CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  assert.equal(response.message, "Who's there?");
  assert.equal(response.routeMiddlewareRan, true);
});

test('should infer status code from response type', async () => {
  const router = createRouter(TestApiSpec);

  router.put('hello.world', [routeMiddleware, CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 0 })
    .decodeExpecting(400)
    .then((res) => res.body);

  assert.equal(response.errors, 'Please do not tell me zero! I will now explode');
});

test('should return a 400 when request fails to decode', async () => {
  const router = createRouter(TestApiSpec);

  router.put('hello.world', [routeMiddleware, CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(express.json());
  app.use(router);

  assert.doesNotReject(async () => {
    await supertest(app)
      .put('/hello')
      .set('Content-Type', 'application/json')
      .expect(400);
  });
});

test('should invoke custom decode error function', async () => {
  const router = createRouter(TestApiSpec, {
    decodeErrorFormatter: (_errs, _req) => {
      return 'Custom decode error';
    },
  });

  router.get(
    'hello.world',
    [
      (_req, res) => {
        res.sendEncoded(200, { id: '1234' });
      },
    ],
    {
      routeAliases: ['/helloNoPathParams'],
    },
  );

  const app = express();
  app.use(express.json());
  app.use(router);

  const apiClient = supertest(app);
  const response = await apiClient.get('/helloNoPathParams').expect(400);

  assert.equal(response.body, 'Custom decode error');
});

test('should invoke per-route custom decode error function', async () => {
  const router = createRouter(TestApiSpec, {
    decodeErrorFormatter: (_errs, _req) => {
      return 'Top-level decode error';
    },
  });

  router.get(
    'hello.world',
    [
      (_req, res) => {
        res.sendEncoded(200, { id: '1234' });
      },
    ],
    {
      decodeErrorFormatter: (_errs, _req) => {
        return 'Route decode error';
      },
      routeAliases: ['/helloNoPathParams'],
    },
  );

  const app = express();
  app.use(express.json());
  app.use(router);

  const apiClient = supertest(app);
  const response = await apiClient.get('/helloNoPathParams').expect(400);

  assert.equal(response.body, 'Route decode error');
});

test('should send a 500 when response type does not match', async () => {
  const router = createRouter(TestApiSpec);

  router.get('hello.world', [
    (_req, res) => {
      res.sendEncoded(200, { what: 'is this parameter?' } as any);
    },
  ]);

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);
  const response = await apiClient['hello.world'].get({ id: '1234' }).decode();

  assert.equal(response.original.status, 500);
});

test('should invoke default encode error function when response type does not match', async () => {
  const router = createRouter(TestApiSpec);

  router.get('hello.world', [
    (_req, res) => {
      res.sendEncoded(200, { what: 'is this parameter?' } as any);
    },
  ]);

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);
  const response = await apiClient['hello.world'].get({ id: '1234' }).decode();

  assert.equal(response.original.status, 500);
  assert.deepStrictEqual(response.body, {});
});

test('should invoke custom encode error function when response type does not match', async () => {
  const router = createRouter(TestApiSpec, {
    encodeErrorFormatter: (_err, _req) => {
      return 'Custom encode error';
    },
  });

  router.get('hello.world', [
    (_req, res) => {
      res.sendEncoded(200, { what: 'is this parameter?' } as any);
    },
  ]);

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);
  const response = await apiClient['hello.world'].get({ id: '1234' }).decode();

  assert.equal(response.original.status, 500);
  assert.equal(response.body, 'Custom encode error');
});

test('should invoke per-route custom encode error function when response type does not match', async () => {
  const router = createRouter(TestApiSpec, {
    encodeErrorFormatter: (_err, _req) => {
      return 'Top-level encode error';
    },
  });

  router.get(
    'hello.world',
    [
      (_req, res) => {
        res.sendEncoded(200, { what: 'is this parameter?' } as any);
      },
    ],
    {
      encodeErrorFormatter: (_err, _req) => {
        return 'Route encode error';
      },
    },
  );

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);
  const response = await apiClient['hello.world'].get({ id: '1234' }).decode();

  assert.equal(response.original.status, 500);
  assert.equal(response.body, 'Route encode error');
});

test('should invoke custom encode error function when an unknown HTTP status is passed to `sendEncoded`', async () => {
  const router = createRouter(TestApiSpec, {
    encodeErrorFormatter: (_err, _req) => {
      return 'Custom encode error';
    },
  });

  router.get('hello.world', [
    (_req, res) => {
      res.sendEncoded(202 as any, {} as any);
    },
  ]);

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);
  const response = await apiClient['hello.world'].get({ id: '1234' }).decode();

  assert.equal(response.original.status, 500);
  assert.equal(response.body, 'Custom encode error');
});

test('should invoke custom encode error function when an unknown keyed status is passed to `sendEncoded`', async () => {
  const WeirdApi = apiSpec({
    foo: {
      get: httpRoute({
        path: '/foo',
        method: 'GET',
        request: httpRequest({}),
        response: {
          wat: t.type({}),
        },
      }),
    },
  });

  const router = createRouter(WeirdApi, {
    encodeErrorFormatter: (_err, _req) => {
      return 'Custom encode error';
    },
  });

  router.get('foo', [
    (_req, res) => {
      res.sendEncoded('wat', {});
    },
  ]);

  const app = express();
  app.use(express.json());
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), WeirdApi);
  const response = await apiClient['foo'].get({}).decode();

  assert.equal(response.original.status, 500);
  assert.equal(response.body, 'Custom encode error');
});

const ExplicitUndefinedApiSpec = apiSpec({
  empty: {
    get: undefined,
  },
});

test('should throw on explicitly undefined route definition', async () => {
  const router = createRouter(ExplicitUndefinedApiSpec);

  assert.throws(() => {
    router.get('empty', [
      (_req, res) => {
        res.send(200);
      },
    ]);
  });
});
