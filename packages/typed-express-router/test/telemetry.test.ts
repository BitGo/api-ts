import assert from 'node:assert';
import test, { beforeEach, afterEach } from 'node:test';

import { apiSpec, httpRequest, HttpRoute, httpRoute } from '@api-ts/io-ts-http';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { Span, SpanKind, context, trace } from '@opentelemetry/api';
import { setRPCMetadata, RPCType } from '@opentelemetry/core';
import express from 'express';
import * as t from 'io-ts';
import * as http from 'http';

import type { TypedRequestHandler } from '../src/types';
import { createRouter } from '../src';
import { ApiTsAttributes } from '../src/telemetry';

const makeRequest = (
  server: http.Server,
  method: string,
  path: string,
  body?: any,
): Promise<{ statusCode: number; data: string }> => {
  return new Promise((resolve, reject) => {
    const address = server.address();

    if (typeof address === 'string' || address === null) {
      reject('Unexpected address value');
      return;
    }

    const url = `http://localhost:${address.port}${path}`;

    const options: http.RequestOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode || 0,
          data,
        });
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }

    req.end();
  });
};

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

const GetHelloBad = httpRoute({
  path: '/hello/bad/{id}',
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

const PostHello = httpRoute({
  path: '/hello',
  method: 'POST',
  request: httpRequest({
    body: {
      secretCode: t.number,
    },
  }),
  response: {
    200: t.type({
      message: t.string,
    }),
  },
});

const PutHello = httpRoute({
  path: '/hello',
  method: 'PUT',
  request: httpRequest({
    body: {
      secretCode: t.number,
    },
  }),
  response: {
    200: t.type({
      message: t.string,
    }),
    400: t.type({
      errors: t.string,
    }),
    404: t.unknown,
    500: t.unknown,
  },
});

const DeleteHello = httpRoute({
  path: '/hello/{id}',
  method: 'DELETE',
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

const PatchHello = httpRoute({
  path: '/hello',
  method: 'PATCH',
  request: httpRequest({
    body: {
      secretCode: t.number,
    },
  }),
  response: {
    200: t.type({
      message: t.string,
    }),
  },
});

const TestApiSpec = apiSpec({
  'hello.world': {
    get: GetHello,
    post: PostHello,
    put: PutHello,
    delete: DeleteHello,
    patch: PatchHello,
  },
  'hello.world.bad': {
    get: GetHelloBad,
  },
});

type TestApiSpec = typeof TestApiSpec;

const GetHelloWorld: TypedRequestHandler<TestApiSpec, 'hello.world', 'get'> = (
  { decoded: { id } },
  res,
) => res.sendEncoded(200, { id });

const GetHelloWorldBad: TypedRequestHandler<TestApiSpec, 'hello.world.bad', 'get'> = (
  { decoded: { id } },
  res,
) => res.sendEncoded(200, { bad: id } as any);

const PostHelloWorld: TypedRequestHandler<TestApiSpec, 'hello.world', 'post'> = (
  req,
  res,
) => {
  const { secretCode } = req.decoded;
  res.sendEncoded(200, {
    message:
      secretCode === 42 ? 'Everything you see from here is yours' : "Who's there?",
  });
};

const PutHelloWorld: TypedRequestHandler<TestApiSpec, 'hello.world', 'put'> = (
  req,
  res,
) => {
  const { secretCode } = req.decoded;
  if (secretCode === 0) {
    res.sendEncoded(400, {
      errors: 'Please do not tell me zero! I will now explode',
    });
  } else {
    res.sendEncoded(200, {
      message:
        secretCode === 42 ? 'Everything you see from here is yours' : "Who's there?",
    });
  }
};

const DeleteHelloWorld: TypedRequestHandler<TestApiSpec, 'hello.world', 'delete'> = (
  { decoded: { id } },
  res,
) => res.sendEncoded(200, { id });

const PatchHelloWorld: TypedRequestHandler<TestApiSpec, 'hello.world', 'patch'> = (
  req,
  res,
) => {
  const { secretCode } = req.decoded;
  res.sendEncoded(200, {
    message:
      secretCode === 42 ? 'Everything you see from here is yours' : "Who's there?",
  });
};

const memoryExporter = new InMemorySpanExporter();
const spanProcessor = new SimpleSpanProcessor(memoryExporter);
const provider = new NodeTracerProvider({
  spanProcessors: [spanProcessor],
});
const tracer = provider.getTracer('typed-express-router');
const contextManager = new AsyncLocalStorageContextManager().enable();
let server: http.Server;
let rootSpan: Span;

context.setGlobalContextManager(contextManager);
provider.register();

beforeEach(async () => {
  rootSpan = tracer.startSpan('rootSpan');

  const app = express();
  app.use(express.json());

  app.use((_, __, next) => {
    const rpcMetadata = { type: RPCType.HTTP, span: rootSpan };
    return context.with(
      setRPCMetadata(trace.setSpan(context.active(), rootSpan), rpcMetadata),
      next,
    );
  });

  const router = createRouter(TestApiSpec);

  router.get('hello.world', [GetHelloWorld]);
  router.get('hello.world.bad', [GetHelloWorldBad]);
  router.post('hello.world', [PostHelloWorld]);
  router.put('hello.world', [PutHelloWorld], {
    decodeErrorFormatter: (_errs, _req) => {
      return 'Custom Decode Error';
    },
  });
  router.delete('hello.world', [DeleteHelloWorld]);
  router.patch('hello.world', [PatchHelloWorld]);

  app.use(router);

  server = http.createServer(app);

  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      resolve();
    });
  });
});

