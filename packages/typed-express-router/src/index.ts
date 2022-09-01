/*
 * @api-ts/typed-express-router
 */

import { ApiSpec, HttpRoute, KeyToHttpStatus } from '@api-ts/io-ts-http';
import express from 'express';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { defaultOnDecodeError, defaultOnEncodeError } from './errors';
import { apiTsPathToExpress } from './path';
import {
  AddRouteHandler,
  AddUncheckedRouteHandler,
  Methods,
  UncheckedRequestHandler,
  WrappedRequest,
  WrappedResponse,
  WrappedRouteOptions,
  WrappedRouter,
  WrappedRouterOptions,
} from './types';

export type {
  AfterEncodedResponseSentFn,
  OnDecodeErrorFn,
  OnEncodeErrorFn,
  TypedRequestHandler,
  UncheckedRequestHandler,
  WrappedRouter,
  WrappedRouteOptions,
  WrappedRouterOptions,
  WrappedRequest,
  WrappedResponse,
} from './types';

/**
 * Creates a new Express router and wraps it with the specified api-ts spec
 *
 * @param spec {ApiSpec} the api-ts spec to associate with the router
 * @param options {WrappedRouterOptions} Express router options as well as default error handlers and hooks to use for routes
 * @returns {WrappedRouter} the wrapped Express router
 */
export function createRouter<Spec extends ApiSpec>(
  spec: Spec,
  {
    onDecodeError,
    onEncodeError,
    afterEncodedResponseSent,
    ...options
  }: WrappedRouterOptions = {},
): WrappedRouter<Spec> {
  const router = express.Router(options);
  return wrapRouter(router, spec, {
    onDecodeError,
    onEncodeError,
    afterEncodedResponseSent,
  });
}

/**
 * Wraps an existing Express router
 *
 * @param router {express.Router} the Express router to wrap
 * @param spec {ApiSpec} the api-ts spec to associate with the router
 * @param options {WrappedRouteOptions} default error handlers and hooks to use for routes
 * @returns {WrappedRouter} the wrapped Express router
 */
export function wrapRouter<Spec extends ApiSpec>(
  router: express.Router,
  spec: Spec,
  {
    onDecodeError = defaultOnDecodeError,
    onEncodeError = defaultOnEncodeError,
    afterEncodedResponseSent = () => {},
  }: WrappedRouteOptions,
): WrappedRouter<Spec> {
  const routerMiddleware: UncheckedRequestHandler[] = [];

  function makeAddUncheckedRoute<Method extends Methods>(
    method: Method,
  ): AddUncheckedRouteHandler<Spec, Method> {
    return (apiName, handlers, options) => {
      const route: HttpRoute | undefined = spec[apiName]?.[method];
      if (route === undefined) {
        // Should only happen with an explicit undefined property, which we can only prevent at the
        // type level with the `exactOptionalPropertyTypes` tsconfig option
        throw Error(`Method "${method}" at "${apiName}" must not be "undefined"'`);
      }
      const wrapReqAndRes: UncheckedRequestHandler = (req, res, next) => {
        const decoded = route.request.decode(req);
        req.decoded = decoded;
        req.apiName = apiName;
        req.httpRoute = route;
        res.sendEncoded = (
          status: keyof typeof route['response'],
          payload: unknown,
        ) => {
          try {
            const codec = route.response[status];
            if (!codec) {
              throw new Error(`no codec defined for response status ${status}`);
            }
            const statusCode =
              typeof status === 'number'
                ? status
                : KeyToHttpStatus[status as keyof KeyToHttpStatus];
            if (statusCode === undefined) {
              throw new Error(`unknown HTTP status code for key ${status}`);
            } else if (!codec.is(payload)) {
              throw new Error(`response does not match expected type ${codec.name}`);
            }
            const encoded = codec.encode(payload);
            res.status(statusCode).json(encoded).end();
            (options?.afterEncodedResponseSent ?? afterEncodedResponseSent)(
              statusCode,
              payload,
              req as WrappedRequest,
              res as WrappedResponse,
            );
          } catch (err) {
            (options?.onEncodeError ?? onEncodeError)(
              err,
              req as WrappedRequest,
              res as WrappedResponse,
            );
          }
        };
        next();
      };

      const middlewareChain = [
        wrapReqAndRes,
        ...routerMiddleware,
        ...handlers,
      ] as express.RequestHandler[];

      const path = spec[apiName as keyof typeof spec]![method]!.path;
      router[method](apiTsPathToExpress(path), middlewareChain);

      options?.routeAliases?.forEach((alias) => {
        router[method](alias, middlewareChain);
      });
    };
  }

  function makeAddRoute<Method extends Methods>(
    method: Method,
  ): AddRouteHandler<Spec, Method> {
    return (apiName, handlers, options) => {
      const validateMiddleware: UncheckedRequestHandler<
        Spec,
        typeof apiName,
        Method
      > = (req, res, next) => {
        pipe(
          req.decoded,
          E.matchW(
            (errs) => {
              (options?.onDecodeError ?? onDecodeError)(errs, req, res);
            },
            (value) => {
              req.decoded = value;
              next();
            },
          ),
        );
      };

      return makeAddUncheckedRoute(method)(
        apiName,
        [validateMiddleware, ...(handlers as express.RequestHandler[])],
        options,
      );
    };
  }

  const result: WrappedRouter<Spec> = Object.assign(
    (req: express.Request, res: express.Response, next: express.NextFunction) =>
      router.call(router, req, res, next),
    {
      ...router,
      get: makeAddRoute('get'),
      post: makeAddRoute('post'),
      put: makeAddRoute('put'),
      delete: makeAddRoute('delete'),
      getUnchecked: makeAddUncheckedRoute('get'),
      postUnchecked: makeAddUncheckedRoute('post'),
      putUnchecked: makeAddUncheckedRoute('put'),
      deleteUnchecked: makeAddUncheckedRoute('delete'),
      use: (middleware: UncheckedRequestHandler) => {
        routerMiddleware.push(middleware);
      },
    },
  );

  Object.setPrototypeOf(result, Object.getPrototypeOf(router));

  return result;
}
