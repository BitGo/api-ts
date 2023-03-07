/*
 * @api-ts/response
 */

export type Status =
  | 100
  | 101
  | 102
  | 200
  | 201
  | 202
  | 203
  | 204
  | 205
  | 206
  | 207
  | 208
  | 226
  | 300
  | 301
  | 302
  | 303
  | 304
  | 307
  | 308
  | 400
  | 401
  | 402
  | 403
  | 404
  | 405
  | 406
  | 407
  | 408
  | 409
  | 410
  | 411
  | 412
  | 413
  | 414
  | 415
  | 416
  | 417
  | 418
  | 421
  | 422
  | 423
  | 424
  | 425
  | 426
  | 428
  | 429
  | 431
  | 451
  | 500
  | 501
  | 502
  | 503
  | 504
  | 505
  | 506
  | 507
  | 508
  | 510
  | 511;

export type Response = { type: Status; payload: unknown };

const ResponseFunction =
  <S extends Status>(status: S) =>
  <T>(payload: T) => ({ type: status, payload });

export const Response = {
  continue: ResponseFunction(100),
  switchingProtocols: ResponseFunction(101),
  processing: ResponseFunction(102),
  ok: ResponseFunction(200),
  created: ResponseFunction(201),
  accepted: ResponseFunction(202),
  nonAuthoritativeInformation: ResponseFunction(203),
  noContent: ResponseFunction(204),
  resetContent: ResponseFunction(205),
  partialContent: ResponseFunction(206),
  multiStatus: ResponseFunction(207),
  alreadyReported: ResponseFunction(208),
  imUsed: ResponseFunction(226),
  multipleChoices: ResponseFunction(300),
  movedPermanently: ResponseFunction(301),
  found: ResponseFunction(302),
  seeOther: ResponseFunction(303),
  notModified: ResponseFunction(304),
  temporaryRedirect: ResponseFunction(307),
  permanentRedirect: ResponseFunction(308),
  invalidRequest: ResponseFunction(400),
  unauthenticated: ResponseFunction(401),
  paymentRequired: ResponseFunction(402),
  permissionDenied: ResponseFunction(403),
  notFound: ResponseFunction(404),
  methodNotAllowed: ResponseFunction(405),
  notAcceptable: ResponseFunction(406),
  proxyAuthenticationRequired: ResponseFunction(407),
  requestTimeout: ResponseFunction(408),
  conflict: ResponseFunction(409),
  gone: ResponseFunction(410),
  lengthRequired: ResponseFunction(411),
  preconditionFailed: ResponseFunction(412),
  contentTooLarge: ResponseFunction(413),
  uriTooLong: ResponseFunction(414),
  unsupportedMediaType: ResponseFunction(415),
  rangeNotSatisfiable: ResponseFunction(416),
  exceptionFailed: ResponseFunction(417),
  imATeapot: ResponseFunction(418),
  misdirectedRequest: ResponseFunction(421),
  unprocessableContent: ResponseFunction(422),
  locked: ResponseFunction(423),
  failedDependency: ResponseFunction(424),
  tooEarly: ResponseFunction(425),
  upgradeRequired: ResponseFunction(426),
  preconditionRequired: ResponseFunction(428),
  rateLimitExceeded: ResponseFunction(429),
  requestHeaderFieldsTooLarge: ResponseFunction(431),
  unavailableForLegalReasons: ResponseFunction(451),
  internalError: ResponseFunction(500),
  notImplemented: ResponseFunction(501),
  badGateway: ResponseFunction(502),
  serviceUnavailable: ResponseFunction(503),
  gatewayTimeout: ResponseFunction(504),
  httpVersionNotSupported: ResponseFunction(505),
  variantAlsoNegotiates: ResponseFunction(506),
  insufficientStorage: ResponseFunction(507),
  loopDetected: ResponseFunction(508),
  notExtended: ResponseFunction(510),
  networkAuthenticationRequired: ResponseFunction(511),
};