afterEach(() => {
  contextManager.disable();
  contextManager.enable();
  memoryExporter.reset();
  server?.close();
});

const getSpans = () => memoryExporter.getFinishedSpans();

test('should capture span attributes for GET requests', async () => {
  await context.with(trace.setSpan(context.active(), rootSpan), async () => {
    // Make request with path parameter
    const response = await makeRequest(server, 'GET', '/hello/123', undefined);
    rootSpan.end();

    assert.strictEqual(response.statusCode, 200);

    const responseData = JSON.parse(response.data);
    assert.strictEqual(responseData.id, '123');

    // Check spans
    const spans = getSpans();

    // rootSpan, encode, decode
    assert.ok(spans.length >= 3, `Expected at least 3 spans but got ${spans.length}`);

    // Find decode span
    const decodeSpan = spans.find(
      (span) => span.name.includes('decode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(decodeSpan, 'Decode span not found');
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(decodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD], 'GET');
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH],
      '/hello/{id}',
    );

    // Find encode span
    const encodeSpan = spans.find(
      (span) => span.name.includes('encode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(encodeSpan, 'Encode span not found');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(encodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD], 'GET');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH],
      '/hello/{id}',
    );
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_STATUS_CODE],
      200,
    );
  });
});

test('should capture span attributes for POST requests', async () => {
  await context.with(trace.setSpan(context.active(), rootSpan), async () => {
    const response = await makeRequest(server, 'POST', '/hello', { secretCode: 42 });
    rootSpan.end();

    assert.strictEqual(response.statusCode, 200);

    const responseData = JSON.parse(response.data);
    assert.strictEqual(responseData.message, 'Everything you see from here is yours');

    // Check spans
    const spans = getSpans();

    // rootSpan, encode, decode
    assert.ok(spans.length >= 3, `Expected at least 3 spans but got ${spans.length}`);

    // Find decode span
    const decodeSpan = spans.find(
      (span) => span.name.includes('decode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(decodeSpan, 'Decode span not found');
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(decodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD], 'POST');
    assert.strictEqual(decodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH], '/hello');

    // Find encode span
    const encodeSpan = spans.find(
      (span) => span.name.includes('encode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(encodeSpan, 'Encode span not found');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(encodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD], 'POST');
    assert.strictEqual(encodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH], '/hello');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_STATUS_CODE],
      200,
    );
  });
});

