import test from 'ava';

import { flow } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';

import { bindRoute } from '../src/router';

type Request = {
  path: string;
  method: string;
};

const testMatcher = (path: string, method: string) => (req: Request) => {
  if (req.path === path && req.method === method) {
    return req;
  } else {
    return undefined;
  }
};

const matcher = testMatcher('/test', 'GET');
const route = bindRoute(matcher)((req) =>
  TE.left({ status: 200, message: 'hi', path: req.path }),
);

test('executes the bound function if the route matches', async (t) => {
  const response = await route({ path: '/test', method: 'GET' })();
  t.true(E.isLeft(response));
  t.deepEqual(response, E.left({ status: 200, message: 'hi', path: '/test' }));
});

test('skips bound function if route does not match', async (t) => {
  const response = await route({ path: '/notfound', method: 'GET' })();
  t.false(E.isLeft(response));
});

const secondRoute = bindRoute(testMatcher('/alt', 'GET'))((_req) =>
  TE.left({ message: 'cool' }),
);

const testRouter = flow(route, TE.chain(secondRoute));

test('matches the first route in a chain', async (t) => {
  const response = await testRouter({ path: '/test', method: 'GET' })();
  t.true(E.isLeft(response));
  t.deepEqual(response, E.left({ status: 200, message: 'hi', path: '/test' }));
});

test('matches the second route in a chain', async (t) => {
  const response = await testRouter({ path: '/alt', method: 'GET' })();
  t.true(E.isLeft(response));
  t.deepEqual(response, E.left({ message: 'cool' }));
});
