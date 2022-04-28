/**
 * express-wrapper
 * A simple, type-safe web server
 */

import express from 'express';
import * as t from 'io-ts';
import * as PathReporter from 'io-ts/lib/PathReporter';

import {
  HttpRoute,
  HttpToKeyStatus,
  KeyToHttpStatus,
  RequestType,
  ResponseType,
} from '@api-ts/io-ts-http';

type NumericOrKeyedResponseType<R extends HttpRoute> =
  | ResponseType<R>
  | {
      [S in keyof R['response']]: S extends keyof HttpToKeyStatus
        ? {
            type: HttpToKeyStatus[S];
            payload: t.TypeOf<R['response'][S]>;
          }
        : never;
    }[keyof R['response']];

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

export const decodeRequestAndEncodeResponse = <Route extends HttpRoute>(
  apiName: string,
  httpRoute: Route,
  handler: ServiceFunction<Route>,
): express.RequestHandler => {
  return createNamedFunction(
    'decodeRequestAndEncodeResponse' + httpRoute.method + apiName,
    async (req, res) => {
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

      let rawResponse: NumericOrKeyedResponseType<Route> | undefined;
      try {
        rawResponse = await handler(maybeRequest.right);
      } catch (err) {
        console.warn('Error in route handler:', err);
        res.status(500).end();
        return;
      }

      const { type, payload } = rawResponse;
      const status = typeof type === 'number' ? type : (KeyToHttpStatus as any)[type];
      if (status === undefined) {
        console.warn('Unknown status code returned');
        res.status(500).end();
        return;
      }
      const responseCodec = httpRoute.response[status];
      if (responseCodec === undefined || !responseCodec.is(payload)) {
        console.warn(
          "Unable to encode route's return value, did you return the expected type?",
        );
        res.status(500).end();
        return;
      }

      res.status(status).json(responseCodec.encode(payload)).end();
    },
  );
};
