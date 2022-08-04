import * as t from 'io-ts';

export type HttpResponse = {
  [K: number | string]: t.Mixed;
};

export type ResponseTypeForStatus<
  Response extends HttpResponse,
  S extends keyof Response,
> = Response[S] extends t.Mixed ? t.TypeOf<Response[S]> : never;
