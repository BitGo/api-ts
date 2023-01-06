import express from 'express';
import * as t from 'io-ts';

import {
  HttpRoute,
  HttpToKeyStatus,
  KeyToHttpStatus,
  ResponseType,
} from '@api-ts/io-ts-http';

export type KeyedResponseType<R extends HttpRoute> = {
  [Key in keyof R['response'] & keyof HttpToKeyStatus]: {
    type: HttpToKeyStatus[Key];
    payload: t.TypeOf<R['response'][Key]>;
  };
}[keyof R['response'] & keyof HttpToKeyStatus];

export type ResponseEncoder = (
  route: HttpRoute,
  serviceFnResponse: ResponseType<HttpRoute>,
) => express.RequestHandler;

export const defaultResponseEncoder: ResponseEncoder =
  (route, serviceFnResponse) => (_req, res) => {
    const { type, payload } = serviceFnResponse;
    const status = typeof type === 'number' ? type : (KeyToHttpStatus as any)[type];
    if (status === undefined) {
      console.warn(`Unknown status code ${status} returned`);
      res.status(500).end();
      return;
    }
    const responseCodec = route.response[status];
    try {
      res.status(status).json(responseCodec!.encode(payload)).end();
    } catch (err) {
      console.warn(
        `Unable to encode route's return value, did you return the expected type?: ${err}`,
      );
      res.status(500).end();
    }
  };
