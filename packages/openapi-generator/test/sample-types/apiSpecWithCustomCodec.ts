import { SampleCustomCodec, AnotherSampleCodec } from '@bitgo/custom-codecs';
import * as h from '@api-ts/io-ts-http';

export const apiSpec = h.apiSpec({
  'api.get.test': {
    get: h.httpRoute({
      path: '/test',
      method: 'GET',
      request: h.httpRequest({}),
      response: {
        200: SampleCustomCodec,
        201: AnotherSampleCodec,
      },
    }),
  },
});
