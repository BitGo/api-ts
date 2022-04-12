import * as h from '@api-ts/io-ts-http';
import * as E from 'fp-ts/Either';
import * as t from 'io-ts';
import type { Response, SuperAgent, SuperAgentRequest } from 'superagent';
import type { SuperTest } from 'supertest';
import { URL } from 'url';
import { pipe } from 'fp-ts/function';
import { Status } from '@api-ts/response';

type SuccessfulResponses<Route extends h.HttpRoute> = {
  [R in h.KnownResponses<Route['response']>]: {
    status: h.HttpResponseCodes[R];
    error?: undefined;
    body: h.ResponseTypeForStatus<Route['response'], R>;
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
  StatusCode extends h.HttpResponseCodes[h.KnownResponses<Route['response']>],
> = DecodedResponse<Route> & { status: StatusCode };

type PatchedRequest<Req extends SuperAgentRequest, Route extends h.HttpRoute> = Req & {
  decode: () => Promise<DecodedResponse<Route>>;
  decodeExpecting: <
    StatusCode extends h.HttpResponseCodes[h.KnownResponses<Route['response']>],
  >(
    status: StatusCode,
  ) => Promise<ExpectedDecodedResponse<Route, StatusCode>>;
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

const hasCodecForStatus = <S extends Status>(
  responses: h.HttpResponse,
  status: S,
): responses is { [K in S]: t.Mixed } => {
  return status in responses && responses[status] !== undefined;
};

const patchRequest = <Req extends SuperAgentRequest, Route extends h.HttpRoute>(
  route: Route,
  req: Req,
): PatchedRequest<Req, Route> => {
  const patchedReq = req as PatchedRequest<Req, Route>;

  patchedReq.decode = () =>
    req.then((res) => {
      const { body, status: statusCode } = res;

      let status: Status | undefined;
      // DISCUSS: Should we have this as a preprocessed const in io-ts-http?
      for (const [name, code] of Object.entries(h.HttpResponseCodes)) {
        if (statusCode === code) {
          status = name as Status;
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
            status: statusCode as h.HttpResponseCodes[h.KnownResponses<
              Route['response']
            >],
            body,
            original: res,
          } as SuccessfulResponses<Route>),
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

  patchedReq.decodeExpecting = <
    StatusCode extends h.HttpResponseCodes[h.KnownResponses<Route['response']>],
  >(
    status: StatusCode,
  ) =>
    patchedReq.decode().then((res) => {
      if (res.status !== status) {
        const error = res.error ?? `Unexpected status code ${res.status}`;
        throw new Error(JSON.stringify(error));
      } else {
        return res as ExpectedDecodedResponse<Route, StatusCode>;
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
