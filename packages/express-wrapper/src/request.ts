import { HttpRoute } from '@api-ts/io-ts-http';
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';
import * as t from 'io-ts';
import * as PathReporter from 'io-ts/lib/PathReporter';

import { ExpressRequestEnv } from './routeHandler';

export function decodeExpressRequest<Route extends HttpRoute, Input extends {}>(
  input: Input,
  { req, res, route }: ExpressRequestEnv<Route>,
): TE.TaskEither<undefined, t.TypeOf<Route['request']>> {
  return pipe(
    TE.fromEither(route.request.decode(req)),
    TE.orElse((errs) => {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      try {
        const validationErrors = PathReporter.failure(errs);
        const validationErrorMessage = validationErrors.join('\n');
        res.write(JSON.stringify({ error: validationErrorMessage }));
      } catch (err) {
        // This can happen with `PathReporter` if a bigint is involved
        // Write a generic response instead for now
        res.write({ error: 'Invalid request' });
      }
      res.end();
      return TE.left(undefined);
    }),
    TE.map((props) => ({
      ...input,
      ...props,
    })),
  );
}
