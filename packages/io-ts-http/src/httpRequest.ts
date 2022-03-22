import * as t from 'io-ts';
import { Json } from 'io-ts-types';
import { flattened, optional, optionalized } from './combinators';
import { DerefProp, FieldPowerSet, OutputConstrainedProps } from './utils';

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
  params?: OutputConstrainedProps<string | undefined>;
  query?: OutputConstrainedProps<string | string[] | undefined>;
} & FieldPowerSet<{
  headers: OutputConstrainedProps<string | undefined>;
  body: t.Props;
}>;

export const httpRequest = <Props extends HttpRequestCombinatorProps>({
  params = {},
  query = {},
  ...rest
}: Props) =>
  flattened('httpRequest', {
    params: params as DerefProp<Props, 'params', {}>,
    query: query as DerefProp<Props, 'query', {}>,
    ...rest,
  });
