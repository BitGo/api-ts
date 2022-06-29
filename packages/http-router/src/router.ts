import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';

export type RouteHandler<Input, Response, Next = Input> = (
  req: Input,
) => TE.TaskEither<Response, Next>;

export type MatcherFn = (req: any) => {} | undefined;

type MatcherInput<M extends MatcherFn> = M extends (req: infer Input) => any
  ? Input
  : never;
type Defined<T> = T extends undefined ? never : T;
type MatcherEnv<M extends MatcherFn> = Defined<ReturnType<M>>;

export function bindRoute<M extends MatcherFn>(matcher: M) {
  return <Response>(handler: RouteHandler<MatcherEnv<M>, Response, any>) => {
    const matchAndHandle: RouteHandler<MatcherInput<M>, Response> = (req) => {
      const env = matcher(req) as MatcherEnv<M> | undefined;
      if (env !== undefined) {
        return pipe(
          handler(env),
          TE.map(() => req),
        );
      } else {
        return TE.right(req);
      }
    };
    return matchAndHandle;
  };
}
