import type { Middleware } from '@api-ts/http-router';
import { HttpRoute, RequestType } from '@api-ts/io-ts-http';
import type { RequestHandler } from 'express';
import * as E from 'fp-ts/Either';

import type { NumericOrKeyedResponseType } from './response';
import type { ExpressRequestEnv } from './routeHandler';

export type ServiceFunction<R extends HttpRoute> = (
  input: RequestType<R>,
) => Promise<NumericOrKeyedResponseType<R>>;

export type RouteHandler<R extends HttpRoute> =
  | ServiceFunction<R>
  | { middleware: RequestHandler[]; handler: ServiceFunction<R> };

export const getServiceFunction = <R extends HttpRoute>(
  routeHandler: RouteHandler<R>,
): ServiceFunction<R> =>
  'handler' in routeHandler ? routeHandler.handler : routeHandler;

export const getMiddleware = <R extends HttpRoute>(
  routeHandler: RouteHandler<R>,
): RequestHandler[] => ('middleware' in routeHandler ? routeHandler.middleware : []);

/**
 * Compatibility function to "lift" an express middleware into the api-ts pipeline.
 *
 * @param requestHandler - The express middleware
 * @returns
 */
export function wrapExpressMiddleware(
  requestHandler: RequestHandler,
): Middleware<unknown, {}, ExpressRequestEnv> {
  return ({ req, res }) => {
    // Manually construct the Promise so that we can use it to simulate `next`
    return () =>
      new Promise((resolve) => {
        // In this case we need the opposite logic from E.fromNullable
        const next = (nextParam?: unknown) =>
          nextParam === undefined ? resolve(E.right({})) : resolve(E.left(nextParam));

        requestHandler(req, res, next);
      });
  };
}
