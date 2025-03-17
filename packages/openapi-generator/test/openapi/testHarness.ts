import * as E from 'fp-ts/lib/Either';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  convertRoutesToOpenAPI,
  parsePlainInitializer,
  parseSource,
  parseRoute,
  Project,
  type Route,
  type Schema,
} from '../../src';
import { SourceFile } from '../../src/sourceFile';

export async function testCase(
  description: string,
  src: string,
  expected: any,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    const sourceFile = await parseSource('./index.ts', src);
    if (sourceFile === undefined) {
      throw new Error('Failed to parse source file');
    }
    const files: Record<string, SourceFile> = { './index.ts': sourceFile };
    const project = new Project(files);
    const routes: Route[] = [];
    const schemas: Record<string, Schema> = {};
    const errors: string[] = [];
    for (const symbol of sourceFile.symbols.declarations) {
      if (symbol.init !== undefined) {
        const routeSchemaE = parsePlainInitializer(project, sourceFile, symbol.init);
        if (E.isLeft(routeSchemaE)) {
          errors.push(routeSchemaE.left);
          continue;
        }
        if (symbol.comment !== undefined) {
          routeSchemaE.right.comment = symbol.comment;
        }
        const result = parseRoute(project, routeSchemaE.right);
        if (E.isLeft(result)) {
          schemas[symbol.name] = routeSchemaE.right;
        } else {
          routes.push(result.right);
        }
      }
    }

    const actual = convertRoutesToOpenAPI(
      { title: 'Test', version: '1.0.0' },
      [],
      routes,
      schemas,
    );

    assert.deepEqual(errors, expectedErrors);
    assert.deepEqual(actual, expected);
  });
}
