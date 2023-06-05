import * as fs from 'fs';
import * as path from 'path';
import test from 'node:test';
import { strict as assert } from 'node:assert';

import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import { NonEmptyString } from 'io-ts-types';

import { TestCase, TestCasesFromString } from './test-case';

// System under test
import { componentsForProject } from '../src/project';

const TEST_CORPUS_DIR = path.resolve(__dirname, '..', 'corpus');
const ROOT_DIR = path.resolve(__dirname, '..', 'dummyProject');
const TEST_CONFIG = path.join(ROOT_DIR, 'tsconfig.json');

const ENTRYPOINT = 'index.ts' as NonEmptyString;

function evaluateTestCase(testCase: TestCase): () => void {
  return () => {
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
        (err) => assert.fail(err),
        (output) => {
          assert.deepEqual(output as unknown, testCase.expectedOutput);
        },
      ),
    );
  };
}

function evaluateTestCases(filename: string): void {
  const fileContents = fs.readFileSync(filename, { encoding: 'utf-8' });
  const decodedTestCases = TestCasesFromString.decode(fileContents);
  if (E.isLeft(decodedTestCases)) {
    throw new Error(
      `Unable to parse test cases from file '${filename}':\n` + decodedTestCases.left,
    );
  }
  const testCases = decodedTestCases.right;

  testCases.map((testCase) => test(testCase.title, evaluateTestCase(testCase)));
}

export function runTest(corpusFilename: string): void {
  const filename = path.join(TEST_CORPUS_DIR, corpusFilename);
  evaluateTestCases(filename);
}
