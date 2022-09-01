// TODO: Enforce consistency at the type level

export const HttpToKeyStatus = {
  200: 'ok',
  400: 'invalidRequest',
  401: 'unauthenticated',
  403: 'permissionDenied',
  404: 'notFound',
  429: 'rateLimitExceeded',
  500: 'internalError',
  503: 'serviceUnavailable',
} as const;

export type HttpToKeyStatus = typeof HttpToKeyStatus;

export const KeyToHttpStatus = {
  ok: 200,
  invalidRequest: 400,
  unauthenticated: 401,
  permissionDenied: 403,
  notFound: 404,
  rateLimitExceeded: 429,
  internalError: 500,
  serviceUnavailable: 503,
} as const;

export type KeyToHttpStatus = typeof KeyToHttpStatus;
