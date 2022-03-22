import * as h from '@bitgo/io-ts-http';
import * as E from 'fp-ts/Either';
import * as t from 'io-ts';
import type { Response, SuperAgent, SuperAgentRequest } from 'superagent';
import type { SuperTest } from 'supertest';
import { URL } from 'url';
import { pipe } from 'fp-ts/function';
import { HttpResponseCodes } from '@bitgo/io-ts-http';

type SuccessfulResponses<Route extends h.HttpRoute> = {
  [Status in h.KnownResponses<Route['response']>]: {
    status: Status;
    error?: undefined;
    body: t.TypeOf<Route['response'][Status]>;
    original: Response;
  };
}[h.KnownResponses<Route['response']>];

type DecodedResponse<Route extends h.HttpRoute> =
  | SuccessfulResponses<Route>
  | {
      status: 'decodeError';
      error: unknown;
      body: unknown;
      original: Response;
    };

const decodedResponse = <Route extends h.HttpRoute>(res: DecodedResponse<Route>) => res;

type ExpectedDecodedResponse<
  Route extends h.HttpRoute,
  Status extends h.KnownResponses<Route['response']>,
> = {
  body: t.TypeOf<Route['response'][Status]>;
  original: Response;
};

type PatchedRequest<Req extends SuperAgentRequest, Route extends h.HttpRoute> = Req & {
  decode: () => Promise<DecodedResponse<Route>>;
  decodeExpecting: <Status extends h.KnownResponses<Route['response']>>(
    status: Status,
  ) => Promise<ExpectedDecodedResponse<Route, Status>>;
};

type SuperagentMethod = 'get' | 'post' | 'put' | 'delete';

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

export type RequestFactory<Req extends SuperAgentRequest> = <Route extends h.HttpRoute>(
  route: Route,
  params: Record<string, string>,
) => Req;

export const superagentRequestFactory =
  <Req extends SuperAgentRequest>(
    superagent: SuperAgent<Req>,
    base: string,
  ): RequestFactory<Req> =>
  <Route extends h.HttpRoute>(route: Route, params: Record<string, string>) => {
    const method = METHOD_MAP[route.method];
    const url = new URL(base);
    url.pathname = substitutePathParams(route.path, params);
    return superagent[method](url.toString());
  };

export const supertestRequestFactory =
  <Req extends SuperAgentRequest>(supertest: SuperTest<Req>): RequestFactory<Req> =>
  <Route extends h.HttpRoute>(route: Route, params: Record<string, string>) => {
    const method = METHOD_MAP[route.method];
    const path = substitutePathParams(route.path, params);
    return supertest[method](path);
  };

const patchRequest = <Req extends SuperAgentRequest, Route extends h.HttpRoute>(
  route: Route,
  req: Req,
): PatchedRequest<Req, Route> => {
  const patchedReq = req as PatchedRequest<Req, Route>;

  patchedReq.decode = () =>
    req.then((res) => {
      const { body, status: statusCode } = res;

      let status: string | undefined;
      // DISCUSS: Should we have this as a preprocessed const in io-ts-http?
      for (const [name, code] of Object.entries(HttpResponseCodes)) {
        if (statusCode === code) {
          status = name;
          break;
        }
      }
      if (status === undefined) {
        return decodedResponse({
          status: 'decodeError',
          error: `Unknown status code ${statusCode}`,
          body,
          original: res,
        });
      }

      if (route.response[status] === undefined) {
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
            status: status as h.KnownResponses<Route['response']>,
            body,
            original: res,
          }),
        ),
        E.getOrElse((error) =>
          // DISCUSS: what's this non-standard HTTP status code?
          decodedResponse<Route>({
            status: 'decodeError',
            error,
            body: res.body,
            original: res,
          }),
        ),
      );
    });

  patchedReq.decodeExpecting = <Status extends h.KnownResponses<Route['response']>>(
    status: Status,
  ) =>
    patchedReq.decode().then((res) => {
      if (res.status !== status) {
        const error = res.error ?? `Unexpected status code ${res.status}`;
        throw new Error(JSON.stringify(error));
      } else {
        return {
          body: res.body,
          original: res.original,
        };
      }
    });
  return patchedReq;
};

export type BoundRequestFactory<
  Req extends SuperAgentRequest,
  Route extends h.HttpRoute,
> = (params: h.RequestType<Route>) => PatchedRequest<Req, Route>;

export const requestForRoute =
  <Req extends SuperAgentRequest, Route extends h.HttpRoute>(
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
