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
) {
  test(description, async () => {
    const project = new Project({}, KNOWN_IMPORTS);
    const entryPointPath = p.resolve(entryPoint);
    const result = await project.parseEntryPoint(entryPointPath);

    if (E.isLeft(result)) {
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
  'test/projects/export-declaration/index.ts',
  {
    'test/projects/export-declaration/index.ts': {
      FOO: FOO_Object(1),
      RANDOM: RANDOM_Object(1),
    },
    'test/projects/export-declaration/node_modules/@bitgo/foobar1/src/index.ts': {
      Foobar: FoobarObject,
    },
    'test/projects/export-declaration/node_modules/@bitgo/random-types1/src/index.ts': {
      RandomType: RandomTypeObject,
    },
  },
);

testCase(
  'type from correctly formatted external library with export star declaration',
  'test/projects/export-star/index.ts',
  {
    'test/projects/export-star/index.ts': {
      FOO: FOO_Object(2),
      RANDOM: RANDOM_Object(2),
    },
    'test/projects/export-star/node_modules/@bitgo/foobar2/src/foobar.ts': {
      Foobar: FoobarObject,
    },
    'test/projects/export-star/node_modules/@bitgo/random-types2/src/randomType.ts': {
      RandomType: RandomTypeObject,
    },
  },
);

testCase(
  'type from correctly formatted external library with export star declaration and import star declaration',
  'test/projects/import-star/index.ts',
  {
    'test/projects/import-star/index.ts': {
      FOO: FOO_Object(4),
      RANDOM: RANDOM_Object(4),
    },
    'test/projects/import-star/node_modules/@bitgo/foobar4/src/foobar.ts': {
      Foobar: FoobarObject,
    },
    'test/projects/import-star/node_modules/@bitgo/random-types4/src/randomType.ts': {
      RandomType: RandomTypeObject,
    },
  },
);

testCase(
  'type from external library with syntax errors',
  'test/projects/syntax-error/index.ts',
  {
    'test/projects/syntax-error/index.ts': {
      FOO: FOO_Object(5),
    },
    'test/projects/syntax-error/node_modules/@bitgo/foobar5/src/foobar.ts': {},
  },
  {
    'test/projects/syntax-error/node_modules/@bitgo/foobar5/src/foobar.ts': [
      'Unknown identifier ttype',
    ],
  },
);

test('type from external library with import path error', async () => {
  const entryPoint = 'test/projects/import-path-error/index.ts';
  const project = new Project({}, KNOWN_IMPORTS);
  const entryPointPath = p.resolve(entryPoint);
  const result = await project.parseEntryPoint(entryPointPath);

  const errorRegex =
    /Could not resolve .* from .*\/api-ts\/packages\/openapi-generator\/test\/projects\/import-path-error\/node_modules\/@bitgo\/foobar3\/src/;

  assert(E.isLeft(result));
  assert(errorRegex.test(result.left));
});

// testCase(
//   'type from external library with syntax errors',
//   'test/projects/bad-external-library/index.ts',
//   {
//     'test/projects/bad-external-library/index.ts': {
//       FOO: {
//         type: 'object',
//         properties: {
//           foobar: {
//             location: 'foobar',
//             name: 'Foobar',
//             type: 'ref',
//           },
//         },
//         required: ['foobar'],
//       },
//     },
//   },
//   {},
// );
