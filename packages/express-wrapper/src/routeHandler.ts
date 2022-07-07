import * as h from '@api-ts/io-ts-http';
import { pipe } from 'fp-ts/function';
import * as TE from 'fp-ts/TaskEither';
import type { Request, RequestHandler, Response } from 'express';

export type RouteHandler<Input, Response, Next = Input> = (
  req: Input,
) => TE.TaskEither<Response, Next>;

export type ExpressRequestEnv<Route extends h.HttpRoute = h.HttpRoute> = {
  req: Request;
  res: Response;
  route: Route;
};

export const expressHandlerForRoute =
  <Route extends h.HttpRoute>(route: Route) =>
  (routeHandler: RouteHandler<ExpressRequestEnv<Route>, any, any>): RequestHandler =>
  async (req, res, next) => {
    await pipe(
      routeHandler({ req, res, route }),
      TE.match(
        (nextParam) => {
          // Checks if `res.end()` has been called
          if (!res.writableEnded) {
            next(nextParam);
          }
        },
        () => {
          next();
        },
      ),
    )();
  };
