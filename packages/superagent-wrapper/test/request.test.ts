import * as h from '@api-ts/io-ts-http';
import bodyParser from 'body-parser';
import { assert } from 'chai';
import express from 'express';
import * as E from 'fp-ts/Either';
import * as t from 'io-ts';
import { NumberFromString } from 'io-ts-types';
import supertest from 'supertest';

import { supertestRequestFactory } from '../src/request';
import { buildApiClient } from '../src/routes';

const PostTestRoute = h.httpRoute({
  path: '/test/{id}',
  method: 'POST',
  request: h.httpRequest({
    query: {
      foo: t.string,
    },
    params: {
      id: NumberFromString,
    },
    body: {
      bar: t.number,
    },
  }),
  response: {
    ok: t.type({
      id: t.number,
      foo: t.string,
      bar: t.number,
      baz: t.boolean,
    }),
  },
});

const HeaderGetTestRoute = h.httpRoute({
  path: '/getHeader',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    ok: t.type({
      value: t.string,
    }),
  },
});

const TestRoutes = h.apiSpec({
  'api.v1.test': {
    post: PostTestRoute,
  },
  'api.v1.getheader': {
    get: HeaderGetTestRoute,
  },
});

const testApp = express();
testApp.use(bodyParser.json());

testApp.post('/test/:id', (req, res) => {
  const filteredReq = {
    query: req.query,
    params: req.params,
    headers: req.headers,
    body: req.body,
  };

  const params = E.getOrElseW((err) => {
    throw new Error(JSON.stringify(err));
  })(PostTestRoute.request.decode(filteredReq));

  if (req.headers['x-send-invalid-response-body']) {
    res.send({
      invalid: 'response',
    });
  } else if (req.headers['x-send-unexpected-status-code']) {
    res.status(400);
    res.send({
      error: 'bad request',
    });
  } else {
    const response = PostTestRoute.response['ok'].encode({
      ...params,
      baz: true,
    });
    res.send(response);
  }
});

testApp.get(HeaderGetTestRoute.path, (req, res) => {
  res.send(
    HeaderGetTestRoute.response['ok'].encode({
      value: String(req.headers['x-custom'] ?? ''),
    }),
  );
});

describe('request', () => {
  const request = supertest(testApp);
  const apiClient = buildApiClient(supertestRequestFactory(request), TestRoutes);

  describe('decode', () => {
    it('correctly encodes parameters and decodes responses', async () => {
      const response = await apiClient['api.v1.test']
        .post({ id: 1337, foo: 'test', bar: 42 })
        .decode();

      assert.equal(response.status, 200);
      assert.deepEqual(response.body, {
        id: 1337,
        foo: 'test',
        bar: 42,
        baz: true,
      });
    });

    // This is kind of a weird test, but the intention is that we have auth headers that
    // don't appear on the HttpRoute spec, so test that those are handled well.
    it('handles extra headers being added', async () => {
      const response = await apiClient['api.v1.getheader']
        .get({})
        .set('X-Custom', 'foobar')
        .decode();

      assert.deepEqual(response.body, {
        value: 'foobar',
      });
    });

    it('gracefully handles unexpected status codes', async () => {
      const response = await apiClient['api.v1.test']
        .post({ id: 1337, foo: 'test', bar: 42 })
        .set('x-send-unexpected-status-code', 'true')
        .decode();

      assert.equal(response.status, 'decodeError');
      assert.deepEqual(response.body, { error: 'bad request' });
    });

    it('gracefully handles decode errors for expected status codes', async () => {
      const response = await apiClient['api.v1.test']
        .post({ id: 1337, foo: 'test', bar: 42 })
        .set('x-send-invalid-response-body', 'true')
        .decode();

      assert.equal(response.status, 'decodeError');
      assert.deepEqual(response.body, { invalid: 'response' });
    });
  });

  describe('decodeExpecting', () => {
    it('narrows expected response types', async () => {
      const response = await apiClient['api.v1.test']
        .post({ id: 1337, foo: 'test', bar: 42 })
        .decodeExpecting(200);

      assert.deepEqual(response.body, {
        id: 1337,
        foo: 'test',
        bar: 42,
        baz: true,
      });
    });

    it('throws for unexpected responses', async () => {
      const result = await apiClient['api.v1.test']
        .post({ id: 1337, foo: 'test', bar: 42 })
        .set('x-send-unexpected-status-code', 'true')
        .decodeExpecting(200)
        .then(() => false)
        .catch(() => true);

      assert.isTrue(result);
    });

    it('throws for decode errors', async () => {
      const result = await apiClient['api.v1.test']
        .post({ id: 1337, foo: 'test', bar: 42 })
        .set('x-send-invalid-response-body', 'true')
        .decodeExpecting(200)
        .then(() => false)
        .catch(() => true);

      assert.isTrue(result);
    });
  });
});
