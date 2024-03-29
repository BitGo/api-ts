// TODO: Enforce consistency at the type level

export const HttpToKeyStatus = {
  100: 'continue',
  101: 'switchingProtocols',
  102: 'processing',
  200: 'ok',
  201: 'created',
  202: 'accepted',
  203: 'nonAuthoritativeInformation',
  204: 'noContent',
  205: 'resetContent',
  206: 'partialContent',
  207: 'multiStatus',
  208: 'alreadyReported',
  226: 'imUsed',
  300: 'multipleChoices',
  301: 'movedPermanently',
  302: 'found',
  303: 'seeOther',
  304: 'notModified',
  307: 'temporaryRedirect',
  308: 'permanentRedirect',
  400: 'invalidRequest',
  401: 'unauthenticated',
  402: 'paymentRequired',
  403: 'permissionDenied',
  404: 'notFound',
  405: 'methodNotAllowed',
  406: 'notAcceptable',
  407: 'proxyAuthenticationRequired',
  408: 'requestTimeout',
  409: 'conflict',
  410: 'gone',
  411: 'lengthRequired',
  412: 'preconditionFailed',
  413: 'contentTooLarge',
  414: 'uriTooLong',
  415: 'unsupportedMediaType',
  416: 'rangeNotSatisfiable',
  417: 'exceptionFailed',
  418: 'imATeapot',
  421: 'misdirectedRequest',
  422: 'unprocessableContent',
  423: 'locked',
  424: 'failedDependency',
  425: 'tooEarly',
  426: 'upgradeRequired',
  428: 'preconditionRequired',
  429: 'rateLimitExceeded',
  431: 'requestHeaderFieldsTooLarge',
  451: 'unavailableForLegalReasons',
  500: 'internalError',
  501: 'notImplemented',
  502: 'badGateway',
  503: 'serviceUnavailable',
  504: 'gatewayTimeout',
  505: 'httpVersionNotSupported',
  506: 'variantAlsoNegotiates',
  507: 'insufficientStorage',
  508: 'loopDetected',
  510: 'notExtended',
  511: 'networkAuthenticationRequired',
} as const;

export type HttpToKeyStatus = typeof HttpToKeyStatus;

export const KeyToHttpStatus = {
  continue: 100,
  switchingProtocols: 101,
  processing: 102,
  ok: 200,
  created: 201,
  accepted: 202,
  nonAuthoritativeInformation: 203,
  noContent: 204,
  resetContent: 205,
  partialContent: 206,
  multiStatus: 207,
  alreadyReported: 208,
  imUsed: 226,
  multipleChoices: 300,
  movedPermanently: 301,
  found: 302,
  seeOther: 303,
  notModified: 304,
  temporaryRedirect: 307,
  permanentRedirect: 308,
  invalidRequest: 400,
  unauthenticated: 401,
  paymentRequired: 402,
  permissionDenied: 403,
  notFound: 404,
  methodNotAllowed: 405,
  notAcceptable: 406,
  proxyAuthenticationRequired: 407,
  requestTimeout: 408,
  conflict: 409,
  gone: 410,
  lengthRequired: 411,
  preconditionFailed: 412,
  contentTooLarge: 413,
  uriTooLong: 414,
  unsupportedMediaType: 415,
  rangeNotSatisfiable: 416,
  exceptionFailed: 417,
  imATeapot: 418,
  misdirectedRequest: 421,
  unprocessableContent: 422,
  locked: 423,
  failedDependency: 424,
  tooEarly: 425,
  upgradeRequired: 426,
  preconditionRequired: 428,
  rateLimitExceeded: 429,
  requestHeaderFieldsTooLarge: 431,
  unavailableForLegalReasons: 451,
  internalError: 500,
  notImplemented: 501,
  badGateway: 502,
  serviceUnavailable: 503,
  gatewayTimeout: 504,
  httpVersionNotSupported: 505,
  variantAlsoNegotiates: 506,
  insufficientStorage: 507,
  loopDetected: 508,
  notExtended: 510,
  networkAuthenticationRequired: 511,
} as const;

export type KeyToHttpStatus = typeof KeyToHttpStatus;
