import { SampleUnion } from '@bitgo/test-types';
import * as h from '@api-ts/io-ts-http';

export const enumTest = h.apiSpec({
  'api.get.test': {
    get: h.httpRoute({
      path: '/test',
      method: 'GET',
      request: h.httpRequest({}),
      response: {
        200: SampleUnion,
      },
    }),
  },
});
