import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import * as t from 'io-ts';
import { nonEmptyArray } from 'io-ts-types';

import { arrayFromNonEmptyCommaDelimitedString } from './array-from-non-empty-delimited-string';

export type { NonEmptyArray } from 'fp-ts/NonEmptyArray';

const emptyArrayFromUndefined = <C>() =>
  new t.Type(
    'EmptyArrayFromUndefined',
    (input): input is C[] => Array.isArray(input) && input.length === 0,
    (input, context) =>
      t.undefined.is(input) ? t.success([]) : t.failure(input, context),
    (_input) => undefined,
  );

/**
 * @param codec a codec that parses from or encodes to a string
 * @returns a codec that handles query param parsing, enforcing the presence of at least one value
 */
export const nonEmptyArrayFromQueryParam = <C extends t.Type<any, string>>(codec: C) =>
  t.union([
    arrayFromNonEmptyCommaDelimitedString(codec),
    nonEmptyArray(codec),
  ]) as t.Type<NonEmptyArray<t.TypeOf<C>>, string>;

/**
 * @deprecated remove in BG-35828
 * @param codec a codec that decodes from and encodes to a string
 * @returns a codec that handles query param parsing, representing zero/undefined params as an empty array
 */
export const arrayFromQueryParam = <C extends t.Type<any, string>>(codec: C) =>
  t.union([
    arrayFromNonEmptyCommaDelimitedString(codec),
    emptyArrayFromUndefined<t.TypeOf<C>>(),
    t.array(codec),
  ]) as t.Type<t.TypeOf<C>[], string | undefined>;
