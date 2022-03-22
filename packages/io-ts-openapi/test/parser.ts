import { pipe } from 'fp-ts/function';
import { NonEmptyArray } from 'fp-ts/NonEmptyArray';
import { NonEmptyString } from 'io-ts-types';
import { ReadonlyNonEmptyArray } from 'fp-ts/ReadonlyNonEmptyArray';
import * as P from 'parser-ts/Parser';
import * as C from 'parser-ts/char';
import * as S from 'parser-ts/string';

interface TestInput {
  filename: NonEmptyString;
  contents: NonEmptyString;
}

export interface TestCaseAst {
  title: NonEmptyString;
  inputs: NonEmptyArray<TestInput>;
  expectedOutput: NonEmptyString;
}

const asNonEmptyString = (characters: ReadonlyNonEmptyArray<C.Char>): NonEmptyString =>
  characters.join('') as NonEmptyString;

// A blank is any whitespace character except a newline or carriage return
const blankRegex = /^[^\S\r\n]$/;

const isBlank = (c: C.Char) => blankRegex.test(c);

const blank: P.Parser<C.Char, C.Char> = P.expected(P.sat(isBlank), 'a blank');

const until = (terminator: P.Parser<string, string>) =>
  P.many1Till(P.item(), terminator);

const whitespaceSurrounded = P.surroundedBy(S.spaces);

// Optional blanks terminating in a newline
const newline = pipe(
  P.many(blank),
  P.chain(() => C.char('\n')),
);

const backtick = C.char('`');

const bangComment = S.string('//!');

const tripleSlashComment = S.string('///');

/**
 * @example
 * ```
 * //! should specify expected OpenAPI version
 * ```
 */
const testTitle: P.Parser<string, NonEmptyString> = pipe(
  whitespaceSurrounded(bangComment),
  P.chain(() => until(newline)),
  P.map(asNonEmptyString),
);

/**
 * @example
 * ```
 * /// file: index.ts
 * ```
 */
const testInputFilename: P.Parser<string, NonEmptyString> = pipe(
  whitespaceSurrounded(S.string('file:')),
  P.chain(() => until(newline)),
  P.map(asNonEmptyString),
);

const testInputContents: P.Parser<string, NonEmptyString> = pipe(
  whitespaceSurrounded(until(tripleSlashComment)),
  P.map(asNonEmptyString),
);

/**
 * The `testInput` parser assumes the `///` comment that begins the test-case
 * block has already been parsed. This isn't exactly desired but it's the only
 * way I could implement a parser to cover the desired test input format.
 *
 * This means the `expectedOutput` parser does not begin with a `///` as the
 * preceeding `testInput` parser has already consumed it.
 */
const testInput: P.Parser<string, TestInput> = pipe(
  testInputFilename,
  P.bindTo('filename'),
  P.bind('contents', () => testInputContents),
);

const expectedOutput: P.Parser<string, NonEmptyString> = pipe(
  whitespaceSurrounded(backtick),
  P.chain(() =>
    until(
      whitespaceSurrounded(
        pipe(
          backtick,
          P.chain(() => S.maybe(C.char(';'))),
        ),
      ),
    ),
  ),
  P.map(asNonEmptyString),
);

const testCaseParser: P.Parser<string, TestCaseAst> = pipe(
  testTitle,
  P.bindTo('title'),
  P.chainFirst(() => whitespaceSurrounded(tripleSlashComment)),
  P.bind('inputs', () => P.many1(testInput)),
  P.bind('expectedOutput', () => expectedOutput),
);

export const testCasesParser: P.Parser<string, NonEmptyArray<TestCaseAst>> = pipe(
  P.many1(testCaseParser),
  P.chainFirst(() => P.eof()),
);
