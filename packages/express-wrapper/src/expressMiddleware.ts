import { HttpRoute, RequestType } from '@api-ts/io-ts-http';
import type { RequestHandler } from 'express';
import * as E from 'fp-ts/Either';

import type { NumericOrKeyedResponseType } from './response';
import type { ExpressRequestEnv, RouteHandler } from './routeHandler';

export type ServiceFunction<R extends HttpRoute> = (
  input: RequestType<R>,
) => Promise<NumericOrKeyedResponseType<R>>;

export type LegacyRouteHandler<R extends HttpRoute> =
  | ServiceFunction<R>
  | { middleware: RequestHandler[]; handler: ServiceFunction<R> };

export const getServiceFunction = <R extends HttpRoute>(
  routeHandler: LegacyRouteHandler<R>,
): ServiceFunction<R> =>
  'handler' in routeHandler ? routeHandler.handler : routeHandler;

export const getMiddleware = <R extends HttpRoute>(
  routeHandler: LegacyRouteHandler<R>,
): RequestHandler[] => ('middleware' in routeHandler ? routeHandler.middleware : []);

/**
 * Compatibility function to "lift" an express middleware into the api-ts pipeline.
 *
 * @param requestHandler - The express middleware
 * @returns {(input) => RouteHandler} a route handler to use in request pipelines
 */
export function wrapExpressMiddleware(
  requestHandler: RequestHandler,
): <Input>(input: Input) => RouteHandler<ExpressRequestEnv, unknown, Input> {
  return (input) =>
    ({ req, res }) => {
      // Manually construct the Promise so that we can use it to simulate `next`
      return () =>
        new Promise((resolve) => {
          // In this case we need the opposite logic from E.fromNullable
          const next = (nextParam?: unknown) =>
            nextParam === undefined
              ? resolve(E.right(input))
              : resolve(E.left(nextParam));

          try {
            requestHandler(req, res, next);
          } catch (err) {
            resolve(E.left(err));
          }
        });
    };
}