test('should capture span attributes for PUT requests', async () => {
  await context.with(trace.setSpan(context.active(), rootSpan), async () => {
    const response = await makeRequest(server, 'PUT', '/hello', { secretCode: 42 });
    rootSpan.end();

    assert.strictEqual(response.statusCode, 200);

    const responseData = JSON.parse(response.data);
    assert.strictEqual(responseData.message, 'Everything you see from here is yours');

    // Check spans
    const spans = getSpans();

    // rootSpan, encode, decode
    assert.ok(spans.length >= 3, `Expected at least 3 spans but got ${spans.length}`);

    // Find decode span
    const decodeSpan = spans.find(
      (span) => span.name.includes('decode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(decodeSpan, 'Decode span not found');
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(decodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH], '/hello');
    assert.strictEqual(decodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD], 'PUT');

    // Find encode span
    const encodeSpan = spans.find(
      (span) => span.name.includes('encode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(encodeSpan, 'Encode span not found');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(encodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH], '/hello');
    assert.strictEqual(encodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD], 'PUT');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_STATUS_CODE],
      200,
    );
  });
});

test('should capture span attributes for DELETE requests', async () => {
  await context.with(trace.setSpan(context.active(), rootSpan), async () => {
    // Make request with path parameter
    const response = await makeRequest(server, 'DELETE', '/hello/123', undefined);
    rootSpan.end();

    assert.strictEqual(response.statusCode, 200);

    const responseData = JSON.parse(response.data);
    assert.strictEqual(responseData.id, '123');

    // Check spans
    const spans = getSpans();

    // rootSpan, encode, decode
    assert.ok(spans.length >= 3, `Expected at least 3 spans but got ${spans.length}`);

    // Find decode span
    const decodeSpan = spans.find(
      (span) => span.name.includes('decode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(decodeSpan, 'Decode span not found');
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD],
      'DELETE',
    );
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH],
      '/hello/{id}',
    );

    // Find encode span
    const encodeSpan = spans.find(
      (span) => span.name.includes('encode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(encodeSpan, 'Encode span not found');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD],
      'DELETE',
    );
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH],
      '/hello/{id}',
    );
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_STATUS_CODE],
      200,
    );
  });
});

test('should capture span attributes for PATCH requests', async () => {
  await context.with(trace.setSpan(context.active(), rootSpan), async () => {
    const response = await makeRequest(server, 'PATCH', '/hello', { secretCode: 42 });
    rootSpan.end();

    assert.strictEqual(response.statusCode, 200);

    const responseData = JSON.parse(response.data);
    assert.strictEqual(responseData.message, 'Everything you see from here is yours');

    // Check spans
    const spans = getSpans();

    // rootSpan, encode, decode
    assert.ok(spans.length >= 3, `Expected at least 3 spans but got ${spans.length}`);

    // Find decode span
    const decodeSpan = spans.find(
      (span) => span.name.includes('decode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(decodeSpan, 'Decode span not found');
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD],
      'PATCH',
    );
    assert.strictEqual(decodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH], '/hello');

    // Find encode span
    const encodeSpan = spans.find(
      (span) => span.name.includes('encode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(encodeSpan, 'Encode span not found');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD],
      'PATCH',
    );
    assert.strictEqual(encodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH], '/hello');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_STATUS_CODE],
      200,
    );
  });
});

test('should capture bad-request responses', async () => {
  await context.with(trace.setSpan(context.active(), rootSpan), async () => {
    // Make request that will trigger validation error
    const response = await makeRequest(server, 'PUT', '/hello', { secretCode: 0 });
    rootSpan.end();

    assert.strictEqual(response.statusCode, 400);
    const responseData = JSON.parse(response.data);
    assert.strictEqual(
      responseData.errors,
      'Please do not tell me zero! I will now explode',
    );

    // Check spans
    const spans = getSpans();

    // rootSpan, encode, decode
    assert.ok(spans.length >= 3, `Expected at least 3 spans but got ${spans.length}`);

    // Find decode span
    const decodeSpan = spans.find(
      (span) => span.name.includes('decode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(decodeSpan, 'Decode span not found');
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(decodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD], 'PUT');
    assert.strictEqual(decodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH], '/hello');

    // Find encode span
    const encodeSpan = spans.find(
      (span) => span.name.includes('encode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(encodeSpan, 'Encode span not found');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(encodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD], 'PUT');
    assert.strictEqual(encodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH], '/hello');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_STATUS_CODE],
      400,
    );
  });
});

