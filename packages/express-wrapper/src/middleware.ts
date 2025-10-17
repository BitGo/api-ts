import * as express from 'express';

export const MiddlewareBrand = Symbol();
export type MiddlewareBrand = typeof MiddlewareBrand;

export type MiddlewareFn<T extends {}> = (
  req: express.Request,
  res: express.Response,
) => Promise<T>;

export type MiddlewareHandler<T extends {} = {}> = {
  (req: express.Request, res: express.Response, next: express.NextFunction): void;
  [MiddlewareBrand]: T;
};

export type MiddlewareRequestHandler = express.RequestHandler | MiddlewareHandler;

type MiddlewareOutput<T extends MiddlewareRequestHandler> = T extends {
  [MiddlewareBrand]: infer R;
}
  ? R
  : {};

type MiddlewareNextFn = (error?: unknown, middlewareResult?: {}) => void;

/**
 * Creates an express request handler that also adds properties to the incoming decoded request. Any existing properties
 * with conflicting names will be replaced.
 *
 * @param fn - an async function that reads the express req/res and returns the desired additional properties.
 * @returns
 */
export function middlewareFn<T extends {}>(fn: MiddlewareFn<T>): MiddlewareHandler<T> {
  const result: express.RequestHandler = (req, res, next: MiddlewareNextFn) => {
    fn(req, res)
      .then((result) => next(undefined, result))
      .catch((err) => next(err));
  };
  return result as MiddlewareHandler<T>;
}

type MiddlewareResult<Input extends {}, T> = T extends MiddlewareRequestHandler
  ? Omit<Input, keyof MiddlewareOutput<T>> & MiddlewareOutput<T>
  : never;

export type MiddlewareChain =
  | []
  | [MiddlewareRequestHandler]
  | [MiddlewareRequestHandler, MiddlewareRequestHandler]
  | [MiddlewareRequestHandler, MiddlewareRequestHandler, MiddlewareRequestHandler]
  | [
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
    ]
  | [
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
    ]
  | [
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
    ]
  | [
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
      MiddlewareRequestHandler,
    ];

export type MiddlewareChainOutput<
  Input,
  Chain extends MiddlewareChain,
> = Chain extends []
  ? Input
  : Chain extends [infer A]
    ? MiddlewareResult<Input, A>
    : Chain extends [infer A, infer B]
      ? MiddlewareResult<MiddlewareResult<Input, A>, B>
      : Chain extends [infer A, infer B, infer C]
        ? MiddlewareResult<MiddlewareResult<MiddlewareResult<Input, A>, B>, C>
        : Chain extends [infer A, infer B, infer C, infer D]
          ? MiddlewareResult<
              MiddlewareResult<MiddlewareResult<MiddlewareResult<Input, A>, B>, C>,
              D
            >
          : Chain extends [infer A, infer B, infer C, infer D, infer E]
            ? MiddlewareResult<
                MiddlewareResult<
                  MiddlewareResult<MiddlewareResult<MiddlewareResult<Input, A>, B>, C>,
                  D
                >,
                E
              >
            : Chain extends [infer A, infer B, infer C, infer D, infer E, infer F]
              ? MiddlewareResult<
                  MiddlewareResult<
                    MiddlewareResult<
                      MiddlewareResult<
                        MiddlewareResult<MiddlewareResult<Input, A>, B>,
                        C
                      >,
                      D
                    >,
                    E
                  >,
                  F
                >
              : Chain extends [
                    infer A,
                    infer B,
                    infer C,
                    infer D,
                    infer E,
                    infer F,
                    infer G,
                  ]
                ? MiddlewareResult<
                    MiddlewareResult<
                      MiddlewareResult<
                        MiddlewareResult<
                          MiddlewareResult<
                            MiddlewareResult<MiddlewareResult<Input, A>, B>,
                            C
                          >,
                          D
                        >,
                        E
                      >,
                      F
                    >,
                    G
                  >
                : never;

/**
 * Runs a middleware chain, and adds any properties returned by middleware..
 *
 * @param input - the decoded request properties
 * @param chain - the middleware chain
 * @param req - express request object
 * @param res - express response object
 * @returns `input` with possible additional properties as specified by the middleware chain
 */
export async function runMiddlewareChain<
  Input extends {},
  Chain extends MiddlewareChain,
>(
  input: Input,
  chain: Chain,
  req: express.Request,
  res: express.Response,
): Promise<MiddlewareChainOutput<Input, Chain>> {
  let result: {} = input;
  for (const middleware of chain) {
    const middlewareResult: {} = await new Promise((resolve, reject) => {
      const next = (value?: unknown, middlewareResult?: {}) => {
        if (value !== undefined) {
          reject(value);
        } else if (middlewareResult !== undefined) {
          resolve(middlewareResult);
        } else {
          resolve({});
        }
      };

      try {
        middleware(req, res, next);
      } catch (err) {
        reject(err);
      }
    });

    result = { ...result, ...middlewareResult };
  }

  return result as MiddlewareChainOutput<Input, Chain>;
}

/**
 * Runs a middleware chain, but does not modify the decoded request (input) with properties from any middleware.
 * This primarily exists to preserve backwards-compatible behavior for RouteHandlers defined without the `routeHandler` function.
 *
 * @param input - the decoded request properties (just passed through)
 * @param chain - the middleware chain
 * @param req - express request object
 * @param res - express response object
 * @returns `input` unmodified
 */
export async function runMiddlewareChainIgnoringResults<
  Input,
  Chain extends MiddlewareChain,
>(
  input: Input,
  chain: Chain,
  req: express.Request,
  res: express.Response,
): Promise<Input> {
  for (const middleware of chain) {
    await new Promise((resolve, reject) => {
      try {
        middleware(req, res, resolve);
      } catch (err) {
        reject(err);
      }
    });
  }
  return { ...input, ...(req.body || {}) };
}
