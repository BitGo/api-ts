import express from 'express';

import { ApiSpec, HttpRoute } from '@api-ts/io-ts-http';

import { apiTsPathToExpress } from './path';
import {
  expressHandlerForRoute,
  ExpressRequestEnv,
  RouteHandler,
} from './routeHandler';

type ActionsWithMethod<Spec extends ApiSpec, Method extends string> = {
  [K in keyof Spec]: Method extends keyof Spec[K] ? K : never;
}[keyof Spec];

type DeclareRoute<Spec extends ApiSpec, Method extends string> = <
  Action extends ActionsWithMethod<Spec, Method>,
>(
  action: Action,
  pipeline: RouteHandler<ExpressRequestEnv<Spec[Action][Method]>, any, any>,
) => void;

export type RouterBuilder<Spec extends ApiSpec> = {
  get: DeclareRoute<Spec, 'get'>;
  post: DeclareRoute<Spec, 'post'>;
  put: DeclareRoute<Spec, 'put'>;
  delete: DeclareRoute<Spec, 'delete'>;
  build: () => express.Router;
};

export function routerBuilder<Spec extends ApiSpec>(spec: Spec): RouterBuilder<Spec> {
  const router = express.Router();

  function declareRoute<Method extends 'get' | 'post' | 'put' | 'delete'>(
    method: Method,
  ): DeclareRoute<Spec, Method> {
    return (action, pipeline) => {
      const route = spec[action]![method]!;
      const reqHandler = expressHandlerForRoute(route)(pipeline);
      const expressPath = apiTsPathToExpress((route as HttpRoute).path);
      router[method](expressPath, reqHandler);
    };
  }

  return {
    get: declareRoute('get'),
    post: declareRoute('post'),
    put: declareRoute('put'),
    delete: declareRoute('delete'),
    build: () => router,
  };
}
