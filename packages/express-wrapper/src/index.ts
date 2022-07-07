/**
 * express-wrapper
 * A simple, type-safe web server
 */

import express from 'express';

import { applyMiddleware, applyServiceFn, middleware } from '@api-ts/http-router';
import { ApiSpec } from '@api-ts/io-ts-http';

import { apiTsPathToExpress } from './path';
import { encodeExpressResponse } from './response';
import { getMiddleware, getServiceFunction, RouteHandler } from './expressMiddleware';
import { decodeExpressRequest } from './request';
import { expressHandlerForRoute, ExpressResponseSent } from './routeHandler';

export type { NumericOrKeyedResponseType } from './response';

const isHttpVerb = (verb: string): verb is 'get' | 'put' | 'post' | 'delete' =>
  verb === 'get' || verb === 'put' || verb === 'post' || verb === 'delete';

type CreateRouterProps<Spec extends ApiSpec> = {
  spec: Spec;
  routeHandlers: {
    [ApiName in keyof Spec]: {
      [Method in keyof Spec[ApiName]]: RouteHandler<Spec[ApiName][Method]>;
    };
  };
};

export function routerForApiSpec<Spec extends ApiSpec>({
  spec,
  routeHandlers,
}: CreateRouterProps<Spec>) {
  const router = express.Router();
  for (const apiName of Object.keys(spec)) {
    const resource = spec[apiName] as Spec[typeof apiName];
    for (const method of Object.keys(resource)) {
      if (!isHttpVerb(method)) {
        continue;
      }
      const httpRoute = resource[method]! as Spec[string][string];
      const routeHandler = routeHandlers[apiName]![method]!;
      const expressMiddleware = getMiddleware(routeHandler);
      const serviceFn = getServiceFunction(routeHandler);

      const pipeline = expressHandlerForRoute(httpRoute)(
        middleware(
          applyMiddleware(decodeExpressRequest),
          applyServiceFn(serviceFn, (err, { res }) => {
            console.error(err);
            res.status(500);
            res.end();
            return ExpressResponseSent;
          }),
          encodeExpressResponse,
        ),
      );

      const expressPath = apiTsPathToExpress(httpRoute.path);
      router[method](expressPath, [...expressMiddleware, pipeline]);
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
