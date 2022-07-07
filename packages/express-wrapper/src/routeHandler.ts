import { RouteHandler } from '@api-ts/http-router';
import * as h from '@api-ts/io-ts-http';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import type { Request, RequestHandler, Response } from 'express';

export type ExpressRequestEnv<Route extends h.HttpRoute = h.HttpRoute> = {
  req: Request;
  res: Response;
  route: Route;
};

/**
 * Symbol that a middleware should use to denote that the `res` object has been used to send a response
 */
export const ExpressResponseSent = Symbol();
export type ExpressResponseSent = typeof ExpressResponseSent;

export type ExpressResponseOrNext = ExpressResponseSent | unknown;

export const expressHandlerForRoute =
  <Route extends h.HttpRoute>(route: Route) =>
  (
    routeHandler: RouteHandler<ExpressRequestEnv<Route>, ExpressResponseOrNext, any>,
  ): RequestHandler =>
  async (req, res, next) => {
    await pipe(
      routeHandler({ req, res, route }),
      TE.match(
        (nextParam) => {
          if (nextParam !== ExpressResponseSent) {
            next(nextParam);
          }
        },
        () => {
          next();
        },
      ),
    )();
  };
