import { ApiSpec, HttpRoute, Method as HttpMethod } from '@api-ts/io-ts-http';
import express from 'express';
import * as t from 'io-ts';

export type Methods = Lowercase<HttpMethod>;

export type WrappedRequest<Decoded = unknown> = express.Request & {
  decoded: Decoded;
  apiName: string;
  httpRoute: HttpRoute;
};

export type WrappedResponse<Responses extends {} = Record<string | number, unknown>> =
  express.Response & {
    sendEncoded: <Status extends keyof Responses>(
      status: Status,
      payload: Responses[Status],
    ) => void;
  };

export type OnDecodeErrorFn = (
  errs: t.Errors,
  req: express.Request,
  res: express.Response,
) => void;

export type OnEncodeErrorFn = (
  err: unknown,
  req: WrappedRequest,
  res: WrappedResponse,
) => void;

export type AfterEncodedResponseSentFn = (
  status: number,
  payload: unknown,
  req: WrappedRequest,
  res: WrappedResponse,
) => void;

export type UncheckedWrappedRouteOptions = {
  onEncodeError?: OnEncodeErrorFn;
  afterEncodedResponseSent?: AfterEncodedResponseSentFn;
  routeAliases?: string[];
};

export type WrappedRouteOptions = UncheckedWrappedRouteOptions & {
  onDecodeError?: OnDecodeErrorFn;
};

export type WrappedRouterOptions = express.RouterOptions & WrappedRouteOptions;

export type TypedRequestHandler<
  Spec extends ApiSpec = ApiSpec,
  ApiName extends keyof Spec = keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod = keyof Spec[ApiName] & HttpMethod,
> = (
  req: WrappedRequest<t.TypeOf<NonNullable<Spec[ApiName][Method]>['request']>>,
  res: WrappedResponse<t.TypeOfProps<NonNullable<Spec[ApiName][Method]>['response']>>,
  next: express.NextFunction,
) => void;

export type UncheckedRequestHandler<
  Spec extends ApiSpec = ApiSpec,
  ApiName extends keyof Spec = keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod = keyof Spec[ApiName] & HttpMethod,
> = (
  req: WrappedRequest<
    t.Validation<t.TypeOf<NonNullable<Spec[ApiName][Method]>['request']>>
  >,
  res: WrappedResponse<t.TypeOfProps<NonNullable<Spec[ApiName][Method]>['response']>>,
  next: express.NextFunction,
) => void;

type ApiNamesWithMethod<Spec extends ApiSpec, Method extends Methods> = {
  [K in keyof Spec & string]: Method extends keyof Spec[K] ? K : never;
}[keyof Spec & string];

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
  options?: WrappedRouteOptions,
) => void;

/**
 * Defines a route from one listed in an `apiSpec`. The request object will contain
 * a `decoded` request property, and the response object will have a type-checked
 * `sendEncoded` function with the correct types.
 *
 * @param apiName {string} the api name defined in the `apiSpec` assoiated with this router
 * @param handlers {TypedRequestHandler[]} a series of Express request handlers with extra properties
 * @param options {UncheckedWrappedRouteOptions} error and response hooks for this route that override the top-level ones if provided
 */
export type AddUncheckedRouteHandler<Spec extends ApiSpec, Method extends Methods> = <
  ApiName extends ApiNamesWithMethod<Spec, Method>,
>(
  apiName: ApiName,
  handlers: UncheckedRequestHandler<Spec, ApiName, Method>[],
  options?: UncheckedWrappedRouteOptions,
) => void;

/**
 * An Express router that is wrapped and associated with an api-ts `apiSpec`.
 */
export type WrappedRouter<Spec extends ApiSpec> = Omit<
  express.Router,
  'get' | 'post' | 'put' | 'delete' | 'use'
> &
  express.RequestHandler & {
    use: (middleware: UncheckedRequestHandler<ApiSpec, string, HttpMethod>) => void;
    get: AddRouteHandler<Spec, 'get'>;
    post: AddRouteHandler<Spec, 'post'>;
    put: AddRouteHandler<Spec, 'put'>;
    delete: AddRouteHandler<Spec, 'delete'>;
    getUnchecked: AddUncheckedRouteHandler<Spec, 'get'>;
    postUnchecked: AddUncheckedRouteHandler<Spec, 'post'>;
    putUnchecked: AddUncheckedRouteHandler<Spec, 'put'>;
    deleteUnchecked: AddUncheckedRouteHandler<Spec, 'delete'>;
  };
