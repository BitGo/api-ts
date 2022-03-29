/**
 * io-ts-express
 * A simple, type-safe web server
 */

import express from 'express';
import * as PathReporter from 'io-ts/lib/PathReporter';

import {
  ApiSpec,
  HttpResponseCodes,
  HttpRoute,
  RequestType,
  ResponseType,
} from '@bitgo/io-ts-http';

export type Function<R extends HttpRoute> = (
  input: RequestType<R>,
) => ResponseType<R> | Promise<ResponseType<R>>;
export type RouteStack<R extends HttpRoute> = [
  ...express.RequestHandler[],
  Function<R>,
];

/**
 * Dynamically assign a function name to avoid anonymous functions in stack traces
 * https://stackoverflow.com/a/69465672
 */
const createNamedFunction = <F extends (...args: any) => void>(
  name: string,
  fn: F,
): F => Object.defineProperty(fn, 'name', { value: name });

const isKnownStatusCode = (code: string): code is keyof typeof HttpResponseCodes =>
  HttpResponseCodes.hasOwnProperty(code);

const decodeRequestAndEncodeResponse = <Route extends HttpRoute>(
  apiName: string,
  httpRoute: Route,
  handler: Function<Route>,
): express.RequestHandler => {
  return createNamedFunction(
    'decodeRequestAndEncodeResponse' + httpRoute.method + apiName,
    async (req, res) => {
      const maybeRequest = httpRoute.request.decode(req);
      if (maybeRequest._tag === 'Left') {
        console.log('Request failed to decode');
        const validationErrors = PathReporter.failure(maybeRequest.left);
        const validationErrorMessage = validationErrors.join('\n');
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.write(JSON.stringify({ errors: validationErrorMessage }));
        res.end();
        return;
      }

      let rawResponse: ResponseType<Route> | undefined;
      try {
        rawResponse = await handler(maybeRequest.right);
      } catch (err) {
        console.warn('Error in route handler:', err);
        res.statusCode = 500;
        res.end();
        return;
      }

      // Take the first match -- the implication is that the ordering of declared response
      // codecs is significant!
      for (const [statusCode, responseCodec] of Object.entries(httpRoute.response)) {
        if (rawResponse.type !== statusCode) {
          continue;
        }

        if (!isKnownStatusCode(statusCode)) {
          console.warn(
            `Got unrecognized status code ${statusCode} for ${apiName} ${httpRoute.method}`,
          );
          res.status(500);
          res.end();
          return;
        }

        // We expect that some route implementations may "beat the type
        // system away with a stick" and return some unexpected values
        // that fail to encode, so we catch errors here just in case
        let response: unknown;
        try {
          response = responseCodec.encode(rawResponse.payload);
        } catch (err) {
          console.warn(
            "Unable to encode route's return value, did you return the expected type?",
            err,
          );
          res.statusCode = 500;
          res.end();
          return;
        }
        // DISCUSS: safer ways to handle this cast
        res.writeHead(HttpResponseCodes[statusCode], {
          'Content-Type': 'application/json',
        });
        res.write(JSON.stringify(response));
        res.end();
        return;
      }

      // If we got here then we got an unexpected response
      res.status(500);
      res.end();
    },
  );
};

const isHttpVerb = (verb: string): verb is 'get' | 'put' | 'post' | 'delete' =>
  ({ get: 1, put: 1, post: 1, delete: 1 }.hasOwnProperty(verb));

export function createServer<Spec extends ApiSpec>(
  spec: Spec,
  configureExpressApplication: (app: express.Application) => {
    [ApiName in keyof Spec]: {
      [Method in keyof Spec[ApiName]]: RouteStack<Spec[ApiName][Method]>;
    };
  },
) {
  const app: express.Application = express();
  const routes = configureExpressApplication(app);

  const router = express.Router();
  for (const apiName of Object.keys(spec)) {
    const resource = spec[apiName] as Spec[string];
    for (const method of Object.keys(resource)) {
      if (!isHttpVerb(method)) {
        continue;
      }
      const httpRoute: HttpRoute = resource[method]!;
      const stack = routes[apiName]![method]!;
      // Note: `stack` is guaranteed to be non-empty thanks to our function's type signature
      const handler = decodeRequestAndEncodeResponse(
        apiName,
        httpRoute,
        stack[stack.length - 1] as Function<HttpRoute>,
      );
      const handlers = [...stack.slice(0, stack.length - 1), handler];

      router[method](httpRoute.path, handlers);
    }
  }

  app.use(router);

  return app;
}
