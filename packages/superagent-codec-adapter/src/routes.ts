import * as h from '@bitgo/io-ts-http';
import type { SuperAgentRequest } from 'superagent';

import { requestForRoute, BoundRequestFactory, RequestFactory } from './request';

export type ApiClient<Req extends SuperAgentRequest, Spec extends h.ApiSpec> = {
  [A in keyof Spec]: {
    [B in keyof Spec[A]]: BoundRequestFactory<Req, Spec[A][B]>;
  };
};

type PartialApiClient<Req extends SuperAgentRequest, Spec extends h.ApiSpec> = {
  [A in keyof Spec]?: {
    [B in keyof Spec[A]]?: BoundRequestFactory<Req, Spec[A][B]>;
  };
};

export const buildApiClient = <Req extends SuperAgentRequest, Spec extends h.ApiSpec>(
  requestFactory: RequestFactory<Req>,
  spec: Spec,
): ApiClient<Req, Spec> => {
  const result: PartialApiClient<Req, Spec> = {};
  for (const a in spec) {
    if (!spec.hasOwnProperty(a)) {
      continue;
    }
    const subSpec: PartialApiClient<Req, Spec>[typeof a] = {};
    for (const b in spec[a]) {
      if (!spec[a].hasOwnProperty(b)) {
        continue;
      }
      const route = spec[a][b];
      subSpec[b] = requestForRoute(requestFactory, route);
    }
    result[a] = subSpec;
  }

  // Type assert that I did in fact add all the expected properties
  return result as ApiClient<Req, Spec>;
};
