import * as h from '@api-ts/io-ts-http';
import * as E from 'fp-ts/Either';
import * as t from 'io-ts';
import * as PathReporter from 'io-ts/lib/PathReporter';
import { URL } from 'url';
import { pipe } from 'fp-ts/function';

type SuccessfulResponses<Route extends h.HttpRoute> = {
  [R in keyof Route['response']]: {
    status: R;
    error?: undefined;
    body: h.ResponseTypeForStatus<Route['response'], R>;
    original: Response;
  };
}[keyof Route['response']];

export type DecodedResponse<Route extends h.HttpRoute> =
  | SuccessfulResponses<Route>
  | {
      status: 'decodeError';
      error: string;
      body: unknown;
      original: Response;
    };

export class DecodeError extends Error {
  readonly decodedResponse: DecodedResponse<h.HttpRoute>;

  constructor(message: string, decodedResponse: DecodedResponse<h.HttpRoute>) {
    super(message);
    this.decodedResponse = decodedResponse;
  }
}

const decodedResponse = <Route extends h.HttpRoute>(res: DecodedResponse<Route>) => res;

type ExpectedDecodedResponse<
  Route extends h.HttpRoute,
  StatusCode extends keyof Route['response'],
> = DecodedResponse<Route> & { status: StatusCode };

type PatchedRequest<Req, Route extends h.HttpRoute> = Req & {
  decode: () => Promise<DecodedResponse<Route>>;
  decodeExpecting: <StatusCode extends keyof Route['response']>(
    status: StatusCode,
  ) => Promise<ExpectedDecodedResponse<Route, StatusCode>>;
};

type SuperagentMethod = 'get' | 'post' | 'put' | 'delete';

type SuperagentLike<Req> = {
  [K in SuperagentMethod]: (url: string) => Req;
};

type Response = {
  body: unknown;
  status: number;
};

interface SuperagentRequest<Res extends Response> extends Promise<Res> {
  ok(callback: (response: Res) => boolean): this;
  query(params: Record<string, string | string[]>): this;
  set(name: string, value: string): this;
  send(body: string): this;
}

const METHOD_MAP: { [K in h.Method]: SuperagentMethod } = {
  GET: 'get',
  POST: 'post',
  PUT: 'put',
  DELETE: 'delete',
};

const substitutePathParams = (path: string, params: Record<string, string>) => {
  for (const key in params) {
    if (params.hasOwnProperty(key)) {
      path = path.replace(`{${key}}`, params[key]);
    }
  }
  return path;
};

export type RequestFactory<Req> = <Route extends h.HttpRoute>(
  route: Route,
  params: Record<string, string>,
) => Req;

export const superagentRequestFactory =
  <Req>(superagent: SuperagentLike<Req>, base: string): RequestFactory<Req> =>
  <Route extends h.HttpRoute>(route: Route, params: Record<string, string>) => {
    const method = METHOD_MAP[route.method];
    const url = new URL(base);
    url.pathname = substitutePathParams(route.path, params);
    return superagent[method](url.toString());
  };

export const supertestRequestFactory =
  <Req>(supertest: SuperagentLike<Req>): RequestFactory<Req> =>
  <Route extends h.HttpRoute>(route: Route, params: Record<string, string>) => {
    const method = METHOD_MAP[route.method];
    const path = substitutePathParams(route.path, params);
    return supertest[method](path);
  };

const hasCodecForStatus = <S extends number>(
  responses: h.HttpResponse,
  status: S,
): responses is { [K in S]: t.Mixed } => {
  return status in responses && responses[status] !== undefined;
};

const patchRequest = <
  Req extends SuperagentRequest<Response>,
  Route extends h.HttpRoute,
>(
  route: Route,
  req: Req,
): PatchedRequest<Req, Route> => {
  const patchedReq = req as PatchedRequest<Req, Route>;

  patchedReq.decode = () =>
    req.then((res) => {
      const { body, status } = res;

      if (!hasCodecForStatus(route.response, status)) {
        return decodedResponse({
          // DISCUSS: what's this non-standard HTTP status code?
          status: 'decodeError',
          error: `No codec for status ${status}`,
          body,
          original: res,
        });
      }
      return pipe(
        route.response[status].decode(res.body),
        E.map((body) =>
          decodedResponse<Route>({
            status,
            body,
            original: res,
          } as SuccessfulResponses<Route>),
        ),
        E.getOrElse((error) =>
          // DISCUSS: what's this non-standard HTTP status code?
          decodedResponse<Route>({
            status: 'decodeError',
            error: PathReporter.failure(error).join('\n'),
            body: res.body,
            original: res,
          }),
        ),
      );
    });

  patchedReq.decodeExpecting = <StatusCode extends keyof Route['response']>(
    status: StatusCode,
  ) =>
    patchedReq.decode().then((res) => {
      if (res.original.status !== status) {
        const error = `Unexpected response ${String(
          res.original.status,
        )}: ${JSON.stringify(res.original.body)}`;
        throw new DecodeError(error, res as DecodedResponse<h.HttpRoute>);
      } else if (res.status === 'decodeError') {
        const error = `Could not decode response ${String(
          res.original.status,
        )}: ${JSON.stringify(res.original.body)}`;
        throw new DecodeError(error, res as DecodedResponse<h.HttpRoute>);
      } else {
        return res as ExpectedDecodedResponse<Route, StatusCode>;
      }
    });

  // Stop superagent from throwing on non-2xx status codes
  patchedReq.ok(() => true);

  return patchedReq;
};

export type BoundRequestFactory<
  Req extends SuperagentRequest<Response>,
  Route extends h.HttpRoute,
> = (params: h.RequestType<Route>) => PatchedRequest<Req, Route>;

export const requestForRoute =
  <Req extends SuperagentRequest<Response>, Route extends h.HttpRoute>(
    requestFactory: RequestFactory<Req>,
    route: Route,
  ): BoundRequestFactory<Req, Route> =>
  (params: h.RequestType<Route>): PatchedRequest<Req, Route> => {
    const reqProps = route.request.encode(params);

    let path = route.path;
    for (const key in reqProps.params) {
      if (reqProps.params.hasOwnProperty(key)) {
        path = path.replace(`{${key}}`, reqProps.params[key]);
      }
    }

    let request = requestFactory(route, reqProps.params).query(reqProps.query);

    const headers = reqProps.headers ?? {};
    for (const key in headers) {
      if (headers.hasOwnProperty(key)) {
        request = request.set(key, headers[key]);
      }
    }

    if (reqProps.body) {
      request.set('content-type', 'application/json');
      request = request.send(JSON.stringify(reqProps.body));
    }

    return patchRequest(route, request);
  };
