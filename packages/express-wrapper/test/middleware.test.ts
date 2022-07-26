import test from 'ava';
import express from 'express';

import { middlewareFn, runMiddlewareChain } from '../src/middleware';

// None of these test functions actually use the `req` or `res`, so they can be unsafely stubbed like this
const REQ = {} as express.Request;
const RES = {} as express.Response;

const noopMiddleware: express.RequestHandler = (_req, _res, next) => {
  next();
};

const errorMiddleware: express.RequestHandler = (_req, _res, next) => {
  next(new Error('aaaah'));
};

const altErrorMiddleware: express.RequestHandler = (_req, _res, next) => {
  next(new Error('noooo'));
};

const addParamMiddleware = middlewareFn(async () => ({
  addedValue: 1337,
}));

const addAltParamMiddleware = middlewareFn(async () => ({
  addedValue: 'hello',
}));

test('should work with normal express middleware', async (t) => {
  const result = await runMiddlewareChain({ foo: 'test' }, [noopMiddleware], REQ, RES);
  t.deepEqual(result, { foo: 'test' });
});

test('should handle errors passed to next()', async (t) => {
  await t.throwsAsync(
    runMiddlewareChain({ foo: 'test' }, [errorMiddleware], null as any, null as any),
  );
});

test('should work with middleware that return values', async (t) => {
  const result = await runMiddlewareChain(
    { foo: 'test' },
    [addParamMiddleware],
    REQ,
    RES,
  );
  t.deepEqual(result, { foo: 'test', addedValue: 1337 });
});

test('express and value-producing middleware should work together in any order', async (t) => {
  const result = await runMiddlewareChain(
    { foo: 'test' },
    [noopMiddleware, addParamMiddleware],
    REQ,
    RES,
  );
  t.deepEqual(result, { foo: 'test', addedValue: 1337 });

  const resultB = await runMiddlewareChain(
    { foo: 'test' },
    [addParamMiddleware, noopMiddleware],
    REQ,
    RES,
  );
  t.deepEqual(resultB, { foo: 'test', addedValue: 1337 });
});

test('middlewares that set the same value should use the last one in the chain', async (t) => {
  const result = await runMiddlewareChain(
    { foo: 'test' },
    [addParamMiddleware, addAltParamMiddleware],
    REQ,
    RES,
  );
  t.deepEqual(result, { foo: 'test', addedValue: 'hello' });

  const resultB = await runMiddlewareChain(
    { foo: 'test' },
    [addAltParamMiddleware, addParamMiddleware],
    REQ,
    RES,
  );
  t.deepEqual(resultB, { foo: 'test', addedValue: 1337 });
});

test('error-producing middleware should not run subsequent middleware', async (t) => {
  await t.throwsAsync(
    runMiddlewareChain(
      { foo: 'test' },
      [errorMiddleware, altErrorMiddleware],
      null as any,
      null as any,
    ),
  );
});
