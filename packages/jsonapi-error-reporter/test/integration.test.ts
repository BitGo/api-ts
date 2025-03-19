import test from 'node:test';
import { strict as assert } from 'node:assert';

import * as t from 'io-ts';
import express from 'express';
import supertest from 'supertest';
import * as E from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { apiSpec, httpRequest, httpRoute } from '@api-ts/io-ts-http';

import { JSONAPIErrorReporter, createJSONApiRouter } from '../src';

// Define a codec that will fail on string inputs to generate validation errors
const NumberFromStringCodec = new t.Type<number, string, unknown>(
  'NumberFromString',
  (u): u is number => typeof u === 'number',
  (u, c) => {
    if (typeof u !== 'string') {
      return t.failure(u, c);
    }
    const n = Number(u);
    return isNaN(n) ? t.failure(u, c) : t.success(n);
  },
  (n) => String(n),
);

/**
 * Define API specification
 */
const UserApi = apiSpec({
  user: {
    get: httpRoute({
      path: '/users/{userId}',
      method: 'GET',
      request: httpRequest({
        params: {
          // This codec will fail when 'abc' is passed, generating validation errors
          userId: NumberFromStringCodec,
        },
      }),
      response: {
        200: t.type({
          id: t.string,
          name: t.string,
          email: t.string,
        }),
        404: t.type({
          message: t.string,
        }),
      },
    }),
  },
});

/**
 * Define handler for the user API using typed-express-router pattern
 */
const getUserHandler = (req: express.Request & { decoded: { userId: number } }) => {
  const userId = req.decoded.userId;

  if (userId === 123) {
    return {
      type: 200 as const,
      payload: {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      },
    };
  }

  return {
    type: 404 as const,
    payload: {
      message: `User with ID ${userId} not found`,
    },
  };
};

/**
 * Integration test for jsonapi-error-reporter
 */
test('JSONAPIErrorReporter integration test', async () => {
  // Direct test of the error formatter - should be reliable
  const result = NumberFromStringCodec.decode('abc');

  // Get errors using fp-ts either
  let errors: t.Errors = [];
  pipe(
    result,
    E.fold(
      (errs) => {
        errors = errs;
      },
      () => {
        assert.fail('Decoding should have failed');
      },
    ),
  );

  // Format errors using JSONAPIErrorReporter
  const errorResponse = JSONAPIErrorReporter.report(errors);

  // Verify JSON API format in direct test
  assert.ok(Array.isArray(errorResponse.errors));
  assert.ok(errorResponse.errors.length > 0);
  assert.strictEqual(errorResponse.errors[0]?.status, '422');
  assert.strictEqual(errorResponse.errors[0]?.title, 'Validation Error');
  assert.ok(errorResponse.errors[0]?.detail);
  assert.ok(errorResponse.errors[0]?.source);
  assert.ok(errorResponse.errors[0]?.source?.pointer);

  // First create the Express app
  const app = express();
  app.use(express.json());

  // Use our createJSONApiRouter function that has proper JSON API error handling built-in
  const router = createJSONApiRouter({
    spec: UserApi,
  });

  // Set up route handlers
  // Because our createJSONApiRouter wraps typed-express-router with our JSON API error handling,
  // we don't need to manually add error handling middleware
  router.get('user', [getUserHandler]);

  // Mount the router to our Express app
  app.use(router);

  // Create test server and API client
  const server = supertest(app);

  // Test for validation errors using direct HTTP request
  // This should result in HTTP 422 with JSON API format errors
  const errorResult = await server
    .get('/users/abc') // Using string when a number is expected
    .set('Accept', 'application/json');

  // Print out the raw error response for inspection
  console.log('\n----- Raw API Error Response -----');
  console.log(`Status: ${errorResult.status}`);
  console.log('Headers:', JSON.stringify(errorResult.headers, null, 2));
  console.log('Body:', JSON.stringify(errorResult.body, null, 2));
  console.log('----------------------------------\n');

  // Verify HTTP status code
  assert.strictEqual(errorResult.status, 422, 'Expected 422 status code');

  // Verify error response structure follows JSON API format
  const apiErrorResponse = errorResult.body;
  assert.ok(apiErrorResponse.errors, 'Missing errors array in response');
  assert.ok(
    Array.isArray(apiErrorResponse.errors),
    'Response errors should be an array',
  );
  assert.ok(apiErrorResponse.errors.length > 0, 'No errors in response array');

  // Check first error has expected format
  const firstError = apiErrorResponse.errors[0];
  assert.strictEqual(firstError.status, '422', 'Error status should be 422');
  assert.strictEqual(firstError.title, 'Validation Error', 'Wrong error title');
  assert.ok(firstError.detail, 'Missing error detail');
  assert.ok(firstError.source, 'Missing source in error');
  assert.ok(firstError.source.pointer, 'Missing pointer in error source');
});
