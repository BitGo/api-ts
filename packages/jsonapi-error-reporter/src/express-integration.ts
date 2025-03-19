import { Request, Response, NextFunction } from 'express';
import { ApiSpec } from '@api-ts/io-ts-http';
import { createRouter, WrappedRouterOptions } from '@api-ts/typed-express-router';

import { onDecodeError, errorHandler } from './middleware';

/**
 * Creates an Express router with JSON API error handling
 *
 * @param config - Router configuration including API spec and handlers
 * @returns Express router with JSON API error handling
 */
export function createJSONApiRouter<Spec extends ApiSpec>(
  config: Omit<WrappedRouterOptions & { spec: Spec }, 'onDecodeError'>,
) {
  const router = createRouter<Spec>(config.spec, {
    ...config,
    onDecodeError,
  });

  // Add the JSON API error handler as the last middleware
  (router as any).use((err: Error, req: Request, res: Response, next: NextFunction) => {
    errorHandler(err, req, res, next);
  });

  return router;
}
