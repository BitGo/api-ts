import * as t from 'io-ts';

import { HttpResponse } from './httpResponse';
import { HttpRequestCodec } from './httpRequest';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type HttpRoute = {
  readonly path: string;
  readonly method: Method;
  readonly request: HttpRequestCodec<any>;
  readonly response: HttpResponse;
};

export type RequestType<T extends HttpRoute> = t.TypeOf<T['request']>;
export type ResponseType<T extends HttpRoute> = {
  [K in keyof T['response']]: T['response'][K] extends t.Mixed
    ? {
        type: K;
        payload: t.TypeOf<T['response'][K]>;
      }
    : never;
}[keyof T['response']];

export type ApiSpec = {
  [Key: string]: {
    [Req: string]: HttpRoute;
  };
};

export const apiSpec = <Spec extends ApiSpec>(spec: Spec): Spec => spec;

export const httpRoute = <Props extends HttpRoute>(spec: Props): Props => spec;
