import * as h from '@api-ts/io-ts-http';
import type { SuperagentRequest, Response } from './request';

import { requestForRoute, BoundRequestFactory, RequestFactory } from './request';

export type ApiClient<
  Req extends SuperagentRequest<Response>,
  Spec extends h.ApiSpec,
> = {
  [A in keyof Spec]: {
    [B in keyof Spec[A] & h.Method]: BoundRequestFactory<Req, NonNullable<Spec[A][B]>>;
  };
};

export const buildApiClient = <
  Req extends SuperagentRequest<Response>,
  Spec extends h.ApiSpec,
>(
  requestFactory: RequestFactory<Req>,
  spec: Spec,
): ApiClient<Req, Spec> => {
  const result: any = {};
  for (const apiName in spec) {
    if (!spec.hasOwnProperty(apiName)) {
      continue;
    }
    const subSpec: any = {};
    for (const method in spec[apiName]) {
      if (!spec[apiName].hasOwnProperty(method) || !h.Method.is(method)) {
        continue;
      }
      const route = spec[apiName][method];
      if (route === undefined) {
        // Should only happen with an explicit undefined property, which we can only prevent at the
        // type level with the `exactOptionalPropertyTypes` tsconfig option
        throw Error(`Method "${method}" at "${apiName}" must not be "undefined"'`);
      }
      subSpec[method] = requestForRoute(requestFactory, route);
    }
    result[apiName] = subSpec;
  }

  // Type assert that I did in fact add all the expected properties
  return result as ApiClient<Req, Spec>;
};
