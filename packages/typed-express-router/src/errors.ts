import * as PathReporter from 'io-ts/lib/PathReporter';

import type {
  DecodeErrorFormatterFn,
  EncodeErrorFormatterFn,
  GetDecodeErrorStatusCodeFn,
  GetEncodeErrorStatusCodeFn,
} from './types';

export const defaultDecodeErrorFormatter: DecodeErrorFormatterFn = PathReporter.failure;

export const defaultGetDecodeErrorStatusCode: GetDecodeErrorStatusCodeFn = (
  _err,
  _req,
) => 400;

export const defaultEncodeErrorFormatter: EncodeErrorFormatterFn = () => ({});

export const defaultGetEncodeErrorStatusCode: GetEncodeErrorStatusCodeFn = (
  _err,
  _req,
) => 500;
