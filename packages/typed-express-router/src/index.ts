/*
 * @api-ts/typed-express-router
 */

import { ApiSpec, HttpRoute, KeyToHttpStatus } from '@api-ts/io-ts-http';
import express from 'express';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/pipeable';
import {
  defaultOnDecodeError,
  defaultOnEncodeError,
  defaultOnRequestTransformError,
  defaultOnResponseTransformError,
} from './errors';
import { apiTsPathToExpress } from './path';
import {
  AddRouteHandler,
  AddTransformedRouteHandler,
  AddUncheckedRouteHandler,
  ApiNamesWithMethod,
  Methods,
  TransformedRequest,
  TypedRequestHandler,
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
  WrappedRequest,
  WrappedResponse,
  WrappedRouteOptions,
  WrappedRouter,
  WrappedRouterOptions,
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
    afterEncodedResponseSent = () => {},
    onRequestTransformError = defaultOnRequestTransformError,
    onResponseTransformError = defaultOnResponseTransformError,
    ...options
  }: WrappedRouterOptions = {},
): WrappedRouter<Spec> {
  const router = express.Router(options);
  return wrapRouter(router, spec, {
    onDecodeError,
    onEncodeError,
    afterEncodedResponseSent,
    onRequestTransformError,
    onResponseTransformError,
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
    onRequestTransformError = defaultOnRequestTransformError,
    onResponseTransformError = defaultOnResponseTransformError,
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
        // Intentionally passing explicit arguments here instead of decoding
        // req by itself because of issues that arise while using Node 16
        // See https://github.com/BitGo/api-ts/pull/394 for more information.
        const decoded = route.request.decode({
          body: req.body,
          headers: req.headers,
          params: req.params,
          query: req.query,
        });
        req.decoded = decoded;
        req.apiName = apiName;
        req.httpRoute = route;
        res.sendEncoded = (
          status: keyof (typeof route)['response'],
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

  function makeValidateMiddleware<
    ApiName extends ApiNamesWithMethod<Spec, Method>,
    Method extends Methods,
  >(
    apiName: ApiName,
    options?: WrappedRouteOptions,
  ): UncheckedRequestHandler<Spec, typeof apiName, Method> {
    return (req, res, next) =>
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
  }

  function makeAddRoute<Method extends Methods>(
    method: Method,
  ): AddRouteHandler<Spec, Method> {
    return (apiName, handlers, options) =>
      makeAddUncheckedRoute(method)(
        apiName,
        [
          makeValidateMiddleware(apiName, options),
          ...(handlers as express.RequestHandler[]),
        ],
        options,
      );
  }

  function makeAddTransformedRoute<Method extends Methods>(
    method: Method,
  ): AddTransformedRouteHandler<Spec, Method> {
    return (apiName, handlers, options) => {
      const transformedHandlers = handlers.map(
        ({
          requestTransformer,
          responseTransformer,
          handler,
        }): TypedRequestHandler<Spec, typeof apiName, Method> =>
          (req, res, next): void => {
            const newReq = req as TransformedRequest<
              Parameters<typeof handler>[0]['decoded'],
              Parameters<typeof handler>[0]['transformed']
            >;
            // types dont overlap wrt sendEncoded's payload parameter,
            // but this is very much expected because we are transforming the payload
            // from WrappedResponse<TypeOfProps<NonNullable<Spec[ApiName][Method]>["response"]>>
            // to TransformedResponse<Spec, ApiName, Method, TransformedRes>
            const newRes = res as unknown as Parameters<typeof handler>[1];
            try {
              newReq.transformed = requestTransformer(req);
            } catch (err) {
              const errorHandler =
                options?.onRequestTransformError ?? onRequestTransformError;
              errorHandler(err, newReq, newRes);
              return;
            }
            const underlyingSendEncoded = res.sendEncoded;
            newRes.sendEncoded = (status, payload) => {
              let transformedPayload;
              try {
                transformedPayload = responseTransformer(newReq, status, payload);
              } catch (err) {
                const errorHandler =
                  options?.onResponseTransformError ?? onResponseTransformError;
                errorHandler(err, newReq, newRes);
                return;
              }
              underlyingSendEncoded(status, transformedPayload);
            };
            handler(newReq, newRes, next);
          },
      );
      return makeAddUncheckedRoute(method)(
        apiName,
        [
          makeValidateMiddleware(apiName, options),
          ...(transformedHandlers as express.RequestHandler[]),
        ],
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
      patch: makeAddRoute('patch'),
      getTransformed: makeAddTransformedRoute('get'),
      postTransformed: makeAddTransformedRoute('post'),
      putTransformed: makeAddTransformedRoute('put'),
      deleteTransformed: makeAddTransformedRoute('delete'),
      patchTransformed: makeAddTransformedRoute('patch'),
      getUnchecked: makeAddUncheckedRoute('get'),
      postUnchecked: makeAddUncheckedRoute('post'),
      putUnchecked: makeAddUncheckedRoute('put'),
      deleteUnchecked: makeAddUncheckedRoute('delete'),
      patchUnchecked: makeAddUncheckedRoute('patch'),
      use: (middleware: UncheckedRequestHandler) => {
        routerMiddleware.push(middleware);
      },
    },
  );

  Object.setPrototypeOf(result, Object.getPrototypeOf(router));

  return result;
}
