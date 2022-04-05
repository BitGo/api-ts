import * as t from 'io-ts';

import { Status } from '@api-ts/response';

export type HttpResponse = {
  [K: string]: t.Mixed;
};

type KnownResponses<Response extends HttpResponse> = {
  [K in Status]: K extends keyof Response ? K : never;
}[Status];

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
