/*
 * @api-ts/typed-express-router
 */

// This module handles the optional dependency on @opentelemetry/api
// It provides functionality for creating spans for decode and sendEncoded operations

import type { Attributes, Span, Tracer } from '@opentelemetry/api';

import type { Json, SpanMetadata } from './types';

let otelApi: any;
let tracer: Tracer | undefined;

// Load @opentelemetry/api, if available.
try {
  otelApi = require('@opentelemetry/api');
  if (otelApi) {
    tracer = otelApi.trace.getTracer('typed-express-router');
  }
} catch (e) {
  // Optional dependency not available, so tracing will be disabled.
  tracer = undefined;
}

export const ApiTsAttributes = {
  /**
   * The Operation ID of the HTTP request
   */
  API_TS_OPERATION_ID: 'api_ts.operation_id',

  /**
   * The method of the HTTP request
   */
  API_TS_METHOD: 'api_ts.method',

  /**
   * The path of the HTTP request
   */
  API_TS_PATH: 'api_ts.path',

  /**
   * Returned HTTP request status code
   */
  API_TS_STATUS_CODE: 'api_ts.status_code',
};

/**
 * Create default attributes for decode spans
 *
 * @param metadata The metadata for a span
 * @returns Record of span attributes
 */
export function createDefaultDecodeAttributes(metadata: SpanMetadata): Attributes {
  const attributes: Attributes = {};

  if (metadata.apiName) {
    attributes[ApiTsAttributes.API_TS_OPERATION_ID] = metadata.apiName;
  }

  if (metadata.httpRoute) {
    if (metadata.httpRoute.method) {
      attributes[ApiTsAttributes.API_TS_METHOD] = metadata.httpRoute.method;
    }
    if (metadata.httpRoute.path) {
      attributes[ApiTsAttributes.API_TS_PATH] = metadata.httpRoute.path;
    }
  }

  return attributes;
}

/**
 * Create default attributes for encode spans
 *
 * @param metadata The metadata for a span
 * @returns Record of span attributes
 */
export function createDefaultEncodeAttributes(metadata: SpanMetadata): Attributes {
  const attributes: Attributes = {};

  if (metadata.apiName) {
    attributes[ApiTsAttributes.API_TS_OPERATION_ID] = metadata.apiName;
  }

  if (metadata.httpRoute) {
    if (metadata.httpRoute.method) {
      attributes[ApiTsAttributes.API_TS_METHOD] = metadata.httpRoute.method;
    }
    if (metadata.httpRoute.path) {
      attributes[ApiTsAttributes.API_TS_PATH] = metadata.httpRoute.path;
    }
  }

  return attributes;
}

/**
 * Creates a span for the decode operation if OpenTelemetry is available
 * @param metadata The metadata for a span
 * @returns A span object or undefined if tracing is disabled
 */
export function createDecodeSpan(metadata: SpanMetadata): Span | undefined {
  if (!tracer || !otelApi) {
    return undefined;
  }

  const span = tracer.startSpan(`typed-express-router.decode`);
  const decodeAttributes = createDefaultDecodeAttributes(metadata);
  span.setAttributes(decodeAttributes);

  return span;
}

/**
 * Creates a span for the sendEncoded operation if OpenTelemetry is available
 * @param metadata The metadata for a span
 * @returns A span object or undefined if tracing is disabled
 */
export function createSendEncodedSpan(metadata: SpanMetadata): Span | undefined {
  if (!tracer || !otelApi) {
    return undefined;
  }

  const span = tracer.startSpan(`typed-express-router.encode`);

  const encodeAttributes = createDefaultEncodeAttributes(metadata);
  // Add attributes to provide context for the span
  span.setAttributes(encodeAttributes);

  return span;
}

/**
 * Records an error on an encode span
 * @param span The span to record the error on
 * @param error The error to record
 */
export function recordSpanEncodeError(
  span: Span | undefined,
  error: unknown,
  statusCode: number,
): void {
  if (!span || !otelApi) {
    return;
  }
  setSpanAttributes(span, {
    [ApiTsAttributes.API_TS_STATUS_CODE]: statusCode,
  });
  span.recordException(error instanceof Error ? error : new Error(String(error)));
  span.setStatus({ code: otelApi.SpanStatusCode.ERROR });
}

/**
 * Records errors on a decode span
 * @param span The span to record the errors on
 * @param error The JSON error value to record
 * @param statusCode The HTTP status code
 */
export function recordSpanDecodeError(
  span: Span | undefined,
  error: Json,
  statusCode: number,
): void {
  if (!span || !otelApi) {
    return;
  }
  setSpanAttributes(span, {
    [ApiTsAttributes.API_TS_STATUS_CODE]: statusCode,
  });
  span.recordException(JSON.stringify(error, null, 2));
  span.setStatus({ code: otelApi.SpanStatusCode.ERROR });
}

/**
 * Sets a span's attributes if it exists
 * @param span The span to modify
 * @param attributes The attributes to modify the span with
 */
export function setSpanAttributes(
  span: Span | undefined,
  attributes: Attributes,
): void {
  if (!span) {
    return;
  }
  span.setAttributes(attributes);
}

/**
 * Ends a span if it exists
 * @param span The span to end
 */
export function endSpan(span: Span | undefined): void {
  if (!span) {
    return;
  }
  span.end();
}
