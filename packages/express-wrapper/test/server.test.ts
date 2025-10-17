import test from 'node:test';
import { strict as assert } from 'node:assert';

import * as t from 'io-ts';
import express from 'express';
import supertest from 'supertest';

import {
  type ApiSpec,
  apiSpec,
  httpRequest,
  httpRoute,
  optional,
} from '@api-ts/io-ts-http';
import { buildApiClient, supertestRequestFactory } from '@api-ts/superagent-wrapper';

import { createServer, middlewareFn, routeHandler } from '../src';

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

const ApiSpec = apiSpec({
  'hello.world': {
    put: PutHello,
    get: GetHello,
  },
});

const appMiddleware: express.RequestHandler = (req, _res, next) => {
  req.body.appMiddlewareRan = true;
  next();
};

const routeMiddleware = middlewareFn(async () => {
  return { routeMiddlewareRan: true };
});

// DISCUSS: defining a RouteHandler type or something (also used in decodeRequestAndEncodeResponse)
const CreateHelloWorld = async (parameters: {
  secretCode: number;
  appMiddlewareRan?: boolean;
  routeMiddlewareRan?: boolean;
}) => {
  if (parameters.secretCode === 0) {
    return {
      type: 400,
      payload: {
        errors: 'Please do not tell me zero! I will now explode',
      },
    } as const;
  }
  return {
    type: 200,
    payload: {
      message:
        parameters.secretCode === 42
          ? 'Everything you see from here is yours'
          : "Who's there?",
      appMiddlewareRan: parameters.appMiddlewareRan ?? false,
      routeMiddlewareRan: parameters.routeMiddlewareRan ?? false,
    },
  } as const;
};

const GetHelloWorld = async (params: { id: string }) =>
  ({
    type: 'ok',
    payload: params,
  }) as const;

test('should offer a delightful developer experience', async () => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    // Configure app-level middleware
    app.use(express.json());
    app.use(appMiddleware);
    return {
      'hello.world': {
        put: routeHandler({ middleware: [routeMiddleware], handler: CreateHelloWorld }),
        get: GetHelloWorld,
      },
    };
  });

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), ApiSpec);

  // DISCUSS: a use-case for decoding as a switch -- if I got this code, run this function

  // DISCUSS: falling back to `t.unknown` codec for unrecognized status codes
  // I guess technically the route should declare what it can send back as an
  // error, but right now we have 400 and 404s thrown by io-ts-server, not the
  // application layer :thonking:
  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  assert.equal(response.message, "Who's there?");
});

test('should handle io-ts-http formatted path parameters', async () => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    app.use(express.json());
    app.use(appMiddleware);
    return {
      'hello.world': {
        put: routeHandler({ middleware: [routeMiddleware], handler: CreateHelloWorld }),
        get: GetHelloWorld,
      },
    };
  });

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), ApiSpec);

  const response = await apiClient['hello.world']
    .get({ id: '1337' })
    .decodeExpecting(200)
    .then((res) => res.body);

  assert.equal(response.id, '1337');
});

test('should invoke app-level middleware', async () => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    // Configure app-level middleware
    app.use(express.json());
    app.use(appMiddleware);
    return {
      'hello.world': {
        put: CreateHelloWorld,
        get: GetHelloWorld,
      },
    };
  });

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), ApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  assert.equal(response.message, "Who's there?");
  assert.equal(response.appMiddlewareRan, true);
});

test('should invoke route-level middleware', async () => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    // Configure app-level middleware
    app.use(express.json());
    return {
      'hello.world': {
        put: routeHandler({ middleware: [routeMiddleware], handler: CreateHelloWorld }),
        get: GetHelloWorld,
      },
    };
  });

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), ApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  assert.equal(response.message, "Who's there?");
  assert.equal(response.routeMiddlewareRan, true);
});

test('should not add parameters from middleware unless routeHandler() is used', async () => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    // Configure app-level middleware
    app.use(express.json());
    return {
      'hello.world': {
        put: { middleware: [routeMiddleware], handler: CreateHelloWorld },
        get: GetHelloWorld,
      },
    };
  });

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), ApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 1000 })
    .decodeExpecting(200)
    .then((res) => res.body);

  assert.equal(response.message, "Who's there?");
  assert.equal(response.routeMiddlewareRan, false);
});

test('should infer status code from response type', async () => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    // Configure app-level middleware
    app.use(express.json());
    return {
      'hello.world': {
        put: CreateHelloWorld,
        get: GetHelloWorld,
      },
    };
  });

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), ApiSpec);

  const response = await apiClient['hello.world']
    .put({ secretCode: 0 })
    .decodeExpecting(400)
    .then((res) => res.body);

  assert.equal(response.errors, 'Please do not tell me zero! I will now explode');
});

test('should return a 400 when request fails to decode', async () => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    // Configure app-level middleware
    app.use(express.json());
    return {
      'hello.world': {
        put: CreateHelloWorld,
        get: GetHelloWorld,
      },
    };
  });

  const response = await supertest(app)
    .put('/hello')
    .set('Content-Type', 'application/json')
    .expect(400);

  assert(response.body.error.startsWith('Invalid value undefined supplied to'));
});

test('middleware that modifies req.body should reach handler even without routeHandler()', async () => {
  const PostWithData = httpRoute({
    path: '/data',
    method: 'POST',
    request: httpRequest({
      body: {
        originalField: t.string,
        addedByMiddleware: optional(t.string),
      },
    }),
    response: {
      200: t.type({
        originalField: t.string,
        addedByMiddleware: optional(t.string),
      }),
    },
  });

  const testApiSpec = apiSpec({
    'test.route': {
      post: PostWithData,
    },
  });

  const modifyBodyMiddleware: express.RequestHandler = (req, _res, next) => {
    req.body.addedByMiddleware = 'ADDED';
    next();
  };

  const handler = async (params: { originalField: string; addedByMiddleware?: string }) => {
    return {
      type: 200,
      payload: {
        originalField: params.originalField,
        addedByMiddleware: params.addedByMiddleware,
      },
    } as const;
  };

  const app = createServer(testApiSpec, (app: express.Application) => {
    app.use(express.json());
    return {
      'test.route': {
        post: { middleware: [modifyBodyMiddleware], handler },
      },
    };
  });

  const response = await supertest(app)
    .post('/data')
    .send({ originalField: 'test' })
    .expect(200);

  assert.equal(response.body.addedByMiddleware, 'ADDED', 'addedByMiddleware should be present because req.body is part of req.decoded');
});
