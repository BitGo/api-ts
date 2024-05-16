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
    await project.parseEntryPoint(entryPointPath);

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

testCase(
  'type from correctly formatted external library',
  'test/projects/good-external-library/index.ts',
  {
    'test/projects/good-external-library/index.ts': {
      FOO: {
        type: 'object',
        properties: {
          foobar: {
            location: 'foobar',
            name: 'Foobar',
            type: 'ref',
          },
        },
        required: ['foobar'],
      },
    },
    'test/projects/good-external-library/node_modules/foobar/src/index.ts': {
      Foobar: {
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
      },
    },
  },
);

testCase(
  'type from external library with syntax errors',
  'test/projects/bad-external-library/index.ts',
  {
    'test/projects/bad-external-library/index.ts': {
      FOO: {
        type: 'object',
        properties: {
          foobar: {
            location: 'foobar',
            name: 'Foobar',
            type: 'ref',
          },
        },
        required: ['foobar'],
      },
    },
  },
  {},
);
