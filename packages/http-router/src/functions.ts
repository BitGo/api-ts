import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import * as t from 'io-ts';

import { applyMiddleware, SplatMiddleware } from './middleware';

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
