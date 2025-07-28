import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';

import { TestProject } from './testProject';
import { parsePlainInitializer, type Schema } from '../src';

async function testCase(
  description: string,
  src: string,
  expected: Record<string, Schema>,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    const project = new TestProject({ '/index.ts': src });
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
          // Only keep the error message, not the stack trace
          const errorMessage = result.left.split('\n')[0] ?? '';
          errors.push(errorMessage);
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

const MINIMAL_NESTED_MEMBER_EXPRESSION = `
import * as t from 'io-ts';

export const colorType = {
  red: 'red',
} as const;

export const ColorType = t.keyof(colorType);

export const redItem = t.type({
  type: t.literal(ColorType.keys.red),
});
`;

testCase(
  'nested member expression is parsed correctly',
  MINIMAL_NESTED_MEMBER_EXPRESSION,
  {
    colorType: {
      type: 'object',
      properties: {
        red: { type: 'string', enum: ['red'] },
      },
      required: ['red'],
    },
    ColorType: {
      type: 'union',
      schemas: [{ type: 'string', enum: ['red'] }],
    },
    redItem: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['red'] },
      },
      required: ['type'],
    },
  },
);
