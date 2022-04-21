// HTTP                        | GRPC               | Response
// ----------------------------|--------------------|---------------------------
// 400 (bad request)           | INVALID_ARGUMENT   | Response.invalidRequest
// 401 (unauthorized)          | UNAUTHENTICATED    | Response.unauthenticated
// 403 (forbidden)             | PERMISSION_DENIED  | Response.permissionDenied
// 404 (not found)             | NOT_FOUND          | Response.notFound
// 405 (method not allowed)    | NOT_FOUND          | Response.notFound
// 429 (rate-limit)            | RESOURCE_EXHAUSTED | Response.rateLimitExceeded
// 500 (internal server error) | INTERNAL           | Response.internalError
// 503 (service unavailable)   | UNAVAILABLE        | Response.serviceUnavailable

export type Status =
  | 'ok'
  | 'invalidRequest'
  | 'unauthenticated'
  | 'permissionDenied'
  | 'notFound'
  | 'rateLimitExceeded'
  | 'internalError'
  | 'serviceUnavailable';

export type Response = { type: Status; payload: unknown };

const responseFunction =
  <S extends Status>(status: S) =>
  <T>(payload: T) => ({ type: status, payload });

export const Response = {
  ok: responseFunction('ok'),
  invalidRequest: responseFunction('invalidRequest'),
  unauthenticated: responseFunction('unauthenticated'),
  permissionDenied: responseFunction('permissionDenied'),
  notFound: responseFunction('notFound'),
  rateLimitExceeded: responseFunction('rateLimitExceeded'),
  internalError: responseFunction('internalError'),
  serviceUnavailable: responseFunction('serviceUnavailable'),
};
