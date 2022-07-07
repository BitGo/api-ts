import { flow } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as RTE from 'fp-ts/ReaderTaskEither';

import type { RouteHandler } from './router';

type MiddlewareNext<Input, MiddlewareProps> = Omit<Input, keyof MiddlewareProps> &
  MiddlewareProps;

export type Middleware<Response, Props, Env> = (
  env: Env,
) => TE.TaskEither<Response, Props>;

export type SplatMiddleware<Response, Props, Env> = <Input>(
  input: Input,
) => (env: Env) => TE.TaskEither<Response, MiddlewareNext<Input, Props>>;

export function applyMiddleware<Response, Props, Env>(
  middleware: Middleware<Response, Props, Env>,
): SplatMiddleware<Response, Props, Env> {
  return <Input>(input: Input) =>
    flow(
      middleware,
      TE.map((props) => ({
        ...input,
        ...props,
      })),
    );
}

export type MiddlewareFn<Props, Env> = (req: Env) => Promise<Props>;

export function applyMiddlewareFn<Response, Props, Env>(
  middleware: MiddlewareFn<Props, Env>,
  onThrow: (err: unknown) => Response,
): SplatMiddleware<Response, Props, Env> {
  const middlewareTE = TE.tryCatchK((env: Env) => middleware(env), onThrow);
  return applyMiddleware(middlewareTE);
}

export type ServiceFn<Input, Next, Env> = (input: Input, env: Env) => Promise<Next>;

export type ApplyServiceFn<Input, Response, Next, Env> = (
  fn: ServiceFn<Input, Next, Env>,
  onThrow: (err: unknown) => Response,
) => (input: Input) => (env: Env) => TE.TaskEither<Response, Next>;

export function applyServiceFn<Input, Response, Next, Env>(
  fn: ServiceFn<Input, Next, Env>,
  onThrow: (err: unknown, env: Env) => Response,
): (input: Input) => Middleware<Response, Next, Env> {
  return (input) => (env) =>
    TE.tryCatch(
      () => fn(input, env),
      (err) => onThrow(err, env),
    );
}

export function middleware<Env, Response, A>(
  a: (_: {}) => Middleware<Response, A, Env>,
): RouteHandler<Env, Response, A>;
export function middleware<Env, Response, ResponseB, A, B>(
  a: (_: {}) => Middleware<Response, A, Env>,
  b: (a: A) => Middleware<ResponseB, B, Env>,
): RouteHandler<Env, Response | ResponseB, A>;
export function middleware<Env, Response, ResponseB, ResponseC, A, B, C>(
  a: (_: {}) => Middleware<Response, A, Env>,
  b: (a: A) => Middleware<ResponseB, B, Env>,
  c: (b: B) => Middleware<ResponseC, C, Env>,
): RouteHandler<Env, Response | ResponseB | ResponseC, A>;
export function middleware<Env, Response, ResponseB, ResponseC, ResponseD, A, B, C, D>(
  a: (_: {}) => Middleware<Response, A, Env>,
  b: (a: A) => Middleware<ResponseB, B, Env>,
  c: (b: B) => Middleware<ResponseC, C, Env>,
  d: (c: C) => Middleware<ResponseD, D, Env>,
): RouteHandler<Env, Response | ResponseB | ResponseC | ResponseD, A>;
export function middleware<
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
  a: (_: {}) => Middleware<Response, A, Env>,
  b: (a: A) => Middleware<ResponseB, B, Env>,
  c: (b: B) => Middleware<ResponseC, C, Env>,
  d: (c: C) => Middleware<ResponseD, D, Env>,
  e: (d: D) => Middleware<ResponseE, E, Env>,
): RouteHandler<Env, Response | ResponseB | ResponseC | ResponseD | ResponseE, A>;
export function middleware<
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
  a: (_: {}) => Middleware<Response, A, Env>,
  b: (a: A) => Middleware<ResponseB, B, Env>,
  c: (b: B) => Middleware<ResponseC, C, Env>,
  d: (c: C) => Middleware<ResponseD, D, Env>,
  e: (d: D) => Middleware<ResponseE, E, Env>,
  f: (e: E) => Middleware<ResponseF, F, Env>,
): RouteHandler<
  Env,
  Response | ResponseB | ResponseC | ResponseD | ResponseE | ResponseF,
  A
>;

// I could not figure out how to make this signature any narrower without TS complaining that it
// didn't match the declared overloads above.
export function middleware(a: any, b?: any, c?: any, d?: any, e?: any, f?: any) {
  let currentMW = a;
  let currentRTE: RTE.ReaderTaskEither<unknown, unknown, unknown> = a({});
  const rest = [b, c, d, e, f];
  while ((currentMW = rest.shift()) !== undefined) {
    currentRTE = RTE.chain(currentMW)(currentRTE);
  }
  return currentRTE;
}
