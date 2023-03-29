import * as t from 'io-ts';
import { KeyToHttpStatus } from './statusCode';

export type HttpResponse = {
  [K: number | string]: t.Mixed;
};

const responseFunction =
  <S extends keyof KeyToHttpStatus>(status: S) =>
  <T>(payload: T) => ({ type: KeyToHttpStatus[status] as KeyToHttpStatus[S], payload });

export const Response = {
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

export type ResponseTypeForStatus<
  Response extends HttpResponse,
  S extends keyof Response,
> = Response[S] extends t.Mixed ? t.TypeOf<Response[S]> : never;
