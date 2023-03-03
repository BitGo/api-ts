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

export type KeyedStatus =
  | 'continue'
  | 'switchingProtocols'
  | 'processing'
  | 'ok'
  | 'created'
  | 'accepted'
  | 'nonAuthoritativeInformation'
  | 'noContent'
  | 'resetContent'
  | 'partialContent'
  | 'multiStatus'
  | 'alreadyReported'
  | 'imUsed'
  | 'multipleChoices'
  | 'movedPermanently'
  | 'found'
  | 'seeOther'
  | 'notModified'
  | 'temporaryRedirect'
  | 'permanentRedirect'
  | 'invalidRequest'
  | 'unauthenticated'
  | 'paymentRequired'
  | 'permissionDenied'
  | 'notFound'
  | 'methodNotAllowed'
  | 'notAcceptable'
  | 'proxyAuthenticationRequired'
  | 'requestTimeout'
  | 'conflict'
  | 'gone'
  | 'lengthRequired'
  | 'preconditionFailed'
  | 'contentTooLarge'
  | 'uriTooLong'
  | 'unsupportedMediaType'
  | 'rangeNotSatisfiable'
  | 'exceptionFailed'
  | 'imATeapot'
  | 'misdirectedRequest'
  | 'unprocessableContent'
  | 'locked'
  | 'failedDependency'
  | 'tooEarly'
  | 'upgradeRequired'
  | 'preconditionRequired'
  | 'rateLimitExceeded'
  | 'requestHeaderFieldsTooLarge'
  | 'unavailableForLegalReasons'
  | 'internalError'
  | 'notImplemented'
  | 'badGateway'
  | 'serviceUnavailable'
  | 'gatewayTimeout'
  | 'httpVersionNotSupported'
  | 'variantAlsoNegotiates'
  | 'insufficientStorage'
  | 'loopDetected'
  | 'notExtended'
  | 'networkAuthenticationRequired';

export type KeyedResponse = { type: KeyedStatus; payload: unknown };

const responseFunction =
  <S extends KeyedStatus>(status: S) =>
  <T>(payload: T) => ({ type: status, payload });

export const KeyedResponse = {
  continue: responseFunction('continue'),
  switchingProtocols: responseFunction('switchingProtocols'),
  processing: responseFunction('processing'),
  ok: responseFunction('ok'),
  created: responseFunction('created'),
  accepted: responseFunction('accepted'),
  nonAuthoritativeInformation: responseFunction('nonAuthoritativeInformation'),
  noContent: responseFunction('noContent'),
  resetContent: responseFunction('resetContent'),
  partialContent: responseFunction('partialContent'),
  multiStatus: responseFunction('multiStatus'),
  alreadyReported: responseFunction('alreadyReported'),
  imUsed: responseFunction('imUsed'),
  multipleChoices: responseFunction('multipleChoices'),
  movedPermanently: responseFunction('movedPermanently'),
  found: responseFunction('found'),
  seeOther: responseFunction('seeOther'),
  notModified: responseFunction('notModified'),
  temporaryRedirect: responseFunction('temporaryRedirect'),
  permanentRedirect: responseFunction('permanentRedirect'),
  invalidRequest: responseFunction('invalidRequest'),
  unauthenticated: responseFunction('unauthenticated'),
  paymentRequired: responseFunction('paymentRequired'),
  permissionDenied: responseFunction('permissionDenied'),
  notFound: responseFunction('notFound'),
  methodNotAllowed: responseFunction('methodNotAllowed'),
  notAcceptable: responseFunction('notAcceptable'),
  proxyAuthenticationRequired: responseFunction('proxyAuthenticationRequired'),
  requestTimeout: responseFunction('requestTimeout'),
  conflict: responseFunction('conflict'),
  gone: responseFunction('gone'),
  lengthRequired: responseFunction('lengthRequired'),
  preconditionFailed: responseFunction('preconditionFailed'),
  contentTooLarge: responseFunction('contentTooLarge'),
  uriTooLong: responseFunction('uriTooLong'),
  unsupportedMediaType: responseFunction('unsupportedMediaType'),
  rangeNotSatisfiable: responseFunction('rangeNotSatisfiable'),
  exceptionFailed: responseFunction('exceptionFailed'),
  imATeapot: responseFunction('imATeapot'),
  misdirectedRequest: responseFunction('misdirectedRequest'),
  unprocessableContent: responseFunction('unprocessableContent'),
  locked: responseFunction('locked'),
  failedDependency: responseFunction('failedDependency'),
  tooEarly: responseFunction('tooEarly'),
  upgradeRequired: responseFunction('upgradeRequired'),
  preconditionRequired: responseFunction('preconditionRequired'),
  rateLimitExceeded: responseFunction('rateLimitExceeded'),
  requestHeaderFieldsTooLarge: responseFunction('requestHeaderFieldsTooLarge'),
  unavailableForLegalReasons: responseFunction('unavailableForLegalReasons'),
  internalError: responseFunction('internalError'),
  notImplemented: responseFunction('notImplemented'),
  badGateway: responseFunction('badGateway'),
  serviceUnavailable: responseFunction('serviceUnavailable'),
  gatewayTimeout: responseFunction('gatewayTimeout'),
  httpVersionNotSupported: responseFunction('httpVersionNotSupported'),
  variantAlsoNegotiates: responseFunction('variantAlsoNegotiates'),
  insufficientStorage: responseFunction('insufficientStorage'),
  loopDetected: responseFunction('loopDetected'),
  notExtended: responseFunction('notExtended'),
  networkAuthenticationRequired: responseFunction('networkAuthenticationRequired'),
};
