import { SamplePostRequest, SampleGetResponse } from '@bitgo/test-types';
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

export const test = h.apiSpec({
  'api.post.test': {
    post: h.httpRoute({
      path: '/test',
      method: 'POST',
      request: h.httpRequest({
        body: SamplePostRequest,
      }),
      response: {
        200: t.string,
      },
    }),
  },
  'api.get.test': {
    get: h.httpRoute({
      path: '/test',
      method: 'GET',
      request: h.httpRequest({}),
      response: {
        200: SampleGetResponse,
      },
    }),
  },
});
