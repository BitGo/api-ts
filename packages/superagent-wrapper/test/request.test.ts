import { strict as assert } from 'node:assert';
import { before, after, describe, it } from 'node:test';
import * as http from 'node:http';

import * as h from '@api-ts/io-ts-http';
import express from 'express';
import * as E from 'fp-ts/Either';
import * as t from 'io-ts';
import { NumberFromString } from 'io-ts-types';
import superagent from 'superagent';
import supertest from 'supertest';
import { URL } from 'whatwg-url';

import {
  DecodeError,
  superagentRequestFactory,
  supertestRequestFactory,
} from '../src/request';
import { ApiClient, buildApiClient } from '../src/routes';

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
    200: t.type({
      id: t.number,
      foo: t.string,
      bar: t.number,
      baz: t.boolean,
    }),
    401: t.type({
      message: t.string,
    }),
  },
});

const HeaderGetTestRoute = h.httpRoute({
  path: '/getHeader',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: t.type({
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

const createTestServer = (port: number) => {
  const testApp = express();
  const server = testApp.listen(port);
  testApp.use(express.json());

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
    } else if (req.headers['x-send-unknown-status-code']) {
      res.status(400);
      res.send({
        error: 'bad request',
      });
    } else if (req.headers['x-send-unexpected-status-code']) {
      res.status(401);
      res.send({
        message: 'unauthorized',
      });
    } else {
      const response = PostTestRoute.response[200].encode({
        ...params,
        baz: true,
      });
      res.send(response);
    }
  });

  testApp.get(HeaderGetTestRoute.path, (req, res) => {
    res.send(
      HeaderGetTestRoute.response[200].encode({
        value: String(req.headers['x-custom'] ?? ''),
      }),
    );
  });

  const request = supertest(testApp);
  const apiClient = buildApiClient(supertestRequestFactory(request), TestRoutes);
  return { server, apiClient };
};

describe('decode', () => {
  let server: http.Server;
  let apiClient: ApiClient<superagent.SuperAgentRequest, typeof TestRoutes>;

  before(() => {
    const testServer = createTestServer(3001);
    server = testServer.server;
    apiClient = testServer.apiClient;
  });

  after(() => {
    server.close();
  });

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

  it('gracefully handles unknown status codes', async () => {
    const response = await apiClient['api.v1.test']
      .post({ id: 1337, foo: 'test', bar: 42 })
      .set('x-send-unknown-status-code', 'true')
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
  let server: http.Server;
  let apiClient: ApiClient<superagent.SuperAgentRequest, typeof TestRoutes>;

  before(() => {
    const testServer = createTestServer(3002);
    server = testServer.server;
    apiClient = testServer.apiClient;
  });

  after(() => {
    server.close();
  });

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
      .then(() => '')
      .catch((err) => (err instanceof DecodeError ? err.message : ''));

    assert.equal(result, 'Unexpected response 401: {"message":"unauthorized"}');
  });

  it('throws for unknown responses', async () => {
    const result = await apiClient['api.v1.test']
      .post({ id: 1337, foo: 'test', bar: 42 })
      .set('x-send-unknown-status-code', 'true')
      .decodeExpecting(200)
      .then(() => '')
      .catch((err) => (err instanceof DecodeError ? err.message : ''));

    assert.equal(result, 'Unexpected response 400: {"error":"bad request"}');
  });

  it('throws for decode errors', async () => {
    const result = await apiClient['api.v1.test']
      .post({ id: 1337, foo: 'test', bar: 42 })
      .set('x-send-invalid-response-body', 'true')
      .decodeExpecting(200)
      .then(() => '')
      .catch((err) => (err instanceof DecodeError ? err.message : ''));

    assert.equal(
      result,
      'Could not decode response 200: [{"invalid":"response"}] due to error [Invalid value undefined supplied to : { id: number, foo: string, bar: number, baz: boolean }/id: number\nInvalid value undefined supplied to : { id: number, foo: string, bar: number, baz: boolean }/foo: string\nInvalid value undefined supplied to : { id: number, foo: string, bar: number, baz: boolean }/bar: number\nInvalid value undefined supplied to : { id: number, foo: string, bar: number, baz: boolean }/baz: boolean]',
    );
  });
});

describe('superagent', async () => {
  it('does not throw on non-2xx status codes', async () => {
    const { server, apiClient } = createTestServer(3003);

    const req = await apiClient['api.v1.test']
      .post({ id: 1337, foo: 'test', bar: 42 })
      .set('x-send-unexpected-status-code', 'true')
      .decode();

    assert.equal(req.status, 401);

    server.close();
  });

  it('supports apis with non-root base paths', async () => {
    // Arrange
    const { server, apiClient } = createTestServer(3004);

    const superTestRequest = apiClient['api.v1.test'].post({
      id: 1337,
      foo: 'test',
      bar: 42,
    });
    const url = new URL(superTestRequest.url);
    url.pathname = '/';
    const baseUrl = url.toString();

    // This is kinda hacky, but the alternative was setting up a whole new express app with extended paths,
    // starting it in supertest, and then finding what port it is running on again and creating a superagent
    // client. Instead, I'm defining a route identical to `PostTestRoute` except with the first path component removed
    const NonRootPostTestRoute = h.httpRoute({
      path: '/{id}',
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
        200: t.type({
          id: t.number,
          foo: t.string,
          bar: t.number,
          baz: t.boolean,
        }),
        401: t.type({
          message: t.string,
        }),
      },
    });

    const prefixedUrl = new URL('/test', baseUrl);
    const superagentClient = buildApiClient(
      superagentRequestFactory(superagent, prefixedUrl.toString()),
      {
        test: { post: NonRootPostTestRoute },
      },
    );

    // Act
    const response = await superagentClient['test']
      .post({
        id: 1234,
        foo: 'hello',
        bar: 1337,
      })
      .decodeExpecting(200);

    // Assert
    assert.deepEqual(response.body, { id: 1234, foo: 'hello', bar: 1337, baz: true });

    // Clean-up
    await superTestRequest;
    server.close();
  });
});
