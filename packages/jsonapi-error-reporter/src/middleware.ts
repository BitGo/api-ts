import { Request, Response, NextFunction } from 'express';
import { Errors } from 'io-ts';

import { JSONAPIErrorReporter } from './index';

/**
 * Express middleware to handle io-ts errors in a JSON API compliant way
 *
 * @param errs - io-ts validation errors
 * @param _req - Express request
 * @param res - Express response
 */
export const onDecodeError = (errs: Errors, _req: Request, res: Response): void => {
  const errorResponse = JSONAPIErrorReporter.report(errs);
  res.status(422).json(errorResponse);
};

/**
 * Express middleware to handle unexpected errors in a JSON API compliant way
 *
 * @param err - Error object
 * @param _req - Express request
 * @param res - Express response
 * @param next - Express next function
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (res.headersSent) {
    return next();
  }

  const errorResponse = {
    errors: [
      {
        status: '500',
        title: 'Internal Server Error',
        detail:
          process.env.NODE_ENV === 'production'
            ? 'An unexpected error occurred'
            : err.message,
      },
    ],
  };

  res.status(500).json(errorResponse);
};
