import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as RTE from 'fp-ts/ReaderTaskEither';

import type { RouteHandler } from './routeHandler';

type MiddlewareNext<Input, MiddlewareProps> = Omit<Input, keyof MiddlewareProps> &
  MiddlewareProps;

export type ServiceFn<Env, Input, Next> = (input: Input, env: Env) => Promise<Next>;

/**
 * Apply a middleware function to a request pipeline. A middleware function is one that reads from the Express
 * Request and Response objects, and uses them to populate fields that the controller action service function
 * will eventually use. For example, there could be a `authUser` middleware function that reads a token out of
 * the request headers, performs some kind of auth lookup, and returns a `{ user: User }` record. That `user`
 * property will be added to the set of properties from the other middleware functions in the chain.
 *
 * Middleware functions may terminate the request chain by throwing. For Express, it is assumed that they have
 * used the `res` object to actually write out a response before doing so. Response-side middleware should take
 * advantage of this.
 *
 * @param middleware {(env) => Promise<Record<string, any>>} the middleware function
 * @param onThrow {(err: unknown) => Response} function to map a thrown exception back to a usable result
 * @returns {(input) => RouteHandler} a middleware function to use in request pipelines
 */
export function applyMiddlewareFn<Env, Response, Next>(
  middleware: (env: Env) => Promise<Next>,
  onThrow: (err: unknown) => Response,
): <Input>(input: Input) => RouteHandler<Env, Response, MiddlewareNext<Input, Next>> {
  return (input) => (env: Env) =>
    pipe(
      TE.tryCatch(() => middleware(env), onThrow),
      TE.map((props) => ({
        ...input,
        ...props,
      })),
    );
}

/**
 * This is similar to `applyMiddlewareFn`, but accepts a TaskEither-aware function. This should be used to
 * wrap the `decodeExpressRequest` and `encodeExpressResponse` middlewares provided by this library.
 *
 * @param teFn {(input, env) => TE.TaskEither<Response, Next>} function returning a TaskEither
 * @returns {(input) => RouteHandler} a middleware function to use in request pipelines
 */
export function applyMiddleware<Env, Input, Response, Next>(
  teFn: (input: Input, env: Env) => TE.TaskEither<Response, Next>,
): (input: Input) => RouteHandler<Env, Response, Next> {
  return (input) => (env) => teFn(input, env);
}

/**
 * Apply a service function to a request pipeline. Service functions access the properties that were set by
 * preceding middleware, and use them to compute some kind of response object. Ideally a service function should
 * not use the second `ExpressRequestEnv` param, but it is available as an escape hatch if needed.
 *
 * Service functions should not throw or write out a response. The intended usage is for it to simply return a result
 * in a well-known format, and then a response-side middleware (such as `encodeExpressResponse`) should accept that
 * object and actually send it out.
 *
 * @param fn {(input: Input, env) => Promise<Record<string, any>>} the service function
 * @param onThrow {(err: unknown, env: ExpressRequestEnv) => Response} function to map a thrown exception back to a response type
 * @returns {(input) => RouteHandler} a middleware function to use in request pipelines
 */
export function applyServiceFn<Env, Input, Response, Next>(
  fn: ServiceFn<Env, Input, Next>,
  onThrow: (err: unknown, env: Env) => Response,
): (input: Input) => RouteHandler<Env, Response, Next> {
  return (input) => (env) =>
    TE.tryCatch(
      () => fn(input, env),
      (err) => onThrow(err, env),
    );
}

/**
 * Chain middleware and service functions together in a pipeline
 *
 * @param a the first middleware
 * @return {RouteHandler<Env, Response, A>} a route handler that can be passed to the router builder
 */
export function pipeline<Env, Response, A>(
  a: (_: {}) => RouteHandler<Env, Response, A>,
): RouteHandler<Env, Response, A>;
export function pipeline<Env, Response, ResponseB, A, B>(
  a: (_: {}) => RouteHandler<Env, Response, A>,
  b: (a: A) => RouteHandler<Env, ResponseB, B>,
): RouteHandler<Env, Response | ResponseB, A>;
export function pipeline<Env, Response, ResponseB, ResponseC, A, B, C>(
  a: (_: {}) => RouteHandler<Env, Response, A>,
  b: (a: A) => RouteHandler<Env, ResponseB, B>,
  c: (b: B) => RouteHandler<Env, ResponseC, C>,
): RouteHandler<Env, Response | ResponseB | ResponseC, A>;
export function pipeline<Env, Response, ResponseB, ResponseC, ResponseD, A, B, C, D>(
  a: (_: {}) => RouteHandler<Env, Response, A>,
  b: (a: A) => RouteHandler<Env, ResponseB, B>,
  c: (b: B) => RouteHandler<Env, ResponseC, C>,
  d: (c: C) => RouteHandler<Env, ResponseD, D>,
): RouteHandler<Env, Response | ResponseB | ResponseC | ResponseD, A>;
export function pipeline<
  Env,
  Response,
  ResponseB,
  ResponseC,
  ResponseD,
  ResponseE,
  A,
  B,
  C,
  D,
  E,
>(
  a: (_: {}) => RouteHandler<Env, Response, A>,
  b: (a: A) => RouteHandler<Env, ResponseB, B>,
  c: (b: B) => RouteHandler<Env, ResponseC, C>,
  d: (c: C) => RouteHandler<Env, ResponseD, D>,
  e: (d: D) => RouteHandler<Env, ResponseE, E>,
): RouteHandler<Env, Response | ResponseB | ResponseC | ResponseD | ResponseE, A>;
export function pipeline<
  Env,
  Response,
  ResponseB,
  ResponseC,
  ResponseD,
  ResponseE,
  ResponseF,
  A,
  B,
  C,
  D,
  E,
  F,
>(
  a: (_: {}) => RouteHandler<Env, Response, A>,
  b: (a: A) => RouteHandler<Env, ResponseB, B>,
  c: (b: B) => RouteHandler<Env, ResponseC, C>,
  d: (c: C) => RouteHandler<Env, ResponseD, D>,
  e: (d: D) => RouteHandler<Env, ResponseE, E>,
  f: (e: E) => RouteHandler<Env, ResponseF, F>,
): RouteHandler<
  Env,
  Response | ResponseB | ResponseC | ResponseD | ResponseE | ResponseF,
  A
>;

// I could not figure out how to make this signature any narrower without TS complaining that it
// didn't match the declared overloads above.
export function pipeline(a: any, b?: any, c?: any, d?: any, e?: any, f?: any) {
  let currentMW = a;
  let currentRTE: RTE.ReaderTaskEither<unknown, unknown, unknown> = a({});
  const rest = [b, c, d, e, f];
  while ((currentMW = rest.shift()) !== undefined) {
    currentRTE = RTE.chain(currentMW)(currentRTE);
  }
  return currentRTE;
}
