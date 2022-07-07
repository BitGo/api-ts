import { Middleware } from '@api-ts/http-router';
import * as TE from 'fp-ts/TaskEither';
import * as t from 'io-ts';

import { ExpressRequestEnv, ExpressResponseSent } from './routeHandler';

import {
  HttpRoute,
  HttpToKeyStatus,
  KeyToHttpStatus,
  ResponseType,
} from '@api-ts/io-ts-http';

export type NumericOrKeyedResponseType<R extends HttpRoute> =
  | ResponseType<R>
  | {
      [Key in keyof R['response'] & keyof HttpToKeyStatus]: {
        type: HttpToKeyStatus[Key];
        payload: t.TypeOf<R['response'][Key]>;
      };
    }[keyof R['response'] & keyof HttpToKeyStatus];

export function encodeExpressResponse<Route extends HttpRoute>({
  type,
  payload,
}: NumericOrKeyedResponseType<Route>): Middleware<
  ExpressResponseSent,
  never,
  ExpressRequestEnv<Route>
> {
  return ({ res, route }) => {
    const status = typeof type === 'number' ? type : (KeyToHttpStatus as any)[type];
    if (status === undefined) {
      console.warn('Unknown status code returned');
      res.status(500).end();
      return TE.left(ExpressResponseSent);
    }
    const responseCodec = route.response[status];
    try {
      res.status(status).json(responseCodec!.encode(payload)).end();
    } catch {
      console.warn(
        "Unable to encode route's return value, did you return the expected type?",
      );
      res.status(500).end();
    }
    return TE.left(ExpressResponseSent);
  };
}
