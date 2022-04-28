import test from 'ava';

import * as t from 'io-ts';
import express from 'express';
import supertest from 'supertest';

import { ApiSpec, apiSpec, httpRequest, httpRoute, optional } from '@api-ts/io-ts-http';
import { buildApiClient, supertestRequestFactory } from '@api-ts/superagent-wrapper';

import { createServer } from '../src';

const PutHello = httpRoute({
  path: '/hello',
  method: 'PUT',
  // DISCUSS: what about req.user?
  // and more generally, things that aren't in headers/body/query/route
  request: httpRequest({
    body: {
      secretCode: t.number,
      appMiddlewareRan: optional(t.boolean),
      routeMiddlewareRan: optional(t.boolean),
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

const routeMiddleware: express.RequestHandler = (req, _res, next) => {
  req.body.routeMiddlewareRan = true;
  next();
};

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
  } as const);

test('should offer a delightful developer experience', async (t) => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    // Configure app-level middleware
    app.use(express.json());
    app.use(appMiddleware);
    return {
      'hello.world': {
        put: { middleware: [routeMiddleware], handler: CreateHelloWorld },
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

  t.like(response, { message: "Who's there?" });
});

test('should handle io-ts-http formatted path parameters', async (t) => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    app.use(express.json());
    app.use(appMiddleware);
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
    .get({ id: '1337' })
    .decodeExpecting(200)
    .then((res) => res.body);

  t.like(response, { id: '1337' });
});

test('should invoke app-level middleware', async (t) => {
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

  t.like(response, { message: "Who's there?", appMiddlewareRan: true });
});

test('should invoke route-level middleware', async (t) => {
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

  t.like(response, { message: "Who's there?", routeMiddlewareRan: true });
});

test('should infer status code from response type', async (t) => {
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

  t.like(response, { errors: 'Please do not tell me zero! I will now explode' });
});

test('should return a 400 when request fails to decode', async (t) => {
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

  t.true(response.body.error.startsWith('Invalid value undefined supplied to'));
});
