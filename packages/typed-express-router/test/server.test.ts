import test from 'ava';

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

test('should match basic routes', async (t) => {
  const router = createRouter(TestApiSpec);

  router.use(express.json());
  router.use(appMiddleware);
  router.put('hello.world', [routeMiddleware, CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  t.like(response, { message: "Who's there?" });
});

test('should match aliased routes', async (t) => {
  const router = createRouter(TestApiSpec);

  router.use(express.json());
  router.use(appMiddleware);
  router.get('hello.world', [GetHelloWorld]);
  router.getAlias('/alternateHello/:id', 'hello.world', [GetHelloWorld]);

  const app = express();
  app.use(router);

  const apiClient = supertest(app);

  const response = await apiClient
    .get('/alternateHello/1234')
    .expect(200)
    .then((res) => res.body);

  t.like(response, { id: '1234' });
});

test('should invoke post-response hook', async (t) => {
  const router = createRouter(TestApiSpec);

  let hookRun = false;

  router.use(express.json());
  router.use(appMiddleware);
  router.put('hello.world', [routeMiddleware, CreateHelloWorld], {
    afterEncodedResponseSent: () => {
      hookRun = true;
    },
  });

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  await apiClient['hello.world'].put({ secretCode: 1000 }).expect(200);

  t.true(hookRun);
});

test('should match first defined route when there is an overlap', async (t) => {
  const router = createRouter(TestApiSpec);

  router.use(express.json());
  router.get('hello.world', [GetHelloWorld]);

  // This won't be matched because of definition order
  router.get('hello.world.overlap', [
    (_req, res) => {
      res.sendEncoded(200, 'Hello World!');
    },
  ]);

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world.overlap'].get({}).decode();

  // Defined the wider route first, so that should be matched and cause a decode error
  t.is(response.status, 'decodeError');
  t.like(response.body, { id: 'world' });
});

test('should handle io-ts-http formatted path parameters', async (t) => {
  const router = createRouter(TestApiSpec);

  router.use(express.json());
  router.use(appMiddleware);
  router.put('hello.world', [routeMiddleware, CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .get({ id: '1337' })
    .decodeExpecting(200)
    .then((res) => res.body);

  t.like(response, { id: '1337' });
});

test('should invoke app-level middleware', async (t) => {
  const router = createRouter(TestApiSpec);

  router.use(express.json());
  router.use(appMiddleware);
  router.put('hello.world', [CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  t.like(response, { message: "Who's there?", appMiddlewareRan: true });
});

test('should invoke route-level middleware', async (t) => {
  const router = createRouter(TestApiSpec);

  router.use(express.json());
  router.put('hello.world', [routeMiddleware, CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  t.like(response, { message: "Who's there?", routeMiddlewareRan: true });
});

test('should infer status code from response type', async (t) => {
  const router = createRouter(TestApiSpec);

  router.use(express.json());
  router.put('hello.world', [routeMiddleware, CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 0 })
    .decodeExpecting(400)
    .then((res) => res.body);

  t.like(response, { errors: 'Please do not tell me zero! I will now explode' });
});

test('should return a 400 when request fails to decode', async (t) => {
  const router = createRouter(TestApiSpec);

  router.use(express.json());
  router.put('hello.world', [routeMiddleware, CreateHelloWorld]);
  router.get('hello.world', [GetHelloWorld]);

  const app = express();
  app.use(router);

  t.notThrows(async () => {
    await supertest(app)
      .put('/hello')
      .set('Content-Type', 'application/json')
      .expect(400);
  });
});

test('should invoke custom decode error function', async (t) => {
  const router = createRouter(TestApiSpec, {
    onDecodeError: (_errs, _req, res) => {
      res.status(400).json('Custom decode error').end();
    },
  });

  router.use(express.json());
  router.getAlias('/helloNoPathParams', 'hello.world', [
    (_req, res) => {
      res.sendEncoded(200, { id: '1234' });
    },
  ]);

  const app = express();
  app.use(router);

  const apiClient = supertest(app);
  const response = await apiClient.get('/helloNoPathParams').expect(400);

  t.is(response.body, 'Custom decode error');
});

test('should invoke per-route custom decode error function', async (t) => {
  const router = createRouter(TestApiSpec, {
    onDecodeError: (_errs, _req, res) => {
      res.status(400).json('Top-level decode error').end();
    },
  });

  router.use(express.json());
  router.getAlias(
    '/helloNoPathParams',
    'hello.world',
    [
      (_req, res) => {
        res.sendEncoded(200, { id: '1234' });
      },
    ],
    {
      onDecodeError: (_errs, _req, res) => {
        res.status(400).json('Route decode error').end();
      },
    },
  );

  const app = express();
  app.use(router);

  const apiClient = supertest(app);
  const response = await apiClient.get('/helloNoPathParams').expect(400);

  t.is(response.body, 'Route decode error');
});

test('should send a 500 when response type does not match', async (t) => {
  const router = createRouter(TestApiSpec);

  router.use(express.json());
  router.get('hello.world', [
    (_req, res) => {
      res.sendEncoded(200, { what: 'is this parameter?' } as any);
    },
  ]);

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);
  const response = await apiClient['hello.world'].get({ id: '1234' }).decode();

  t.is(response.original.status, 500);
});

test('should invoke custom encode error function when response type does not match', async (t) => {
  const router = createRouter(TestApiSpec, {
    onEncodeError: (_err, _req, res) => {
      res.status(500).json('Custom encode error').end();
    },
  });

  router.use(express.json());
  router.get('hello.world', [
    (_req, res) => {
      res.sendEncoded(200, { what: 'is this parameter?' } as any);
    },
  ]);

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);
  const response = await apiClient['hello.world'].get({ id: '1234' }).decode();

  t.is(response.original.status, 500);
  t.is(response.body, 'Custom encode error');
});

test('should invoke per-route custom encode error function when response type does not match', async (t) => {
  const router = createRouter(TestApiSpec, {
    onEncodeError: (_err, _req, res) => {
      res.status(500).json('Top-level encode error').end();
    },
  });

  router.use(express.json());
  router.get(
    'hello.world',
    [
      (_req, res) => {
        res.sendEncoded(200, { what: 'is this parameter?' } as any);
      },
    ],
    {
      onEncodeError: (_err, _req, res) => {
        res.status(500).json('Route encode error').end();
      },
    },
  );

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);
  const response = await apiClient['hello.world'].get({ id: '1234' }).decode();

  t.is(response.original.status, 500);
  t.is(response.body, 'Route encode error');
});

test('should invoke custom encode error function when an unknown HTTP status is passed to `sendEncoded`', async (t) => {
  const router = createRouter(TestApiSpec, {
    onEncodeError: (_err, _req, res) => {
      res.status(500).json('Custom encode error').end();
    },
  });

  router.use(express.json());
  router.get('hello.world', [
    (_req, res) => {
      res.sendEncoded(202 as any, {} as any);
    },
  ]);

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), TestApiSpec);
  const response = await apiClient['hello.world'].get({ id: '1234' }).decode();

  t.is(response.original.status, 500);
  t.is(response.body, 'Custom encode error');
});

test('should invoke custom encode error function when an unknown keyed status is passed to `sendEncoded`', async (test) => {
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
    onEncodeError: (_err, _req, res) => {
      res.status(500).json('Custom encode error').end();
    },
  });

  router.use(express.json());
  router.get('foo', [
    (_req, res) => {
      res.sendEncoded('wat', {});
    },
  ]);

  const app = express();
  app.use(router);

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), WeirdApi);
  const response = await apiClient['foo'].get({}).decode();

  test.is(response.original.status, 500);
  test.is(response.body, 'Custom encode error');
});
