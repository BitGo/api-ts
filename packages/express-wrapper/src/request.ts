/**
 * express-wrapper
 * A simple, type-safe web server
 */

import express from 'express';
import * as PathReporter from 'io-ts/lib/PathReporter';

import { ApiSpec, HttpRoute, RequestType, ResponseType } from '@api-ts/io-ts-http';
import {
  OnDecodeErrorFn,
  OnEncodeErrorFn,
  TypedRequestHandler,
} from '@api-ts/typed-express-router';

import {
  runMiddlewareChain,
  runMiddlewareChainIgnoringResults,
  MiddlewareBrand,
  MiddlewareChain,
  MiddlewareChainOutput,
} from './middleware';
import type { KeyedResponseType, ResponseEncoder } from './response';

export type ServiceFunction<R extends HttpRoute, Input = RequestType<R>> =
  | ((input: Input) => ResponseType<R> | Promise<ResponseType<R>>)
  | ((input: Input) => KeyedResponseType<R> | Promise<KeyedResponseType<R>>);

// The first two alternatives are here to maintain backwards compatibility
export type RouteHandler<R extends HttpRoute> =
  | ServiceFunction<R>
  | {
      middleware: MiddlewareChain;
      handler: ServiceFunction<
        R,
        MiddlewareChainOutput<RequestType<R>, MiddlewareChain>
      >;
    }
  | {
      middleware: MiddlewareChain;
      handler: ServiceFunction<R>;
      // Marks this handler as being created via the `routeHandler` function, which enforces the types between
      // the middleware chain and the route handler that is accepts the additional properties
      [MiddlewareBrand]: true;
    };

/**
 * Produce a route handler that can use additional properties provided by middleware
 *
 * @param middleware a list of express request handlers. Ones created via `middlewareFn` will add additional properties to the decoded request
 * @returns a route handler for an api spec
 */
export function routeHandler<R extends HttpRoute>({
  handler,
}: {
  handler: ServiceFunction<R>;
}): RouteHandler<R>;

export function routeHandler<R extends HttpRoute, Chain extends MiddlewareChain>({
  middleware,
  handler,
}: {
  middleware: Chain;
  handler: ServiceFunction<R, MiddlewareChainOutput<RequestType<R>, Chain>>;
}): RouteHandler<R>;

export function routeHandler<R extends HttpRoute>({
  middleware = [],
  handler,
}: {
  middleware?: express.RequestHandler[];
  handler: ServiceFunction<R, any>;
}): RouteHandler<R> {
  // This function wouldn't be needed if TS had value/object level existential quantification, but since it doesn't we enforce the relationship
  // between the middleware chain and the handler's input params with this function and then assert the result.
  return { middleware, handler, [MiddlewareBrand]: true } as RouteHandler<R>;
}

export const getServiceFunction = <R extends HttpRoute>(
  routeHandler: RouteHandler<R>,
): ServiceFunction<R> =>
  'handler' in routeHandler ? routeHandler.handler : routeHandler;

export const getMiddleware = <R extends HttpRoute>(
  routeHandler: RouteHandler<R>,
): MiddlewareChain => ('middleware' in routeHandler ? routeHandler.middleware : []);

/**
 * Dynamically assign a function name to avoid anonymous functions in stack traces
 * https://stackoverflow.com/a/69465672
 */
const createNamedFunction = <F extends (...args: any) => void>(
  name: string,
  fn: F,
): F => Object.defineProperty(fn, 'name', { value: name });

export const onDecodeError: OnDecodeErrorFn = (errs, _req, res) => {
  const validationErrors = PathReporter.failure(errs);
  const validationErrorMessage = validationErrors.join('\n');
  res.writeHead(400, { 'Content-Type': 'application/json' });
  res.write(JSON.stringify({ error: validationErrorMessage }));
  res.end();
};

export const onEncodeError: OnEncodeErrorFn = (err, _req, res) => {
  console.warn('Error in route handler:', err);
  res.status(500).end();
};

export const handleRequest = (
  apiName: string,
  httpRoute: HttpRoute,
  handler: RouteHandler<HttpRoute>,
  responseEncoder: ResponseEncoder,
): TypedRequestHandler<ApiSpec, string, string> => {
  return createNamedFunction(
    'decodeRequestAndEncodeResponse' + httpRoute.method + apiName,
    async (req, res, next) => {
      try {
        const handlerParams =
          MiddlewareBrand in handler
            ? await runMiddlewareChain(req.decoded, getMiddleware(handler), req, res)
            : await runMiddlewareChainIgnoringResults(
                req.decoded,
                getMiddleware(handler),
                req,
                res,
              );
        const serviceFn = getServiceFunction(handler);

        const response = await serviceFn(handlerParams);
        responseEncoder(httpRoute, response)(req, res, next);
      } catch (err) {
        console.warn('Error in route handler:', err);
        res.status(500).end();
        next();
        return;
      }
    },
  );
};
