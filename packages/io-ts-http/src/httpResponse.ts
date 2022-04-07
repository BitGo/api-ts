import * as t from 'io-ts';

import { Status } from '@api-ts/response';

export type HttpResponse = {
  [K in Status]?: t.Mixed;
};

export type KnownResponses<Response extends HttpResponse> = {
  [K in keyof Response]: K extends Status
    ? undefined extends Response[K]
      ? never
      : K
    : never;
}[keyof Response];

export const HttpResponseCodes = {
  ok: 200,
  invalidRequest: 400,
  unauthenticated: 401,
  permissionDenied: 403,
  notFound: 404,
  rateLimitExceeded: 429,
  internalError: 500,
  serviceUnavailable: 503,
} as const;

export type HttpResponseCodes = typeof HttpResponseCodes;

// Create a type-level assertion that the HttpResponseCodes map contains every key
// in the Status union of string literals, and no unexpected keys. Violations of
// this assertion will cause compile-time errors.
//
// Thanks to https://stackoverflow.com/a/67027737
type ShapeOf<T> = Record<keyof T, any>;
type AssertKeysEqual<X extends ShapeOf<Y>, Y extends ShapeOf<X>> = never;
type _AssertHttpStatusCodeIsDefinedForAllResponses = AssertKeysEqual<
  { [K in Status]: number },
  HttpResponseCodes
>;

export type ResponseTypeForStatus<
  Response extends HttpResponse,
  S extends keyof Response,
> = Response[S] extends t.Mixed ? t.TypeOf<Response[S]> : never;
