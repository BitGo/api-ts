import test from 'ava';
import * as E from 'fp-ts/Either';

import { applyMiddlewareFn, applyServiceFn, pipeline } from '../src/pipeline';

test('applyServiceFn wraps a normal function', async (t) => {
  const testFn = async (n: number) => n + 1;
  const testWrapped = applyServiceFn(testFn, () => -1);

  const result = await testWrapped(41)({})();
  t.deepEqual(result, E.right(42));
});

test('applyServiceFn wraps a normal throwing function', async (t) => {
  const testFn = async (n: number) => {
    throw n;
  };
  const testWrapped = applyServiceFn(testFn, () => -1);

  const result = await testWrapped(41)({})();
  t.deepEqual(result, E.left(-1));
});

test('applyMiddlewareFn wraps a normal function and splats the result', async (t) => {
  const testFn = async (num: number) => ({ num: num + 1 });
  const testWrapped = applyMiddlewareFn(testFn, () => -1);

  const result = await testWrapped({ foo: 'bar' })(41)();
  t.deepEqual(result, E.right({ foo: 'bar', num: 42 }));
});

test('applyMiddlewareFn wraps a normal throwing function', async (t) => {
  const testFn = async (num: number) => {
    throw num;
  };
  const testWrapped = applyMiddlewareFn(testFn, (num: unknown) => Number(num));

  const result = await testWrapped({})(41)();
  t.deepEqual(result, E.left(41));
});

test('middleware composes', async (t) => {
  const middlewareA = async (env: { foo: number; bar: number }) => ({
    fizz: env.foo,
  });
  const middlewareB = async (env: { foo: number; bar: number }) => ({
    buzz: env.bar,
  });
  const addFn = async (nums: { fizz: number; buzz: number }) => nums.fizz + nums.buzz;

  const reqHandler = pipeline(
    applyMiddlewareFn(middlewareA, () => 'oops'),
    applyMiddlewareFn(middlewareB, () => 'oops'),
    applyServiceFn(addFn, () => 'oops'),
  );

  const result = await reqHandler({ foo: 10, bar: 20 })();
  t.deepEqual(result, E.right(30));
});
