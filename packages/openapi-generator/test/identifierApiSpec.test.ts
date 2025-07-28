import assert from 'node:assert/strict';
import test from 'node:test';

import * as E from 'fp-ts/lib/Either';
import type { NestedDirectoryJSON } from 'memfs';

import { parseApiSpec, type Route } from '../src';
import { stripStacktraceOfErrors } from '../src/error';
import { MOCK_NODE_MODULES_DIR } from './externalModules';
import { TestProject } from './testProject';

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

    export const test = h.apiSpec(myApiSpecProps);`,
};

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
