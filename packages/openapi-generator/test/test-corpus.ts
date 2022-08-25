import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as fs from 'fs';
import * as path from 'path';

import test from 'ava';
import { NonEmptyString } from 'io-ts-types';

import { TestCase, TestCasesFromString } from './test-case';

// System under test
import { componentsForProject } from '../src/project';

const TEST_CORPUS_DIR = path.resolve(__dirname, '..', '..', 'corpus');
const ROOT_DIR = path.resolve(__dirname, '..', '..', 'dummyProject');
const TEST_CONFIG = path.join(ROOT_DIR, 'tsconfig.json');

const ENTRYPOINT = 'index.ts' as NonEmptyString;

const evaluateTestCase = test.macro({
  async exec(t, testCase: TestCase) {
    // Wait for the event loop to tick once
    await new Promise((resolve) => setImmediate(resolve));

    const fileContentsByFilename = testCase.inputs.reduce<
      Record<NonEmptyString, NonEmptyString>
    >(
      (acc, { filename, contents }) =>
        Object.assign(acc, { [path.join(ROOT_DIR, filename)]: contents }),
      {},
    );

    pipe(
      componentsForProject({
        virtualFiles: fileContentsByFilename,
        index: ENTRYPOINT,
        tsConfig: TEST_CONFIG,
        name: 'test',
        includeInternal: true,
      }),
      E.matchW(
        (err) => t.fail(err),
        (output) => {
          t.deepEqual(output as unknown, testCase.expectedOutput);
        },
      ),
    );
  },
  title(_providedTitle = '', testCase) {
    return testCase.title;
  },
});

const evaluateTestCases = (filename: string) => {
  const fileContents = fs.readFileSync(filename, { encoding: 'utf-8' });
  const decodedTestCases = TestCasesFromString.decode(fileContents);
  if (E.isLeft(decodedTestCases)) {
    throw new Error(
      `Unable to parse test cases from file '${filename}':\n` + decodedTestCases.left,
    );
  }
  const testCases = decodedTestCases.right;

  for (const testCase of testCases) {
    test(evaluateTestCase, testCase);
  }
};

export const testCorpusFile = (name: string) => {
  const filename = path.join(TEST_CORPUS_DIR, `${name}.ts`);
  evaluateTestCases(filename);
};
