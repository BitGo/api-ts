const E = require('fp-ts/lib/Either');
const assert = require('node:assert/strict');
const test = require('node:test');
const { TestProject } = require('./testProject');
const { parsePlainInitializer } = require('../src');

test('arrow function with parameters should use custom codec definition', async () => {
  const files = {
    '/api/v2/admin/migrateOrgShardKey.ts': `
import * as t from 'io-ts';
import { NonEmptyString } from './types';
import { arrayFromArrayOrSingle } from '../../../utils';

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
`,
    '/api/v2/admin/types.ts': `
import * as t from 'io-ts';

export const NonEmptyString = t.string;
`,
    '/utils/arrayFromArrayOrSingle.ts': `
import * as t from 'io-ts';
import { arrayFromSingle } from '@bitgo/public-types';

export const arrayFromArrayOrSingle = <C extends t.Mixed>(codec: C) =>
  t.union([t.array(codec), arrayFromSingle(codec)]);
`,
  };

  const knownImports = {
    '.': {
      arrayFromArrayOrSingle: (_: any, innerSchema: any) =>
        E.right({ type: 'array', items: innerSchema }),
    },
  };

  const project = new TestProject(files, knownImports);
  await project.parseEntryPoint('/api/v2/admin/migrateOrgShardKey.ts');
  const sourceFile = project.get('/api/v2/admin/migrateOrgShardKey.ts');

  assert.ok(sourceFile !== undefined, 'Source file should exist');

  const declaration = sourceFile.symbols.declarations.find(
    (s: any) => s.name === 'UpdateShardKeyRequestBody',
  );
  assert.ok(
    declaration !== undefined,
    'UpdateShardKeyRequestBody declaration should exist',
  );
  assert.ok(
    declaration.init !== undefined,
    'UpdateShardKeyRequestBody should have init',
  );

  const result = parsePlainInitializer(project, sourceFile, declaration.init);

  assert.ok(
    E.isRight(result),
    `Expected no errors, but got "${E.isLeft(result) ? result.left : ''}"`,
  );

  assert.ok(
    result.right.type === 'object',
    'Should parse UpdateShardKeyRequestBody as object',
  );

  assert.ok(
    result.right.properties?.ids?.type === 'array',
    'Should parse ids field as array (from custom codec definition)',
  );
});
