import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';

import { TestProject } from './testProject';
import { parsePlainInitializer, type Schema } from '../src';
import { KNOWN_IMPORTS, type KnownImports } from '../src/knownImports';

const ARROW_WITH_PARAMS_MAIN = `
import * as t from 'io-ts';
import { NonEmptyString } from './types';
import { arrayFromArrayOrSingle } from './codecs';

export const UpdateShardKeyRequestBody = {
  shardKey: t.string,
  collectionType: t.union([
    t.literal('user'),
    t.literal('enterprise'),
    t.literal('enterpriseTemplate')
  ]),
  ids: arrayFromArrayOrSingle(NonEmptyString),
  enterpriseUpdateUsers: t.boolean,
} as const;
`;

const ARROW_WITH_PARAMS_TYPES = `
import * as t from 'io-ts';

export const NonEmptyString = t.string;
`;

const ARROW_WITH_PARAMS_CODECS = `
import * as t from 'io-ts';

export const arrayFromArrayOrSingle = <C extends t.Mixed>(codec: C) =>
  t.array(codec);
`;

test('arrow function with parameters uses custom codec definition', async () => {
  const files = {
    '/src/main.ts': ARROW_WITH_PARAMS_MAIN,
    '/src/types.ts': ARROW_WITH_PARAMS_TYPES,
    '/src/codecs.ts': ARROW_WITH_PARAMS_CODECS,
  };

  // Custom codec for arrayFromArrayOrSingle, merged with default io-ts codecs
  const knownImports: KnownImports = {
    ...KNOWN_IMPORTS,
    '.': {
      ...KNOWN_IMPORTS['.'],
      arrayFromArrayOrSingle: (_deref, innerSchema): E.Either<string, Schema> =>
        E.right({ type: 'array', items: innerSchema }),
    },
  };

  const project = new TestProject(files, knownImports);
  await project.parseEntryPoint('/src/main.ts');
  const sourceFile = project.get('/src/main.ts');

  assert.ok(sourceFile !== undefined, 'Source file not found');

  const declaration = sourceFile.symbols.declarations.find(
    (s) => s.name === 'UpdateShardKeyRequestBody',
  );
  assert.ok(declaration?.init !== undefined, 'Declaration not found');

  const result = parsePlainInitializer(project, sourceFile, declaration.init);

  assert.ok(
    E.isRight(result),
    `Expected success, got: "${E.isLeft(result) ? result.left : ''}"`,
  );
  assert.equal(result.right.type, 'object');
  if (result.right.type === 'object') {
    assert.equal(
      result.right.properties?.ids?.type,
      'array',
      'ids field should be array (from custom codec)',
    );
  }
});

test('arrow function with parameters without custom codec returns ref', async () => {
  const files = {
    '/src/main.ts': `
import * as t from 'io-ts';
import { NonEmptyString } from './types';
import { arrayFromArrayOrSingle } from './codecs';

export const TestBody = {
  ids: arrayFromArrayOrSingle(NonEmptyString),
} as const;
`,
    '/src/types.ts': ARROW_WITH_PARAMS_TYPES,
    '/src/codecs.ts': ARROW_WITH_PARAMS_CODECS,
  };

  // No custom codec for arrayFromArrayOrSingle
  const project = new TestProject(files, KNOWN_IMPORTS);
  await project.parseEntryPoint('/src/main.ts');
  const sourceFile = project.get('/src/main.ts');

  assert.ok(sourceFile !== undefined, 'Source file not found');

  const declaration = sourceFile.symbols.declarations.find(
    (s) => s.name === 'TestBody',
  );
  assert.ok(declaration?.init !== undefined, 'Declaration not found');

  const result = parsePlainInitializer(project, sourceFile, declaration.init);

  // Without custom codec, should return a ref (not an error)
  assert.ok(
    E.isRight(result),
    `Expected success, got: "${E.isLeft(result) ? result.left : ''}"`,
  );
  assert.equal(result.right.type, 'object');
  if (result.right.type === 'object') {
    assert.equal(
      result.right.properties?.ids?.type,
      'ref',
      'ids field should be ref (no custom codec)',
    );
  }
});
