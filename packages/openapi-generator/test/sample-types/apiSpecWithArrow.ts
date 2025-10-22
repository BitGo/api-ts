import * as h from '@api-ts/io-ts-http';
import * as t from 'io-ts';
import { BooleanFromString, fromNullable } from 'io-ts-types';

const BooleanFromNullableWithFallback = () =>
  fromNullable(t.union([BooleanFromString, t.boolean]), false);

export const TEST_ROUTE = h.httpRoute({
  path: '/test',
  method: 'GET',
  request: h.httpRequest({}),
  response: {
    200: t.type({
      hasLargeNumberOfAddresses: BooleanFromNullableWithFallback(),
    }),
  },
});

export const apiSpec = h.apiSpec({
  'api.test': {
    get: TEST_ROUTE,
  },
});
