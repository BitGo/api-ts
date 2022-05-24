/**
 * express-wrapper
 * A simple, type-safe web server
 */

import express from 'express';
import * as PathReporter from 'io-ts/lib/PathReporter';

import { HttpRoute, RequestType } from '@api-ts/io-ts-http';

import type { NumericOrKeyedResponseType, ResponseEncoder } from './response';

export type ServiceFunction<R extends HttpRoute> = (
  input: RequestType<R>,
) => NumericOrKeyedResponseType<R> | Promise<NumericOrKeyedResponseType<R>>;

export type RouteHandler<R extends HttpRoute> =
  | ServiceFunction<R>
  | { middleware: express.RequestHandler[]; handler: ServiceFunction<R> };

export const getServiceFunction = <R extends HttpRoute>(
  routeHandler: RouteHandler<R>,
): ServiceFunction<R> =>
  'handler' in routeHandler ? routeHandler.handler : routeHandler;

export const getMiddleware = <R extends HttpRoute>(
  routeHandler: RouteHandler<R>,
): express.RequestHandler[] =>
  'middleware' in routeHandler ? routeHandler.middleware : [];

/**
 * Dynamically assign a function name to avoid anonymous functions in stack traces
 * https://stackoverflow.com/a/69465672
 */
const createNamedFunction = <F extends (...args: any) => void>(
  name: string,
  fn: F,
): F => Object.defineProperty(fn, 'name', { value: name });

export const decodeRequestAndEncodeResponse = (
  apiName: string,
  httpRoute: HttpRoute,
  handler: ServiceFunction<HttpRoute>,
  responseEncoder: ResponseEncoder,
): express.RequestHandler => {
  return createNamedFunction(
    'decodeRequestAndEncodeResponse' + httpRoute.method + apiName,
    async (req, res, next) => {
      const maybeRequest = httpRoute.request.decode(req);
      if (maybeRequest._tag === 'Left') {
        console.log('Request failed to decode');
        const validationErrors = PathReporter.failure(maybeRequest.left);
        const validationErrorMessage = validationErrors.join('\n');
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify({ error: validationErrorMessage }));
        res.end();
        return;
      }

      let rawResponse: NumericOrKeyedResponseType<HttpRoute> | undefined;
      try {
        rawResponse = await handler(maybeRequest.right);
      } catch (err) {
        console.warn('Error in route handler:', err);
        res.status(500).end();
        next();
        return;
      }

      const expressHandler = responseEncoder(httpRoute, rawResponse);
      expressHandler(req, res, next);
    },
  );
};
