import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as p from 'path';

import { parsePlainInitializer, Project, type Schema } from '../src';
import { KNOWN_IMPORTS } from '../src/knownImports';

/** External library parsing test case
 *
 * @param description a description of the test case
 * @param entryPoint relative path to the test case's index.tx
 * @param expected a record of expected files (including ones in node_modules), with their expected parsed schemas
 * @param expectedErrors optional record of expected parsing errors for each source file
 */
async function testCase(
  description: string,
  entryPoint: string,
  expected: Record<string, Record<string, Schema>>,
  expectedErrors: Record<string, string[]> = {},
  parseErrorRegex: RegExp | undefined = undefined,
) {
  test(description, async () => {
    const project = new Project({}, KNOWN_IMPORTS);
    const entryPointPath = p.resolve(entryPoint);
    const parsed = await project.parseEntryPoint(entryPointPath);

    if (parseErrorRegex !== undefined) {
      assert(E.isLeft(parsed));
      assert(parseErrorRegex.test(parsed.left));
      return;
    }

    for (const path of Object.keys(expected)) {
      const resolvedPath = p.resolve(path);
      const sourceFile = project.get(resolvedPath);

      if (sourceFile === undefined) {
        throw new Error(`Source file ${path} not found`);
      }

      const actual: Record<string, Schema> = {};
      const errors: string[] = [];
      for (const symbol of sourceFile.symbols.declarations) {
        if (symbol.init !== undefined) {
          const result = parsePlainInitializer(project, sourceFile, symbol.init);
          if (E.isLeft(result)) {
            errors.push(result.left);
          } else {
            if (symbol.comment !== undefined) {
              result.right.comment = symbol.comment;
            }
            actual[symbol.name] = result.right;
          }
        }
      }

      assert.deepEqual(actual, expected[path]);
      assert.deepEqual(errors, expectedErrors[path] ?? []);
    }

    // If we are expecting errors in a file that wasn't parsed, raise that here
    for (const path of Object.keys(expectedErrors)) {
      const resolvedPath = p.resolve(path);
      assert.notEqual(
        project.get(resolvedPath),
        undefined,
        `Expected errors for ${path} but it wasn't parsed`,
      );
    }
  });
}

const FoobarObject: Schema = {
  type: 'object',
  properties: {
    foo: {
      type: 'string',
    },
    bar: {
      type: 'number',
    },
  },
  required: ['foo', 'bar'],
};

const RandomTypeObject: Schema = {
  type: 'object',
  properties: {
    random: {
      type: 'string',
    },
    type: {
      type: 'number',
    },
  },
  required: ['random', 'type'],
};

const FOO_Object = (testNum: number): Schema => ({
  type: 'object',
  properties: {
    foobar: {
      location: '@bitgo/foobar' + testNum,
      name: 'Foobar',
      type: 'ref',
    },
  },
  required: ['foobar'],
});

const RANDOM_Object = (testNum: number): Schema => ({
  type: 'object',
  properties: {
    random: {
      location: '@bitgo/random-types' + testNum,
      name: 'RandomType',
      type: 'ref',
    },
  },
  required: ['random'],
});

testCase(
  'type from correctly formatted external library with export declaration',
  'test/sample-types/exportDeclaration.ts',
  {
    'test/sample-types/exportDeclaration.ts': {
      FOO: FOO_Object(1),
      RANDOM: RANDOM_Object(1),
    },
    'test/sample-types/node_modules/@bitgo/foobar1/src/index.ts': {
      Foobar: FoobarObject,
    },
    'test/sample-types/node_modules/@bitgo/random-types1/src/index.ts': {
      RandomType: RandomTypeObject,
    },
  },
);

testCase(
  'type from correctly formatted external library with export star declaration',
  'test/sample-types/exportStar.ts',
  {
    'test/sample-types/exportStar.ts': {
      FOO: FOO_Object(2),
      RANDOM: RANDOM_Object(2),
    },
    'test/sample-types/node_modules/@bitgo/foobar2/src/foobar.ts': {
      Foobar: FoobarObject,
    },
    'test/sample-types/node_modules/@bitgo/random-types2/src/randomType.ts': {
      RandomType: RandomTypeObject,
    },
  },
);

testCase(
  'type from correctly formatted external library with export star declaration and import star declaration',
  'test/sample-types/importStar.ts',
  {
    'test/sample-types/importStar.ts': {
      FOO: FOO_Object(4),
      RANDOM: RANDOM_Object(4),
    },
    'test/sample-types/node_modules/@bitgo/foobar4/src/foobar.ts': {
      Foobar: FoobarObject,
    },
    'test/sample-types/node_modules/@bitgo/random-types4/src/randomType.ts': {
      RandomType: RandomTypeObject,
    },
  },
);

testCase(
  'type from external library with syntax errors',
  'test/sample-types/syntaxError.ts',
  {
    'test/sample-types/syntaxError.ts': {
      FOO: FOO_Object(5),
    },
    'test/sample-types/node_modules/@bitgo/foobar5/src/foobar.ts': {},
  },
  {
    'test/sample-types/node_modules/@bitgo/foobar5/src/foobar.ts': [
      'Unknown identifier ttype',
    ],
  },
);

testCase(
  'type from external library with import path error',
  'test/sample-types/importPathError.ts',
  {},
  {},
  /Could not resolve io-tsg from .*\/test\/sample-types\/node_modules\/@bitgo\/foobar3\/src/,
);

testCase(
  'type from external library with export path error',
  'test/sample-types/exportPathError.ts',
  {},
  {},
  /Could not resolve .\/foobart from .*\/test\/sample-types\/node_modules\/@bitgo\/foobar6\/src/,
);
