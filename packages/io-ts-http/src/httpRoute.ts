import * as t from 'io-ts';

import { HttpResponse } from './httpResponse';
import { HttpRequestCodec } from './httpRequest';

export const Method = t.keyof({
  get: 1,
  post: 1,
  put: 1,
  delete: 1,
  patch: 1,
});

export type Method = t.TypeOf<typeof Method>;

export type HttpRoute<M extends Method = Method> = {
  readonly path: string;
  readonly method: Uppercase<M>;
  readonly request: HttpRequestCodec<any>;
  readonly response: HttpResponse;
  readonly generate?: boolean;
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
  [ApiAction: string]: {
    [M in Method]?: HttpRoute<M>;
  };
};

type UnknownKeysToError<Spec extends ApiSpec> = {
  [ApiAction in keyof Spec]: {
    [M in keyof Spec[ApiAction]]: M extends Method
      ? Spec[ApiAction][M]
      : `Unsupported HTTP Method. Use "get" | "post" | "put" | "delete" | "patch"`;
  };
};

export const apiSpec = <Spec extends ApiSpec>(spec: UnknownKeysToError<Spec>): Spec =>
  spec as Spec;

export const httpRoute = <Props extends HttpRoute>(spec: Props): Props => spec;
