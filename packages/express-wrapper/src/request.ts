import { HttpRoute } from '@api-ts/io-ts-http';
import { pipe } from 'fp-ts/lib/function';
import * as TE from 'fp-ts/TaskEither';
import * as t from 'io-ts';
import * as PathReporter from 'io-ts/lib/PathReporter';

import { ExpressRequestEnv, ExpressResponseSent } from './routeHandler';

export function decodeExpressRequest<Route extends HttpRoute>({
  req,
  res,
  route,
}: ExpressRequestEnv<Route>): TE.TaskEither<
  ExpressResponseSent,
  t.TypeOf<Route['request']>
> {
  return pipe(
    TE.fromEither(route.request.decode(req)),
    TE.orElse((errs) => {
      const validationErrors = PathReporter.failure(errs);
      const validationErrorMessage = validationErrors.join('\n');
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.write(JSON.stringify({ error: validationErrorMessage }));
      res.end();
      return TE.left(ExpressResponseSent);
    }),
  );
}
