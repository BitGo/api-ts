import * as t from 'io-ts';
import { Json } from 'io-ts-types';
import { flattened, optional, optionalized } from './combinators';

export const GenericHttpRequest = optionalized({
  // DISCUSS: renaming this to something more specific, e.g. route, or path, or routeParams, or pathParams
  params: t.record(t.string, t.string),
  query: t.record(t.string, t.union([t.string, t.array(t.string)])),
  headers: optional(t.record(t.string, t.string)),
  body: optional(Json),
});

export type HttpRequestCodec<T> = t.Type<
  T,
  t.TypeOf<typeof GenericHttpRequest>,
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
        : `Codec's output type is not assignable to ${OName}. Try using one like \`NumberFromString\``;
    };

type EmitPropsErrors<P extends HttpRequestCombinatorProps> = {
  params?: EmitOutputTypeErrors<P['params'], string | undefined, 'string | undefined'>;
  query?: EmitOutputTypeErrors<
    P['query'],
    string | string[] | undefined,
    'string | string[] | undefined'
  >;
  headers?: EmitOutputTypeErrors<
    P['headers'],
    string | undefined,
    'string | undefined'
  >;
};

export function httpRequest<
  Props extends HttpRequestCombinatorProps & EmitPropsErrors<Props>,
>(props: Props) {
  return flattened('httpRequest', {
    query: {},
    params: {},
    ...(props as Omit<Props, 'query' | 'params'>),
  } as { query: {}; params: {} } & Props);
}
