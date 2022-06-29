import { flow, pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as TE from 'fp-ts/TaskEither';
import * as t from 'io-ts';

import type { RouteHandler } from './router';
import { applyMiddleware, SplatMiddleware } from './middleware';

export type ServiceFn<Request, Response> = (req: Request) => Promise<Response>;

export function applyServiceFn<Response>(
  onError: (err: unknown) => Response,
): <Request>(
  fn: ServiceFn<Request, Response>,
) => RouteHandler<Request, Response, never> {
  return (fn) => flow(TE.tryCatchK(fn, onError), TE.matchW(E.left, E.left));
}

export type RequestEnv = {
  req: unknown;
  route: {
    request: t.Mixed;
  };
};

export function decodeRequest<Error>(
  onError: (err: t.Errors) => Error,
): (
  req: unknown,
) => <Env extends RequestEnv>(
  env: Env,
) => TE.TaskEither<Error, t.TypeOf<Env['route']['request']>> {
  return () =>
    ({ req, route: { request } }) =>
      pipe(TE.fromEither(request.decode(req)), TE.mapLeft(onError));
}

export function decodeRequestWith<Codec extends t.Mixed>(
  codec: Codec,
): SplatMiddleware<t.Errors, t.TypeOf<Codec>, {}> {
  return applyMiddleware(TE.fromEitherK(codec.decode));
}
