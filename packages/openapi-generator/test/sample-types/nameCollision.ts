import * as t from 'io-ts';
import { SharedType } from '@test/pkg-a';
import { SharedTypeCodec } from '@test/pkg-b';

// This file uses SharedType from pkg-a and SharedTypeCodec from pkg-b
export const MyCodec = t.type({
  stateFromA: SharedType,
  otherState: SharedTypeCodec,
});
