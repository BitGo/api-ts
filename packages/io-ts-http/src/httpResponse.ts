import * as t from 'io-ts';

import { Status } from '@bitgo/io-ts-response';

export type HttpResponse = t.Props;

export type KnownResponses<Response extends HttpResponse> = {
  [K in keyof Response]: K extends Status ? K : never;
}[keyof Response];

export const HttpResponseCodes: { [K in Status]: number } = {
  ok: 200,
  invalidRequest: 400,
  unauthenticated: 401,
  permissionDenied: 403,
  notFound: 404,
  rateLimitExceeded: 429,
  internalError: 500,
  serviceUnavailable: 503,
};

export type KnownHttpStatusCodes<Response extends HttpResponse> =
  typeof HttpResponseCodes[KnownResponses<Response>];
