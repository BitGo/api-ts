/**
 * express-wrapper
 * A simple, type-safe web server
 */

import express from 'express';

import { ApiSpec, HttpRoute, Method as HttpMethod } from '@api-ts/io-ts-http';
import { createRouter } from '@api-ts/typed-express-router';

import { handleRequest, onDecodeError, onEncodeError, RouteHandler } from './request';
import { defaultResponseEncoder, ResponseEncoder } from './response';

export { middlewareFn, MiddlewareChain, MiddlewareChainOutput } from './middleware';
export type { ResponseEncoder, KeyedResponseType } from './response';
export { routeHandler, ServiceFunction } from './request';

type CreateRouterProps<Spec extends ApiSpec> = {
  spec: Spec;
  routeHandlers: {
    [ApiName in keyof Spec]: {
      [Method in keyof Spec[ApiName] & HttpMethod]: RouteHandler<
        NonNullable<Spec[ApiName][Method]>
      >;
    };
  };
  encoder?: ResponseEncoder;
};

export function routerForApiSpec<Spec extends ApiSpec>({
  spec,
  routeHandlers,
  encoder = defaultResponseEncoder,
}: CreateRouterProps<Spec>) {
  const router = createRouter(spec, {
    onDecodeError,
    onEncodeError,
  });
  for (const apiName of Object.keys(spec)) {
    const resource = spec[apiName] as Spec[string];
    for (const method of Object.keys(resource)) {
      if (!HttpMethod.is(method)) {
        continue;
      }
      const httpRoute: HttpRoute = resource[method]!;
      const routeHandler = routeHandlers[apiName]![method]!;
      const expressRouteHandler = handleRequest(
        apiName,
        httpRoute,
        routeHandler as RouteHandler<HttpRoute>,
        encoder,
      );

      // FIXME: Can't prove to TS here that `apiName` is valid to pass to the generalized `router[method]`
      (router[method] as any)(apiName, [expressRouteHandler]);
    }
  }

  return router;
}

export const createServer = <Spec extends ApiSpec>(
  spec: Spec,
  configureExpressApplication: (app: express.Application) => {
    [ApiName in keyof Spec]: {
      [Method in keyof Spec[ApiName] & HttpMethod]: RouteHandler<
        NonNullable<Spec[ApiName][Method]>
      >;
    };
  },
) => {
  const app = express();
  const routeHandlers = configureExpressApplication(app);
  const router = routerForApiSpec({ spec, routeHandlers });
  app.use(router);
  return app;
};
