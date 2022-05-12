import express from 'express';
import * as t from 'io-ts';

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

// TODO: Use HKT (using fp-ts or a similar workaround method, or who knows maybe they'll add
// official support) to allow for polymorphic ResponseType<_>.
export type ResponseEncoder = (
  route: HttpRoute,
  serviceFnResponse: NumericOrKeyedResponseType<HttpRoute>,
  expressRes: express.Response,
) => void;

export const defaultResponseEncoder: ResponseEncoder = (
  route,
  serviceFnResponse,
  expressRes,
) => {
  const { type, payload } = serviceFnResponse;
  const status = typeof type === 'number' ? type : (KeyToHttpStatus as any)[type];
  if (status === undefined) {
    console.warn('Unknown status code returned');
    expressRes.status(500).end();
    return;
  }
  const responseCodec = route.response[status];
  if (responseCodec === undefined || !responseCodec.is(payload)) {
    console.warn(
      "Unable to encode route's return value, did you return the expected type?",
    );
    expressRes.status(500).end();
    return;
  }

  expressRes.status(status).json(responseCodec.encode(payload)).end();
};
