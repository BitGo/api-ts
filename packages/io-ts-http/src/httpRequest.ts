import * as t from 'io-ts';
import { Json } from 'io-ts-types';
import { flattened, optional, optionalized } from './combinators';

/**
 * The body of a `GenericHttpRequest`: decodes only JSON, but accepts any decoded value.
 *
 * A route narrows the body with its own codec, and that codec may decode JSON into
 * values that are not JSON themselves, e.g. `BigIntFromString` decodes to `bigint`.
 * Typing the decoded body as `unknown` lets such a route intersect with
 * `GenericHttpRequest`, while the `Json` output type still requires every route's body
 * codec to encode to JSON. Encoding is a pass-through: the route's codec produces the
 * actual output.
 */
const JsonBody = new t.Type<unknown, Json, unknown>(
  Json.name,
  t.unknown.is,
  Json.validate,
  (body) => body as Json,
);

export const GenericHttpRequest = optionalized({
  // DISCUSS: renaming this to something more specific, e.g. route, or path, or routeParams, or pathParams
  params: t.record(t.string, t.string),
  query: t.record(t.string, t.union([t.string, t.array(t.string)])),
  headers: optional(t.record(t.string, t.string)),
  body: optional(JsonBody),
});

export type HttpRequestCodec<T> = t.Type<
  T,
  t.OutputOf<typeof GenericHttpRequest>,
  unknown
>;

export type HttpRequestCombinatorProps = {
  params?: NonNullable<t.Props>;
  query?: NonNullable<t.Props>;
  headers?: NonNullable<t.Props>;
  body?: NonNullable<t.Props>;
};

/**
 * Attempts to produce a helpful error message when invalid codecs are passed to `httpRequest`
 * It is a workaround until something like https://github.com/microsoft/TypeScript/pull/40468
 * is merged.
 */
type EmitOutputTypeErrors<
  P extends t.Props | undefined,
  O,
  OName extends string,
> = P extends undefined
  ? P
  : {
      [K in keyof P & string]: P[K] extends t.Type<any, O, any>
        ? P[K]
        : `Codec's output type is not assignable to \`${OName}\`. Try using one like \`NumberFromString\``;
    };

type QueryValue = string | string[] | undefined;
type ParamValue = string | undefined;
type HeaderValue = string | undefined;

type EmitPropsErrors<P extends HttpRequestCombinatorProps> = {
  params?: EmitOutputTypeErrors<P['params'], ParamValue, 'string | undefined'>;
  query?: EmitOutputTypeErrors<P['query'], QueryValue, 'string | string[] | undefined'>;
  headers?: EmitOutputTypeErrors<P['headers'], HeaderValue, 'string | undefined'>;
};

export function httpRequest<
  Props extends HttpRequestCombinatorProps & EmitPropsErrors<Props>,
>(props: Props, name?: string) {
  return flattened(name ?? 'httpRequest', {
    query: {},
    params: {},
    ...(props as Omit<Props, 'query' | 'params'>),
  } as { query: {}; params: {} } & Props);
}
