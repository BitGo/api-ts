import * as t from 'io-ts';

import { HttpResponse } from './httpResponse';
import { HttpRequestCodec } from './httpRequest';
import { Status } from '@api-ts/response';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type HttpRoute = {
  readonly path: string;
  readonly method: Method;
  readonly request: HttpRequestCodec<any>;
  readonly response: HttpResponse;
};

export type RequestType<T extends HttpRoute> = t.TypeOf<T['request']>;
export type ResponseType<T extends HttpRoute> = {
  [K in Status]: K extends keyof T['response']
    ? {
        type: K;
        payload: t.TypeOf<T['response'][K]>;
      }
    : never;
}[Status];

export type ApiSpec = {
  [Key: string]: {
    [Req: string]: HttpRoute;
  };
};

export const apiSpec = <Spec extends ApiSpec>(spec: Spec): Spec => spec;

export const httpRoute = <Props extends HttpRoute>(spec: Props): Props => spec;
