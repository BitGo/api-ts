/**
 * express-wrapper
 * A simple, type-safe web server
 */

import express from 'express';

import { ApiSpec, HttpRoute } from '@api-ts/io-ts-http';

import { apiTsPathToExpress } from './path';
import {
  decodeRequestAndEncodeResponse,
  getMiddleware,
  getServiceFunction,
  RouteHandler,
} from './request';
import { defaultResponseEncoder, ResponseEncoder } from './response';

export type { ResponseEncoder } from './response';

const isHttpVerb = (verb: string): verb is 'get' | 'put' | 'post' | 'delete' =>
  verb === 'get' || verb === 'put' || verb === 'post' || verb === 'delete';

export const createServerWithResponseEncoder =
  (encoder: ResponseEncoder) =>
  <Spec extends ApiSpec>(
    spec: ApiSpec,
    configureExpressApplication: (app: express.Application) => {
      [ApiName in keyof Spec]: {
        [Method in keyof Spec[ApiName]]: RouteHandler<Spec[ApiName][Method]>;
      };
    },
  ) => {
    const app: express.Application = express();
    const routes = configureExpressApplication(app);

    const router = express.Router();
    for (const apiName of Object.keys(spec)) {
      const resource = spec[apiName] as Spec[string];
      for (const method of Object.keys(resource)) {
        if (!isHttpVerb(method)) {
          continue;
        }
        const httpRoute: HttpRoute = resource[method]!;
        const routeHandler = routes[apiName]![method]!;
        const expressRouteHandler = decodeRequestAndEncodeResponse(
          apiName,
          httpRoute,
          // FIXME: TS is complaining that `routeHandler` is not necessarily guaranteed to be a
          // `ServiceFunction`, because subtypes of Spec[string][string] can have arbitrary extra keys.
          getServiceFunction(routeHandler as any),
          encoder,
        );
        const handlers = [...getMiddleware(routeHandler), expressRouteHandler];

        const expressPath = apiTsPathToExpress(httpRoute.path);
        router[method](expressPath, handlers);
      }
    }

    app.use(router);

    return app;
  };

export const createServer = createServerWithResponseEncoder(defaultResponseEncoder);
