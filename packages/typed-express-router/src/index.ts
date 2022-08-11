import { ApiSpec, HttpRoute, KeyToHttpStatus } from '@api-ts/io-ts-http';
import express from 'express';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { defaultOnDecodeError, defaultOnEncodeError } from './errors';
import { apiTsPathToExpress } from './path';
import {
  AddAliasRouteHandler,
  AddRouteHandler,
  Methods,
  WrappedRouteOptions,
  WrappedRouter,
  WrappedRouterOptions,
} from './types';

export type {
  AfterEncodedResponseSentFn,
  OnDecodeErrorFn,
  OnEncodeErrorFn,
  TypedRequestHandler,
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
  }: WrappedRouteOptions<HttpRoute>,
): WrappedRouter<Spec> {
  function makeAddAliasRoute<Method extends Methods>(
    method: Method,
  ): AddAliasRouteHandler<Spec, Method> {
    return (path, apiName, handlers, options) => {
      const route: HttpRoute = spec[apiName as keyof Spec]![method]!;
      const wrapReqAndRes: express.RequestHandler = (req, res, next) => {
        pipe(
          route.request.decode(req),
          E.matchW(
            (errs) => (options?.onDecodeError ?? onDecodeError)(errs, req, res),
            (decoded) => {
              // Gotta cast to mutate this in place
              (req as any).decoded = decoded;
              (res as any).sendEncoded = (
                status: keyof typeof route['response'],
                payload: any,
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
                    throw new Error(
                      `response does not match expected type ${codec.name}`,
                    );
                  }
                  const encoded = codec.encode(payload);
                  res.status(statusCode).json(encoded).end();
                  (options?.afterEncodedResponseSent ?? afterEncodedResponseSent)(
                    status,
                    payload,
                    req,
                    res,
                  );
                } catch (err) {
                  (options?.onEncodeError ?? onEncodeError)(err, req, res);
                }
              };
              next();
            },
          ),
        );
      };

      router[method](path, [wrapReqAndRes, ...(handlers as express.RequestHandler[])]);
    };
  }

  function makeAddRoute<Method extends Methods>(
    method: Method,
  ): AddRouteHandler<Spec, Method> {
    return (apiName, handlers, options) => {
      const path = spec[apiName as keyof typeof spec]![method]!.path;
      return makeAddAliasRoute(method)(
        apiTsPathToExpress(path),
        apiName,
        handlers,
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
      getAlias: makeAddAliasRoute('get'),
      postAlias: makeAddAliasRoute('post'),
      putAlias: makeAddAliasRoute('put'),
      deleteAlias: makeAddAliasRoute('delete'),
      getUnchecked: router.get,
      postUnchecked: router.post,
      putUnchecked: router.put,
      deleteUnchecked: router.delete,
    },
  );

  Object.setPrototypeOf(result, Object.getPrototypeOf(router));

  return result;
}
