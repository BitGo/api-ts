import * as h from '@api-ts/io-ts-http';
import { Response } from '@api-ts/response';
import { buildApiClient, supertestRequestFactory } from '@api-ts/superagent-wrapper';
import test from 'ava';
import express from 'express';
import * as TE from 'fp-ts/TaskEither';
import * as t from 'io-ts';
import supertest from 'supertest';

import { applyMiddleware, applyServiceFn, pipeline } from '../src/pipeline';
import { encodeExpressResponse } from '../src/response';
import { decodeExpressRequest } from '../src/request';
import { routerBuilder } from '../src/router';
import { wrapExpressMiddleware } from '../src/expressMiddleware';

const GetHello = h.httpRoute({
  path: '/hello/{id}',
  method: 'GET',
  request: h.httpRequest({
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

const ApiSpec = h.apiSpec({
  'hello.world': {
    get: GetHello,
  },
});

test('buildRouter matches routes', async (t) => {
  const router = routerBuilder(ApiSpec);
  router.get('hello.world', ({ res }) => {
    res.status(200).send({ id: 'hello' }).end();
    return TE.left(undefined);
  });

  const app = express();
  app.use(router.build());

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), ApiSpec);

  const res = await apiClient['hello.world'].get({ id: '1234' }).decodeExpecting(200);

  t.deepEqual(res.body, { id: 'hello' });
});

test('buildRouter combines with request pipelines', async (t) => {
  const router = routerBuilder(ApiSpec);

  router.get(
    'hello.world',
    pipeline(
      applyMiddleware(decodeExpressRequest),
      applyServiceFn(
        async ({ id }) => {
          if (id !== 'fail') {
            return Response.ok({ id });
          } else {
            throw Error('fail');
          }
        },
        (_, { res }) => {
          res.status(500).end();
        },
      ),
      applyMiddleware(encodeExpressResponse),
    ),
  );

  const app = express();
  app.use(router.build());

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), ApiSpec);

  const res = await apiClient['hello.world'].get({ id: '1234' }).decodeExpecting(200);
  t.deepEqual(res.body, { id: '1234' });

  const failRes = await apiClient['hello.world'].get({ id: 'fail' }).decode();
  t.deepEqual(failRes.original.status, 500);
});

test('buildRouter passes when no middleware sends a response', async (t) => {
  const router = routerBuilder(ApiSpec);

  router.get(
    'hello.world',
    pipeline(
      applyMiddleware(decodeExpressRequest),
      applyServiceFn(
        async ({ id }) => {
          if (id === 'first') {
            return Response.ok({ id: 'first route matched' });
          } else {
            throw Error('fail');
          }
        },
        () => {
          /* Do nothing here on purpose */
        },
      ),
      applyMiddleware(encodeExpressResponse),
    ),
  );

  // Define the route a second time
  router.get(
    'hello.world',
    pipeline(
      applyMiddleware(decodeExpressRequest),
      applyServiceFn(
        async ({ id }) => {
          if (id === 'second') {
            return Response.ok({ id: 'second route reached' });
          } else {
            throw Error('fail');
          }
        },
        () => {
          /* Do nothing here on purpose */
        },
      ),
      applyMiddleware(encodeExpressResponse),
    ),
  );

  const app = express();
  app.use(router.build());

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), ApiSpec);

  const res = await apiClient['hello.world'].get({ id: 'first' }).decodeExpecting(200);
  t.deepEqual(res.body, { id: 'first route matched' });

  const secondRes = await apiClient['hello.world']
    .get({ id: 'second' })
    .decodeExpecting(200);
  t.deepEqual(secondRes.body, { id: 'second route reached' });

  const failRes = await apiClient['hello.world'].get({ id: 'third' }).decode();
  t.deepEqual(failRes.original.status, 404);
});

test('buildRouter works with express middleware', async (t) => {
  const router = routerBuilder(ApiSpec);

  const expressMiddleware: express.RequestHandler = (req, res, next) => {
    if (req.params.id === 'fail') {
      res.status(500).send({ message: 'fail' }).end();
    } else {
      next();
    }
  };

  router.get(
    'hello.world',
    pipeline(
      applyMiddleware(decodeExpressRequest),
      wrapExpressMiddleware(expressMiddleware),
      applyServiceFn(
        async ({ id }) => Response.ok({ id }),
        (err, { res }) => {
          console.error(err);
          res.status(500).end();
        },
      ),
      applyMiddleware(encodeExpressResponse),
    ),
  );

  const app = express();
  app.use(router.build());

  const server = supertest(app);
  const apiClient = buildApiClient(supertestRequestFactory(server), ApiSpec);

  const res = await apiClient['hello.world'].get({ id: '1234' }).decodeExpecting(200);
  t.deepEqual(res.body, { id: '1234' });

  const failRes = await apiClient['hello.world'].get({ id: 'fail' }).decode();
  t.deepEqual(failRes.original.status, 500);
  t.deepEqual(failRes.original.body, { message: 'fail' });
});
