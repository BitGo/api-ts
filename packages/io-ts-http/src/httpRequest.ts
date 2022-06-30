import * as t from 'io-ts';
import { Json } from 'io-ts-types';
import { flattened, optional, optionalized } from './combinators';
import { OutputConstrainedProps } from './utils';

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
  params?: NonNullable<OutputConstrainedProps<string | undefined>>;
  query?: NonNullable<OutputConstrainedProps<string | string[] | undefined>>;
  headers?: NonNullable<OutputConstrainedProps<string | undefined>>;
  body?: NonNullable<t.Props>;
};

export function httpRequest<Props extends HttpRequestCombinatorProps>(props: Props) {
  return flattened('httpRequest', {
    query: {},
    params: {},
    ...(props as Omit<Props, 'query' | 'params'>),
  } as { query: {}; params: {} } & Props);
}
