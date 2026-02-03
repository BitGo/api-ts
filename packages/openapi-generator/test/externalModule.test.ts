import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as p from 'node:path';

import {
  parsePlainInitializer,
  Project,
  type Schema,
  type Route,
  convertRoutesToOpenAPI,
  type ComponentNameMapping,
} from '../src';
import { KNOWN_IMPORTS } from '../src/knownImports';
import { stripStacktraceOfErrors } from '../src/error';

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
      assert.deepEqual(stripStacktraceOfErrors(errors), expectedErrors[path] ?? []);
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
      primitive: true,
    },
    bar: {
      type: 'number',
      primitive: true,
    },
  },
  required: ['foo', 'bar'],
};

const RandomTypeObject: Schema = {
  type: 'object',
  properties: {
    random: {
      type: 'string',
      primitive: true,
    },
    type: {
      type: 'number',
      primitive: true,
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
);

testCase(
  'type from external library with export path error',
  'test/sample-types/exportPathError.ts',
  {},
  {},
);

test('parses types from external packages correctly', async () => {
  const project = new Project({}, KNOWN_IMPORTS);
  const entryPointPath = p.resolve('test/sample-types/nameCollision.ts');
  await project.parseEntryPoint(entryPointPath);

  const types = project.getTypes();

  const pkgAPath = p.resolve('test/sample-types/node_modules/@test/pkg-a/src/index.ts');
  const pkgBPath = p.resolve('test/sample-types/node_modules/@test/pkg-b/src/index.ts');

  // SharedType should map to pkg-a
  assert.equal(types['SharedType'], pkgAPath);

  // SharedTypeCodec should map to pkg-b
  assert.equal(types['SharedTypeCodec'], pkgBPath);

  // Verify both files were parsed correctly
  const pkgAFile = project.get(pkgAPath);
  const pkgBFile = project.get(pkgBPath);

  assert.notEqual(pkgAFile, undefined, 'pkg-a file should be parsed');
  assert.notEqual(pkgBFile, undefined, 'pkg-b file should be parsed');
});

test('generates correct $ref for collided component names in OpenAPI output', async () => {
  // This test verifies that when two different schemas have the same name but different
  // locations, the OpenAPI output correctly references the renamed components.
  // We simulate this by creating mock components with the same name from different "locations"

  const pkgAPath = '/mock/pkg-a/index.ts';
  const pkgBPath = '/mock/pkg-b/index.ts';

  // Create routes that reference "SharedType" from two different locations
  const routes: Route[] = [
    {
      path: '/route-a',
      method: 'GET',
      parameters: [],
      response: {
        200: {
          type: 'ref',
          name: 'SharedType',
          location: pkgAPath,
        },
      },
    },
    {
      path: '/route-b',
      method: 'GET',
      parameters: [],
      response: {
        200: {
          type: 'ref',
          name: 'SharedType',
          location: pkgBPath,
        },
      },
    },
  ];

  // Simulate the component collection with collision handling
  // First SharedType comes from pkgA, second from pkgB gets renamed to SharedType1
  const components: Record<string, Schema> = {
    SharedType: {
      type: 'string',
      enum: ['a', 'b', 'c'],
    },
    SharedType1: {
      type: 'string',
      enum: ['x', 'y', 'z'],
    },
  };

  // Build the component name mapping: location -> originalName -> finalComponentName
  const componentNameMapping: ComponentNameMapping = {
    [pkgAPath]: {
      SharedType: 'SharedType',
    },
    [pkgBPath]: {
      SharedType: 'SharedType1',
    },
  };

  // Convert to OpenAPI with the component name mapping
  const openapi = convertRoutesToOpenAPI(
    { title: 'Test', version: '1.0.0' },
    [],
    routes,
    components,
    componentNameMapping,
  );

  // Verify the $ref values in the OpenAPI output
  const routeAResponse = openapi.paths['/route-a']?.get?.responses?.['200'];
  const routeBResponse = openapi.paths['/route-b']?.get?.responses?.['200'];

  assert.ok(routeAResponse, 'Route A should have a 200 response');
  assert.ok(routeBResponse, 'Route B should have a 200 response');

  // Get the schema from the responses
  const routeASchema = (routeAResponse as any).content?.['application/json']?.schema;
  const routeBSchema = (routeBResponse as any).content?.['application/json']?.schema;

  assert.ok(routeASchema, 'Route A should have a schema');
  assert.ok(routeBSchema, 'Route B should have a schema');

  // Verify $ref values point to the correct component
  assert.equal(
    routeASchema.$ref,
    '#/components/schemas/SharedType',
    'Route A should reference SharedType (from pkg-a)',
  );
  assert.equal(
    routeBSchema.$ref,
    '#/components/schemas/SharedType1',
    'Route B should reference SharedType1 (renamed from pkg-b)',
  );

  // Verify the components are correctly included
  assert.ok(
    openapi.components?.schemas?.['SharedType'],
    'SharedType component should exist',
  );
  assert.ok(
    openapi.components?.schemas?.['SharedType1'],
    'SharedType1 component should exist',
  );
});
