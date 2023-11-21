import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert';
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

    assert.deepStrictEqual(errors, expectedErrors);
    assert.deepStrictEqual(actual, expected);
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
