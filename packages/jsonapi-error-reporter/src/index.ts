import { Errors } from 'io-ts';

export * from './middleware';
export * from './express-integration';

/**
 * Structure for JSON API error objects
 * @see https://jsonapi.org/format/#errors
 */
export type JSONAPIError = {
  id?: string;
  status?: string;
  code?: string;
  title?: string;
  detail?: string;
  source?: {
    pointer?: string;
    parameter?: string;
  };
  meta?: Record<string, unknown>;
};

/**
 * Top-level JSON API error response
 */
export type JSONAPIErrorResponse = {
  errors: JSONAPIError[];
};

/**
 * Formats io-ts validation errors according to the JSON API error specification
 */
export const JSONAPIErrorReporter = {
  /**
   * Creates a JSON API error response from io-ts validation errors
   *
   * @param errors - io-ts validation errors
   * @returns A JSON API error response object
   */
  report: (errors: Errors): JSONAPIErrorResponse => {
    return {
      errors: errors.map((error) => {
        // Extract relevant information from the io-ts error
        const path = error.context.map(({ key }) => key).filter(Boolean);

        // Create a JSON API error object
        const jsonApiError: JSONAPIError = {
          status: '422', // Unprocessable Entity
          title: 'Validation Error',
          detail: formatErrorMessage(error),
          source: {
            pointer: pathToJSONPointer(path),
          },
        };

        return jsonApiError;
      }),
    };
  },
};

/**
 * Converts a path array to a JSON Pointer
 *
 * @param path - An array of path segments
 * @returns A JSON Pointer string (/data/attributes/name)
 */
export function pathToJSONPointer(path: string[]): string {
  if (path.length === 0) {
    return '/';
  }

  return '/' + path.join('/');
}

/**
 * Formats an io-ts error into a human-readable message
 *
 * @param error - An io-ts validation error
 * @returns A human-readable error message
 */
function formatErrorMessage(error: Errors[number]): string {
  const context = error.context;
  const lastContext = context[context.length - 1];

  if (error.message) {
    return error.message;
  }

  if (lastContext) {
    const { key, type, actual } = lastContext;
    const expectedType = type.name;

    const actualType = typeof actual;
    const actualValue =
      actualType === 'object' ? JSON.stringify(actual) : String(actual);

    if (key) {
      return `Expected ${key} to be ${expectedType}, but got ${actualType} (${actualValue})`;
    } else {
      return `Expected ${expectedType}, but got ${actualType} (${actualValue})`;
    }
  }

  return 'Invalid value';
}

export default JSONAPIErrorReporter;
