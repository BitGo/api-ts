import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { NestedDirectoryJSON } from 'memfs';

import { TestProject } from './testProject';
import { parseApiSpec, type Route } from '../src';
import { MOCK_NODE_MODULES_DIR } from './externalModules';
import { stripStacktraceOfErrors } from '../src/error';

// This test case demonstrates the failure when passing an identifier to apiSpec
async function testCase(
  description: string,
  files: NestedDirectoryJSON,
  entryPoint: string,
  expected: Record<string, Route[]>,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    const project = new TestProject({ ...files, ...MOCK_NODE_MODULES_DIR });

    await project.parseEntryPoint(entryPoint);
    const sourceFile = project.get(entryPoint);
    if (sourceFile === undefined) {
      throw new Error(`could not find source file ${entryPoint}`);
    }

    const actual: Record<string, Route[]> = {};
    const errors: string[] = [];
    for (const symbol of sourceFile.symbols.declarations) {
      if (symbol.init !== undefined) {
        if (symbol.init.type !== 'CallExpression') {
          continue;
        } else if (
          symbol.init.callee.type !== 'MemberExpression' ||
          symbol.init.callee.property.type !== 'Identifier' ||
          symbol.init.callee.property.value !== 'apiSpec'
        ) {
          continue;
        } else if (symbol.init.arguments.length !== 1) {
          continue;
        }
        const arg = symbol.init.arguments[0]!;
        // Note: This test should handle identifiers, but currently fails
        const result = parseApiSpec(project, sourceFile, arg.expression);
        if (E.isLeft(result)) {
          errors.push(result.left);
        } else {
          actual[symbol.name] = result.right;
        }
      }
    }

    assert.deepEqual(stripStacktraceOfErrors(errors), expectedErrors);
    assert.deepEqual(actual, expected);
  });
}

const IDENTIFIER_API_SPEC = {
  '/index.ts': `
    import * as t from 'io-ts';
    import * as h from '@api-ts/io-ts-http';

    const myApiSpecProps = {
      'api.test': {
        get: h.httpRoute({
          path: '/test',
          method: 'GET',
          request: h.httpRequest({}),
          response: {
            200: t.string,
          },
        })
      }
    };

    // This fails due to Identifier type not being handled
    export const test = h.apiSpec(myApiSpecProps);`,
};

// With our fix, this should now pass
testCase(
  'identifier api spec',
  IDENTIFIER_API_SPEC,
  '/index.ts',
  {
    test: [
      {
        path: '/test',
        method: 'GET',
        parameters: [],
        response: { 200: { type: 'string', primitive: true } },
      },
    ],
  },
  [],
);

// Control test with the workaround to verify it works
const WORKAROUND_API_SPEC = {
  '/index.ts': `
    import * as t from 'io-ts';
    import * as h from '@api-ts/io-ts-http';

    const myApiSpecProps = {
      'api.test': {
        get: h.httpRoute({
          path: '/test',
          method: 'GET',
          request: h.httpRequest({}),
          response: {
            200: t.string,
          },
        })
      }
    };

    // This works with the workaround
    export const test = h.apiSpec({
      ...myApiSpecProps
    });`,
};

testCase('workaround api spec', WORKAROUND_API_SPEC, '/index.ts', {
  test: [
    {
      path: '/test',
      method: 'GET',
      parameters: [],
      response: { 200: { type: 'string', primitive: true } },
    },
  ],
});

// Edge case 1: Nested identifier (identifier that references another identifier)
const NESTED_IDENTIFIER_API_SPEC = {
  '/index.ts': `
    import * as t from 'io-ts';
    import * as h from '@api-ts/io-ts-http';

    const routeSpec = h.httpRoute({
      path: '/test',
      method: 'GET',
      request: h.httpRequest({}),
      response: {
        200: t.string,
      },
    });

    const routeObj = {
      get: routeSpec
    };

    const myApiSpecProps = {
      'api.test': routeObj
    };

    // This should now work with our fix
    export const test = h.apiSpec(myApiSpecProps);`,
};

testCase('nested identifier api spec', NESTED_IDENTIFIER_API_SPEC, '/index.ts', {
  test: [
    {
      path: '/test',
      method: 'GET',
      parameters: [],
      response: { 200: { type: 'string', primitive: true } },
    },
  ],
});

// Edge case 2: Imported identifier
const IMPORTED_IDENTIFIER_API_SPEC = {
  '/routes.ts': `
    import * as t from 'io-ts';
    import * as h from '@api-ts/io-ts-http';

    export const apiRoutes = {
      'api.test': {
        get: h.httpRoute({
          path: '/test',
          method: 'GET',
          request: h.httpRequest({}),
          response: {
            200: t.string,
          },
        })
      }
    };
  `,
  '/index.ts': `
    import * as h from '@api-ts/io-ts-http';
    import { apiRoutes } from './routes';

    // This should now work with our fix
    export const test = h.apiSpec(apiRoutes);`,
};

testCase('imported identifier api spec', IMPORTED_IDENTIFIER_API_SPEC, '/index.ts', {
  test: [
    {
      path: '/test',
      method: 'GET',
      parameters: [],
      response: { 200: { type: 'string', primitive: true } },
    },
  ],
});
