/*
 * @api-ts/response
 */

// HTTP                        | GRPC               | Response
// ----------------------------|--------------------|---------------------------
// 400 (bad request)           | INVALID_ARGUMENT   | Response.invalidRequest
// 401 (unauthorized)          | UNAUTHENTICATED    | Response.unauthenticated
// 403 (forbidden)             | PERMISSION_DENIED  | Response.permissionDenied
// 404 (not found)             | NOT_FOUND          | Response.notFound
// 405 (method not allowed)    | NOT_FOUND          | Response.notFound
// 409 (conflict)              | ALREADY_EXISTS     | Response.conflict
// 429 (rate-limit)            | RESOURCE_EXHAUSTED | Response.rateLimitExceeded
// 500 (internal server error) | INTERNAL           | Response.internalError
// 503 (service unavailable)   | UNAVAILABLE        | Response.serviceUnavailable

export type Status = 200 | 400 | 401 | 403 | 404 | 409 | 429 | 500 | 503;

export type Response = { type: Status; payload: unknown };

const ResponseFunction =
  <S extends Status>(status: S) =>
  <T>(payload: T) => ({ type: status, payload });

export const Response = {
  ok: ResponseFunction(200),
  invalidRequest: ResponseFunction(400),
  unauthenticated: ResponseFunction(401),
  permissionDenied: ResponseFunction(403),
  notFound: ResponseFunction(404),
  conflict: ResponseFunction(409),
  rateLimitExceeded: ResponseFunction(429),
  internalError: ResponseFunction(500),
  serviceUnavailable: ResponseFunction(503),
};
