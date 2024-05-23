import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';

import { TestProject } from './testProject';
import { parsePlainInitializer, type Schema } from '../src';
import { KNOWN_IMPORTS, type KnownImports } from '../src/knownImports';

async function testCase(
  description: string,
  src: string,
  knownImports: KnownImports,
  expected: Record<string, Schema>,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    const project = new TestProject(
      { '/index.ts': src },
      { ...KNOWN_IMPORTS, ...knownImports },
    );
    await project.parseEntryPoint('/index.ts');
    const sourceFile = project.get('/index.ts');
    if (sourceFile === undefined) {
      throw new Error('Source file not found');
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

    assert.deepEqual(errors, expectedErrors);
    assert.deepEqual(actual, expected);
  });
}

const EXTERNAL_CUSTOM_CODEC: KnownImports = {
  foo: {
    bar: () => E.right({ type: 'string' }),
  },
};

const EXTERNAL_CUSTOM_CODEC_SRC = `
import * as f from 'foo';

export const FOO = f.bar;
`;

testCase(
  'External custom codecs are parsed',
  EXTERNAL_CUSTOM_CODEC_SRC,
  EXTERNAL_CUSTOM_CODEC,
  {
    FOO: { type: 'string' },
  },
);

const INTERNAL_CODEC_OVERRIDE: KnownImports = {
  '.': {
    bar: () => E.right({ type: 'string' }),
  },
};

const INTERNAL_CODEC_OVERRIDE_SRC = `
import * as t from 'io-ts';
import { bar } from './bar';

export const FOO = t.type({ bar: bar });
`;

testCase(
  'Internal codec overrides are parsed',
  INTERNAL_CODEC_OVERRIDE_SRC,
  INTERNAL_CODEC_OVERRIDE,
  {
    FOO: {
      type: 'object',
      properties: {
        bar: { type: 'string' },
      },
      required: ['bar'],
    },
  },
);

const NON_STRICT_MODE_SRC = `
import * as t from 'io-ts';
import { bar } from './bar';
var static: serveStatic.RequestHandlerConstructor<Response>;
export const FOO = t.type({ bar: bar });
`;

test('non-strict files are ignored and logged to stderr', async () => {
  let errorCalled = false;
  const originalConsoleError = console.error;

  console.error = (...args) => {
    errorCalled = true;
    console.error = originalConsoleError;
    const errorRegex = /Error parsing source file: \/index.ts/;
    assert(errorRegex.test(args[0]));
  };

  const project = new TestProject({ '/index.ts': NON_STRICT_MODE_SRC }, {});
  await project.parseEntryPoint('/index.ts');
  const sourceFile = project.get('/index.ts');

  assert.strictEqual(sourceFile, undefined);
  assert.strictEqual(errorCalled, true, new Error('console.error was not called'));
});
