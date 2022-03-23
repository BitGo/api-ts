import * as t from 'io-ts';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import * as NEA from 'fp-ts/NonEmptyArray';
import { JsonRecord, NonEmptyString, nonEmptyArray, JsonFromString } from 'io-ts-types';
import { run } from 'parser-ts/code-frame';

import { testCasesParser, TestCaseAst } from './parser';

const TestInput = t.type(
  {
    filename: NonEmptyString,
    contents: NonEmptyString,
  },
  'TestInput',
);

const TestCase = t.type(
  {
    title: NonEmptyString,
    inputs: nonEmptyArray(TestInput),
    expectedOutput: t.string.pipe(JsonFromString).pipe(JsonRecord),
  },
  'TestCase',
);
export type TestCase = t.TypeOf<typeof TestCase>;

const TestCases = nonEmptyArray(TestCase);

export const TestCasesFromString = new t.Type<
  NonEmptyArray<TestCase>,
  NonEmptyArray<TestCaseAst>,
  string
>(
  'TestCaseFromAst',
  TestCases.is.bind(null),
  (string, context) =>
    pipe(
      run(testCasesParser, string),
      E.chainW((testCasesAsts) => TestCases.decode(testCasesAsts)),
      E.match(() => t.failure(string, context), t.success),
    ),
  (testCases) =>
    pipe(
      testCases,
      NEA.map((testCase) => ({
        title: testCase.title,
        inputs: testCase.inputs,
        expectedOutput: JSON.stringify(
          testCase.expectedOutput,
          null,
          2,
        ) as NonEmptyString,
      })),
    ),
);
