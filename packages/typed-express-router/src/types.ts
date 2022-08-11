import { ApiSpec, HttpRoute, RequestType } from '@api-ts/io-ts-http';
import express from 'express';
import * as t from 'io-ts';

export type Methods = 'get' | 'post' | 'put' | 'delete';

export type RouteAt<
  Spec extends ApiSpec,
  ApiName extends keyof Spec,
  Method extends keyof Spec[ApiName],
> = Spec[ApiName][Method] extends HttpRoute ? Spec[ApiName][Method] : never;

export type WrappedRequest<
  Spec extends ApiSpec,
  ApiName extends keyof Spec,
  Method extends keyof Spec[ApiName],
> = express.Request & {
  decoded: RequestType<RouteAt<Spec, ApiName, Method>>;
};

export type WrappedResponse<
  Spec extends ApiSpec,
  ApiName extends keyof Spec,
  Method extends keyof Spec[ApiName],
> = express.Response & {
  sendEncoded: <Status extends keyof RouteAt<Spec, ApiName, Method>['response']>(
    status: Status,
    payload: t.TypeOf<RouteAt<Spec, ApiName, Method>['response'][Status]>,
  ) => void;
};

export type OnDecodeErrorFn = (
  errs: t.Errors,
  req: express.Request,
  res: express.Response,
) => void;

export type OnEncodeErrorFn = (
  err: unknown,
  req: express.Request,
  res: express.Response,
) => void;

export type AfterEncodedResponseSentFn<Route extends HttpRoute> = <
  Status extends keyof Route['response'],
>(
  status: Status,
  payload: Route['response'][Status],
  req: express.Request,
  res: express.Response,
) => void;

export type WrappedRouteOptions<Route extends HttpRoute> = {
  onDecodeError?: OnDecodeErrorFn;
  onEncodeError?: OnEncodeErrorFn;
  afterEncodedResponseSent?: AfterEncodedResponseSentFn<Route>;
};

export type WrappedRouterOptions = express.RouterOptions &
  WrappedRouteOptions<HttpRoute>;

export type TypedRequestHandler<
  Spec extends ApiSpec,
  ApiName extends keyof Spec,
  Method extends keyof Spec[ApiName],
> = (
  req: WrappedRequest<Spec, ApiName, Method>,
  res: WrappedResponse<Spec, ApiName, Method>,
  next: express.NextFunction,
) => void;

type ApiNamesWithMethod<Spec extends ApiSpec, Method extends Methods> = {
  [K in keyof Spec]: Method extends keyof Spec[K] ? K : never;
}[keyof Spec];

/**
 * Defines a route from one listed in an `apiSpec`. The request object will contain
 * a `decoded` request property, and the response object will have a type-checked
 * `sendEncoded` function with the correct types.
 *
 * @param apiName {string} the api name defined in the `apiSpec` assoiated with this router
 * @param handlers {TypedRequestHandler[]} a series of Express request handlers with extra properties
 * @param options {WrappedRouteOptions} error and response hooks for this route that override the top-level ones if provided
 */
export type AddRouteHandler<Spec extends ApiSpec, Method extends Methods> = <
  ApiName extends ApiNamesWithMethod<Spec, Method>,
>(
  apiName: ApiName,
  handlers: TypedRequestHandler<Spec, ApiName, Method>[],
  options?: WrappedRouteOptions<Spec[ApiName][Method]>,
) => void;

/**
 * Defines a route from one listed in an `apiSpec`, except matching an arbitrary path. Ensure that any path parameters match
 * with what is expected from the `httpRoute` or else you will get decode errors.
 *
 * @param path {string} the path to match, can use the full Express router syntax
 * @param apiName {string} the api name defined in the `apiSpec` assoiated with this router
 * @param handlers {TypedRequestHandler[]} a series of Express request handlers with extra properties
 * @param options {WrappedRouteOptions} error and response hooks for this route that override the top-level ones if provided
 */
export type AddAliasRouteHandler<Spec extends ApiSpec, Method extends Methods> = <
  ApiName extends ApiNamesWithMethod<Spec, Method>,
>(
  path: string,
  apiName: ApiName,
  handlers: TypedRequestHandler<Spec, ApiName, Method>[],
  options?: WrappedRouteOptions<Spec[ApiName][Method]>,
) => void;

/**
 * An Express router that is wrapped and associated with an api-ts `apiSpec`.
 */
export type WrappedRouter<Spec extends ApiSpec> = Omit<
  express.Router,
  'get' | 'post' | 'put' | 'delete'
> &
  express.RequestHandler & {
    get: AddRouteHandler<Spec, 'get'>;
    post: AddRouteHandler<Spec, 'post'>;
    put: AddRouteHandler<Spec, 'put'>;
    delete: AddRouteHandler<Spec, 'delete'>;
    getAlias: AddAliasRouteHandler<Spec, 'get'>;
    postAlias: AddAliasRouteHandler<Spec, 'post'>;
    putAlias: AddAliasRouteHandler<Spec, 'put'>;
    deleteAlias: AddAliasRouteHandler<Spec, 'delete'>;
    // Expose the original express router methods as an escape hatch
    getUnchecked: express.Router['get'];
    postUnchecked: express.Router['post'];
    putUnchecked: express.Router['put'];
    deleteUnchecked: express.Router['delete'];
  };
