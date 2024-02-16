import { ApiSpec, Method as HttpMethod, HttpRoute } from '@api-ts/io-ts-http';
import express from 'express';
import * as t from 'io-ts';

export type Methods = Lowercase<HttpMethod>;

export type WrappedRequest<Decoded = unknown> = express.Request & {
  decoded: Decoded;
  apiName: string;
  httpRoute: HttpRoute;
};

export type TransformedRequest<
  Decoded = unknown,
  Transformed = unknown,
> = WrappedRequest<Decoded> & { transformed: Transformed };

type TransformedResponse<
  Spec extends ApiSpec,
  ApiName extends keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod,
  RawResponses extends Record<ApiMethodResponseCodes<Spec, ApiName, Method>, unknown>,
> = express.Response & {
  sendEncoded: (
    status: ApiMethodResponseCodes<Spec, ApiName, Method>,
    payload: RawResponses[typeof status],
  ) => void;
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

export type OnRequestTransformErrorFn = <
  Spec extends ApiSpec = ApiSpec,
  ApiName extends keyof Spec = keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod = keyof Spec[ApiName] & HttpMethod,
  TransformedReq = unknown,
  TransformedRes extends Record<
    ApiMethodResponseCodes<Spec, ApiName, Method>,
    unknown
  > = Record<ApiMethodResponseCodes<Spec, ApiName, Method>, unknown>,
>(
  err: unknown,
  req: TransformedRequest<ApiMethodRequestType<Spec, ApiName, Method>, TransformedReq>,
  res: TransformedResponse<Spec, ApiName, Method, TransformedRes>,
) => void;

export type OnResponseTransformErrorFn = <
  Spec extends ApiSpec = ApiSpec,
  ApiName extends keyof Spec = keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod = keyof Spec[ApiName] & HttpMethod,
  TransformedReq = unknown,
  TransformedRes extends Record<
    ApiMethodResponseCodes<Spec, ApiName, Method>,
    unknown
  > = Record<ApiMethodResponseCodes<Spec, ApiName, Method>, unknown>,
>(
  err: unknown,
  req: TransformedRequest<ApiMethodRequestType<Spec, ApiName, Method>, TransformedReq>,
  res: TransformedResponse<Spec, ApiName, Method, TransformedRes>,
) => void;

export type UncheckedWrappedRouteOptions = {
  onEncodeError?: OnEncodeErrorFn;
  afterEncodedResponseSent?: AfterEncodedResponseSentFn;
  routeAliases?: string[];
};

export type TransformedRouteOptions = {
  onRequestTransformError?: OnRequestTransformErrorFn;
  onResponseTransformError?: OnResponseTransformErrorFn;
};

export type WrappedRouteOptions = UncheckedWrappedRouteOptions &
  TransformedRouteOptions & { onDecodeError?: OnDecodeErrorFn };

export type WrappedRouterOptions = express.RouterOptions & WrappedRouteOptions;

type TypeTransformer<D, U> = (decoded: D) => U;

type ApiMethodRequest<
  Spec extends ApiSpec,
  ApiName extends keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod,
> = NonNullable<Spec[ApiName][Method]>['request'];

type ApiMethodRequestType<
  Spec extends ApiSpec,
  ApiName extends keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod,
> = t.TypeOf<ApiMethodRequest<Spec, ApiName, Method>>;

export type RequestTypeTransformer<
  Spec extends ApiSpec = ApiSpec,
  ApiName extends keyof Spec = keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod = keyof Spec[ApiName] & HttpMethod,
  TransformedReq = unknown,
> = TypeTransformer<
  WrappedRequest<ApiMethodRequestType<Spec, ApiName, Method>>,
  TransformedReq
>;

type ApiMethodResponseCodes<
  Spec extends ApiSpec,
  ApiName extends keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod,
> = keyof NonNullable<Spec[ApiName][Method]>['response'];

type TypeOfApiMethodResponseProps<
  Spec extends ApiSpec,
  ApiName extends keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod,
> = t.TypeOfProps<NonNullable<Spec[ApiName][Method]>['response']>;

export type ResponseTypeTransformer<
  Spec extends ApiSpec = ApiSpec,
  ApiName extends keyof Spec = keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod = keyof Spec[ApiName] & HttpMethod,
  TransformedReq = unknown,
  TransformedRes extends Record<
    ApiMethodResponseCodes<Spec, ApiName, Method>,
    unknown
  > = Record<ApiMethodResponseCodes<Spec, ApiName, Method>, unknown>,
> = (
  req: TransformedRequest<ApiMethodRequestType<Spec, ApiName, Method>, TransformedReq>,
  status: ApiMethodResponseCodes<Spec, ApiName, Method>,
  rawResponse: TransformedRes[typeof status],
) => TypeOfApiMethodResponseProps<Spec, ApiName, Method>[typeof status];

export type TransformedRequestHandler<
  Spec extends ApiSpec = ApiSpec,
  ApiName extends keyof Spec = keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod = keyof Spec[ApiName] & HttpMethod,
  TransformedReq = unknown,
  TransformedResponses extends Record<
    ApiMethodResponseCodes<Spec, ApiName, Method>,
    unknown
  > = Record<ApiMethodResponseCodes<Spec, ApiName, Method>, unknown>,
> = (
  req: TransformedRequest<ApiMethodRequestType<Spec, ApiName, Method>, TransformedReq>,
  res: TransformedResponse<Spec, ApiName, Method, TransformedResponses>,
  next: express.NextFunction,
) => void;

export type TypedRequestHandler<
  Spec extends ApiSpec = ApiSpec,
  ApiName extends keyof Spec = keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod = keyof Spec[ApiName] & HttpMethod,
> = (
  req: WrappedRequest<ApiMethodRequestType<Spec, ApiName, Method>>,
  res: WrappedResponse<TypeOfApiMethodResponseProps<Spec, ApiName, Method>>,
  next: express.NextFunction,
) => void;

export type UncheckedRequestHandler<
  Spec extends ApiSpec = ApiSpec,
  ApiName extends keyof Spec = keyof Spec,
  Method extends keyof Spec[ApiName] & HttpMethod = keyof Spec[ApiName] & HttpMethod,
> = (
  req: WrappedRequest<t.Validation<ApiMethodRequestType<Spec, ApiName, Method>>>,
  res: WrappedResponse<TypeOfApiMethodResponseProps<Spec, ApiName, Method>>,
  next: express.NextFunction,
) => void;

export type ApiNamesWithMethod<Spec extends ApiSpec, Method extends Methods> = {
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

export type TransformedRouteHandler<
  Spec extends ApiSpec,
  Method extends Methods,
  ApiName extends ApiNamesWithMethod<Spec, Method>,
  TransformedDecoded,
  TransformedRes extends Record<ApiMethodResponseCodes<Spec, ApiName, Method>, unknown>,
> = {
  requestTransformer: RequestTypeTransformer<Spec, ApiName, Method, TransformedDecoded>;
  responseTransformer: ResponseTypeTransformer<
    Spec,
    ApiName,
    Method,
    TransformedDecoded,
    TransformedRes
  >;
  handler: TransformedRequestHandler<
    Spec,
    ApiName,
    Method,
    TransformedDecoded,
    TransformedRes
  >;
};

/**
 * Defines a route from one listed in an `apiSpec`. The request object will contain
 * `decoded` and `transformed` request properties, and the response object will have a type-checked
 * `sendEncoded` function which accepts pre-transformed response payloads, to be transformed and
 * then encoded.
 *
 * @param apiName {string} the api name defined in the `apiSpec` assoiated with this router
 * @param handlers {TransformedRouteHandler[]} a series of Express request handlers with extra properties
 * @param options {WrappedRouteOptions} error and response hooks for this route that override the top-level ones if provided
 */
export type AddTransformedRouteHandler<Spec extends ApiSpec, Method extends Methods> = <
  ApiName extends ApiNamesWithMethod<Spec, Method>,
  TransformedDecoded,
  TransformedRes extends Record<ApiMethodResponseCodes<Spec, ApiName, Method>, unknown>,
>(
  apiName: ApiName,
  handlers: TransformedRouteHandler<
    Spec,
    Method,
    ApiName,
    TransformedDecoded,
    TransformedRes
  >[],
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
  'get' | 'post' | 'put' | 'delete' | 'use' | 'patch'
> &
  express.RequestHandler & {
    use: (middleware: UncheckedRequestHandler<ApiSpec, string, HttpMethod>) => void;
    get: AddRouteHandler<Spec, 'get'>;
    post: AddRouteHandler<Spec, 'post'>;
    put: AddRouteHandler<Spec, 'put'>;
    delete: AddRouteHandler<Spec, 'delete'>;
    patch: AddRouteHandler<Spec, 'patch'>;
    getTransformed: AddTransformedRouteHandler<Spec, 'get'>;
    postTransformed: AddTransformedRouteHandler<Spec, 'post'>;
    putTransformed: AddTransformedRouteHandler<Spec, 'put'>;
    deleteTransformed: AddTransformedRouteHandler<Spec, 'delete'>;
    patchTransformed: AddTransformedRouteHandler<Spec, 'patch'>;
    getUnchecked: AddUncheckedRouteHandler<Spec, 'get'>;
    postUnchecked: AddUncheckedRouteHandler<Spec, 'post'>;
    putUnchecked: AddUncheckedRouteHandler<Spec, 'put'>;
    deleteUnchecked: AddUncheckedRouteHandler<Spec, 'delete'>;
    patchUnchecked: AddUncheckedRouteHandler<Spec, 'patch'>;
  };
