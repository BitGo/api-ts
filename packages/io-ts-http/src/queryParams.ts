import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import * as t from 'io-ts';
import { nonEmptyArray, NonEmptyString } from 'io-ts-types';

export type { NonEmptyArray } from 'fp-ts/NonEmptyArray';

function arrayFromNonEmptyDelimitedString(
  delimiter: string,
  delimiterName: string,
): <C extends t.Type<any, string>>(
  codec: C,
  codecName?: string,
) => t.Type<NonEmptyArray<t.TypeOf<C>>, string> {
  return <C extends t.Type<any, string>>(codec: C, codecName: string = codec.name) => {
    const neaCodec = nonEmptyArray(codec);
    return new t.Type<NonEmptyArray<t.TypeOf<C>>, string>(
      `ArrayFromNonEmpty${delimiterName}DelimitedString(${codecName})`,
      neaCodec.is,
      (input, context) =>
        pipe(
          NonEmptyString.validate(input, context),
          E.map((s) => s.split(delimiter)),
          E.chain((arr) => neaCodec.validate(arr, context)),
        ),
      (a) => a.map(codec.encode).join(delimiter),
    );
  };
}

/**
 * @deprecated use `nonEmptyArrayFromQueryParam`
 */
export const arrayFromNonEmptyCommaDelimitedString = arrayFromNonEmptyDelimitedString(
  ',',
  'Comma',
);

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
