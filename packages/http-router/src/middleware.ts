import { flow } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

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

export function applyMiddlewareFn<Response>(onError: (err: unknown) => Response) {
  return <Props, Env>(
    middleware: MiddlewareFn<Props, Env>,
  ): SplatMiddleware<Response, Props, Env> => {
    const middlewareTE = TE.tryCatchK((env: Env) => middleware(env), onError);
    return applyMiddleware(middlewareTE);
  };
}

export function middleware<Env, Response, A>(
  a: Middleware<Response, A, Env>,
): RouteHandler<Env, Response, A>;
export function middleware<Env, Response, ResponseB, A, B>(
  a: Middleware<Response, A, Env>,
  b: (a: A) => Middleware<ResponseB, B, Env>,
): RouteHandler<Env, Response | ResponseB, A>;
export function middleware<Env, Response, ResponseB, ResponseC, A, B, C>(
  a: Middleware<Response, A, Env>,
  b: (a: A) => Middleware<ResponseB, B, Env>,
  c: (b: B) => Middleware<ResponseC, C, Env>,
): RouteHandler<Env, Response | ResponseB | ResponseC, A>;
export function middleware<Env, Response, ResponseB, ResponseC, ResponseD, A, B, C, D>(
  a: Middleware<Response, A, Env>,
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
  a: Middleware<Response, A, Env>,
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
  a: Middleware<Response, A, Env>,
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
  return (env: any) => {
    const apMiddleware = (mw: any) => (input: any) => mw(input, env);
    const chainMiddleware = (mw: any) => TE.chainW(apMiddleware(mw));

    if (b === undefined) {
      return apMiddleware(a);
    } else if (c === undefined) {
      return flow(apMiddleware(a), chainMiddleware(b));
    } else if (d === undefined) {
      return flow(apMiddleware(a), chainMiddleware(b), chainMiddleware(c));
    } else if (e === undefined) {
      return flow(
        apMiddleware(a),
        chainMiddleware(b),
        chainMiddleware(c),
        chainMiddleware(d),
      );
    } else if (f === undefined) {
      return flow(
        apMiddleware(a),
        chainMiddleware(b),
        chainMiddleware(c),
        chainMiddleware(d),
        chainMiddleware(e),
      );
    } else {
      return flow(
        apMiddleware(a),
        chainMiddleware(b),
        chainMiddleware(c),
        chainMiddleware(d),
        chainMiddleware(e),
        chainMiddleware(f),
      );
    }
  };
}
