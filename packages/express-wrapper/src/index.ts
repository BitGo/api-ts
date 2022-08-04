/**
 * express-wrapper
 * A simple, type-safe web server
 */

import express from 'express';

import { ApiSpec, HttpRoute } from '@api-ts/io-ts-http';

import { apiTsPathToExpress } from './path';
import { decodeRequestAndEncodeResponse, RouteHandler } from './request';
import { defaultResponseEncoder, ResponseEncoder } from './response';

export { middlewareFn, MiddlewareChain, MiddlewareChainOutput } from './middleware';
export type { ResponseEncoder, KeyedResponseType } from './response';
export { routeHandler, ServiceFunction } from './request';

const isHttpVerb = (verb: string): verb is 'get' | 'put' | 'post' | 'delete' =>
  verb === 'get' || verb === 'put' || verb === 'post' || verb === 'delete';

type CreateRouterProps<Spec extends ApiSpec> = {
  spec: Spec;
  routeHandlers: {
    [ApiName in keyof Spec]: {
      [Method in keyof Spec[ApiName]]: RouteHandler<Spec[ApiName][Method]>;
    };
  };
  encoder?: ResponseEncoder;
};

export function routerForApiSpec<Spec extends ApiSpec>({
  spec,
  routeHandlers,
  encoder = defaultResponseEncoder,
}: CreateRouterProps<Spec>) {
  const router = express.Router();
  for (const apiName of Object.keys(spec)) {
    const resource = spec[apiName] as Spec[string];
    for (const method of Object.keys(resource)) {
      if (!isHttpVerb(method)) {
        continue;
      }
      const httpRoute: HttpRoute = resource[method]!;
      const routeHandler = routeHandlers[apiName]![method]!;
      const expressRouteHandler = decodeRequestAndEncodeResponse(
        apiName,
        httpRoute,
        // FIXME: TS is complaining that `routeHandler` is not necessarily guaranteed to be a
        // `ServiceFunction`, because subtypes of Spec[string][string] can have arbitrary extra keys.
        routeHandler as RouteHandler<any>,
        encoder,
      );

      const expressPath = apiTsPathToExpress(httpRoute.path);
      router[method](expressPath, expressRouteHandler);
    }
  }

  return router;
}

export const createServer = <Spec extends ApiSpec>(
  spec: Spec,
  configureExpressApplication: (app: express.Application) => {
    [ApiName in keyof Spec]: {
      [Method in keyof Spec[ApiName]]: RouteHandler<Spec[ApiName][Method]>;
    };
  },
) => {
  const app = express();
  const routeHandlers = configureExpressApplication(app);
  const router = routerForApiSpec({ spec, routeHandlers });
  app.use(router);
  return app;
};
