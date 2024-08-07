import * as E from 'fp-ts/Either';

/**
 * A wrapper around `E.left` that includes a stacktrace.
 * @param message the error message
 * @returns an `E.left` with the error message and a stacktrace
 */
export function errorLeft(message: string): E.Either<string, never> {
  const stacktrace = new Error().stack!.split('\n').slice(2).join('\n');
  const messageWithStacktrace = message + '\n' + stacktrace;

  return E.left(messageWithStacktrace);
}