test('should capture decode errors', async () => {
  await context.with(trace.setSpan(context.active(), rootSpan), async () => {
    const response = await makeRequest(server, 'PUT', '/hello', {
      secretCode: 'not a number',
    });
    rootSpan.end();

    assert.strictEqual(response.statusCode, 400);

    // Check spans
    const spans = getSpans();

    // Find decode span
    const decodeSpan = spans.find(
      (span) => span.name.includes('decode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(decodeSpan, 'Encode span not found');
    assert.strictEqual(
      decodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world',
    );
    assert.strictEqual(decodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD], 'PUT');
    assert.strictEqual(decodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH], '/hello');
    const errorEvents = decodeSpan.events.filter((event) => {
      return event['name'] === 'exception';
    });
    assert.ok(errorEvents.length > 0, 'Expected at least 1 error event');

    assert.ok(
      errorEvents.find(
        (event) => event.attributes?.['exception.message'] === '"Custom Decode Error"',
      ),
      'Expected custom decode reporter message',
    );
  });
});

test('should capture encode errors', async () => {
  await context.with(trace.setSpan(context.active(), rootSpan), async () => {
    const response = await makeRequest(server, 'GET', '/hello/bad/1');
    rootSpan.end();

    assert.strictEqual(response.statusCode, 500);

    // Check spans
    const spans = getSpans();

    // rootSpan, encode, decode
    assert.ok(spans.length >= 3, `Expected at least 3 spans but got ${spans.length}`);

    // Find encode span
    const encodeSpan = spans.find(
      (span) => span.name.includes('encode') && span.kind === SpanKind.INTERNAL,
    );
    assert.ok(encodeSpan, 'Encode span not found');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_OPERATION_ID],
      'hello.world.bad',
    );
    assert.strictEqual(encodeSpan?.attributes?.[ApiTsAttributes.API_TS_METHOD], 'GET');
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_PATH],
      '/hello/bad/{id}',
    );
    assert.strictEqual(
      encodeSpan?.attributes?.[ApiTsAttributes.API_TS_STATUS_CODE],
      500,
    );
    const errorEvents = encodeSpan.events.filter((event) => {
      const attributes = event.attributes;
      if (!attributes) return false;
      return attributes['exception.type'] === 'Error';
    });
    assert.ok(errorEvents.length > 0, 'Expected at least 1 error event');

    assert.ok(
      errorEvents.find((event) =>
        event.attributes?.['exception.message']
          ?.toString()
          .startsWith('response does not match expected type'),
      ),
      'Expected encode error message',
    );
  });
});

test('should handle missing opentelemetry package', async () => {
  const originalCache = { ...require.cache };
  const resolvedPath = require.resolve('@opentelemetry/api');

  try {
    require.cache[resolvedPath] = {
      ...require.cache[resolvedPath]!!,
      exports: undefined,
    };
    delete require.cache[require.resolve('../src/telemetry')];

    const tempModule = await import('../src/telemetry');

    const testMetadata = {
      apiName: 'test.missing.otel',
      httpRoute: {
        path: '/test-path',
        method: 'GET',
      } as HttpRoute,
    };
    // Verify that span creation functions return undefined
    const decodeSpan = tempModule.createDecodeSpan(testMetadata);
    const encodeSpan = tempModule.createSendEncodedSpan(testMetadata);

    assert.strictEqual(
      decodeSpan,
      undefined,
      'Decode span should be undefined when OpenTelemetry is missing',
    );
    assert.strictEqual(
      encodeSpan,
      undefined,
      'Encode span should be undefined when OpenTelemetry is missing',
    );

    // Verify that other functions don't throw when given undefined spans
    assert.doesNotThrow(() => {
      tempModule.recordSpanEncodeError(decodeSpan, 'Test error', 500);
      tempModule.recordSpanDecodeError(encodeSpan, [], 400);
      tempModule.setSpanAttributes(decodeSpan, {});
      tempModule.endSpan(encodeSpan);
    }, 'Telemetry functions should handle undefined spans gracefully');
  } finally {
    require.cache = originalCache;
  }
});
