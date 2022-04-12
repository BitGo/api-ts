import * as t from 'io-ts';

import { HttpResponse, KnownResponses } from './httpResponse';
import { httpRequest, HttpRequestCodec } from './httpRequest';
import { Status } from '@api-ts/response';

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type HttpRoute = {
  readonly path: string;
  readonly method: Method;
  readonly request: HttpRequestCodec<any>;
  readonly response: HttpResponse;
};

type ResponseItem<Status, Codec extends t.Mixed | undefined> = Codec extends t.Mixed
  ? {
      type: Status;
      payload: t.TypeOf<Codec>;
    }
  : never;

export type RequestType<T extends HttpRoute> = t.TypeOf<T['request']>;
export type ResponseType<T extends HttpRoute> = {
  [K in KnownResponses<T['response']>]: ResponseItem<K, T['response'][K]>;
}[KnownResponses<T['response']>];

export type ApiSpec = {
  [Key: string]: {
    [Req: string]: HttpRoute;
  };
};

export const apiSpec = <Spec extends ApiSpec>(spec: Spec): Spec => spec;

export const httpRoute = <Props extends HttpRoute>(spec: Props): Props => spec;
