import test from 'ava';

import * as t from 'io-ts';
import express from 'express';
import supertest from 'supertest';

import { ApiSpec, apiSpec, httpRequest, httpRoute, optional } from '@bitgo/io-ts-http';
import { Response } from '@bitgo/io-ts-response';
import {
  buildApiClient,
  supertestRequestFactory,
} from '@bitgo/superagent-codec-adapter';

import { createServer } from '../src';

// TODO: wallet-platform throws errors instead of returning values
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
    ok: t.type({
      message: t.string,
      appMiddlewareRan: t.boolean,
      routeMiddlewareRan: t.boolean,
    }),
    // In wallet-platform, sometimes we return a 202 (by throwing)
    invalidRequest: t.type({
      errors: t.string,
    }),
    notFound: t.unknown,
    // 500s are also used on prime team
    // DISCUSS: what if a response isn't listed here but shows up?
    internalError: t.unknown,
  },
});
type PutHello = typeof PutHello;

const ApiSpec = apiSpec({
  'hello.world': {
    put: PutHello,
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
    return Response.invalidRequest({
      errors: 'Please do not tell me zero! I will now explode',
    });
  }
  return Response.ok({
    message:
      parameters.secretCode === 42
        ? 'Everything you see from here is yours'
        : "Who's there?",
    appMiddlewareRan: parameters.appMiddlewareRan ?? false,
    routeMiddlewareRan: parameters.routeMiddlewareRan ?? false,
  });
};

test('should offer a delightful developer experience', async (t) => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    // Configure app-level middleware
    app.use(express.json());
    app.use(appMiddleware);
    // Configure route-level middleware
    return {
      'hello.world': {
        put: [routeMiddleware, CreateHelloWorld],
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

test('should invoke app-level middleware', async (t) => {
  const app = createServer(ApiSpec, (app: express.Application) => {
    // Configure app-level middleware
    app.use(express.json());
    app.use(appMiddleware);
    // Configure route-level middleware
    return {
      'hello.world': {
        put: [CreateHelloWorld],
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
    // Configure route-level middleware
    return {
      'hello.world': {
        put: [routeMiddleware, CreateHelloWorld],
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
    // Configure route-level middleware
    return {
      'hello.world': {
        put: [CreateHelloWorld],
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
