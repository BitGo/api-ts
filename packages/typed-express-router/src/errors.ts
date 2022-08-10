import express from 'express';
import { Errors } from 'io-ts';
import * as PathReporter from 'io-ts/lib/PathReporter';

export function defaultOnDecodeError(
  errs: Errors,
  _req: express.Request,
  res: express.Response,
) {
  const validationErrors = PathReporter.failure(errs);
  const validationErrorMessage = validationErrors.join('\n');
  res.status(400).json({ error: validationErrorMessage }).end();
}

export function defaultOnEncodeError(
  err: unknown,
  _req: express.Request,
  res: express.Response,
) {
  res.status(500).end();
  console.warn(`Error in route handler: ${err}`);
}
