import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import * as t from 'io-ts';
import { nonEmptyArray, NonEmptyString } from 'io-ts-types';

function arrayFromNonEmptyDelimitedString(
  delimiter: string,
  delimiterName: string,
): <C extends t.Type<any, string>>(codec: C, codecName?: string) => t.Type<NonEmptyArray<t.TypeOf<C>>, string> {
  return <C extends t.Type<any, string>>(codec: C, codecName: string = codec.name) => {
    const neaCodec = nonEmptyArray(codec);
    return new t.Type<NonEmptyArray<t.TypeOf<C>>, string>(
      `ArrayFromNonEmpty${delimiterName}DelimitedString(${codecName})`,
      neaCodec.is,
      (input, context) => pipe(
        NonEmptyString.validate(input, context),
        E.map((s) => s.split(delimiter)),
        E.chain((arr) => neaCodec.validate(arr, context)),
      ),
      (a) => a.map(codec.encode).join(delimiter),
    );
  };
}

export const arrayFromNonEmptyCommaDelimitedString = arrayFromNonEmptyDelimitedString(',', 'Comma');
