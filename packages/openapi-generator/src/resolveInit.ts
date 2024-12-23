import * as swc from '@swc/core';
import type { Block } from 'comment-parser';
import * as E from 'fp-ts/Either';
import { dirname } from 'node:path';

import type { Project } from './project';
import type { SourceFile } from './sourceFile';
import { errorLeft } from './error';

type ResolvedInitializer = [SourceFile, swc.Expression, Block | undefined];

function resolveImportPath(
  project: Project,
  sourceFile: SourceFile,
  path: string,
): E.Either<string, SourceFile> {
  let importPathE;
  if (path.startsWith('.')) {
    importPathE = project.resolve(dirname(sourceFile.path), path);
  } else {
    importPathE = project.resolveEntryPoint(dirname(sourceFile.path), path);
  }

  if (E.isLeft(importPathE)) {
    return importPathE;
  }
  const importSourceFile = project.get(importPathE.right);
  if (importSourceFile === undefined) {
    return errorLeft(importPathE.right);
  }
  return E.right(importSourceFile);
}

function findExportedDeclaration(
  project: Project,
  sourceFile: SourceFile,
  name: string,
): E.Either<string, ResolvedInitializer> {
  for (const exp of sourceFile.symbols.exports) {
    if (exp.exportedName === name) {
      return findSymbolInitializer(project, sourceFile, exp.localName);
    }
  }
  for (const starExport of sourceFile.symbols.exportStarFiles) {
    const starSourceFile = resolveImportPath(project, sourceFile, starExport);
    if (E.isLeft(starSourceFile)) {
      return errorLeft(`Cannot resolve * export from '${starExport}'`);
    }
    const starExportE = findExportedDeclaration(project, starSourceFile.right, name);
    if (E.isRight(starExportE)) {
      return starExportE;
    }
  }
  return errorLeft(`Unknown identifier ${name}`);
}

export function findSymbolInitializer(
  project: Project,
  sourceFile: SourceFile,
  name: string | [string, string],
): E.Either<string, [SourceFile, swc.Expression, Block | undefined]> {
  if (Array.isArray(name)) {
    const [importName] = name;
    for (const imp of sourceFile.symbols.imports) {
      if (imp.type === 'star' && imp.localName === importName) {
        const impSourceFile = resolveImportPath(project, sourceFile, imp.from);
        if (E.isLeft(impSourceFile)) {
          return impSourceFile;
        }
        return findExportedDeclaration(project, impSourceFile.right, name[1]);
      }
    }
    name = name[0];
  }
  for (const declaration of sourceFile.symbols.declarations) {
    if (declaration.name === name) {
      return E.right([sourceFile, declaration.init, declaration.comment]);
    }
  }
  for (const imp of sourceFile.symbols.imports) {
    if (imp.type === 'star') {
      continue;
    }
    if (imp.localName === name) {
      const impSourceFile = resolveImportPath(project, sourceFile, imp.from);
      if (E.isLeft(impSourceFile)) {
        return errorLeft(`Cannot resolve import '${imp.localName}' from '${imp.from}'`);
      }
      return findExportedDeclaration(project, impSourceFile.right, imp.importedName);
    }
  }
  return errorLeft(`Unknown identifier ${name}`);
}

export function resolveLiteralOrIdentifier(
  project: Project,
  sourceFile: SourceFile,
  expr: swc.Expression,
  comment?: Block,
): E.Either<string, [SourceFile, swc.Expression, Block | undefined]> {
  if (expr.type === 'Identifier' || expr.type === 'MemberExpression') {
    let name: string | [string, string];
    if (expr.type === 'Identifier') {
      name = expr.value;
    } else {
      if (expr.object.type !== 'Identifier') {
        return errorLeft(`Unimplemented object type ${expr.object.type}`);
      } else if (expr.property.type !== 'Identifier') {
        return errorLeft(`Unimplemented property type ${expr.property.type}`);
      }
      name = [expr.object.value, expr.property.value];
    }
    const initE = findSymbolInitializer(project, sourceFile, name);
    if (E.isLeft(initE)) {
      return initE;
    }
    const [newSourceFile, init, comment] = initE.right;
    return resolveLiteralOrIdentifier(project, newSourceFile, init, comment);
  } else {
    return E.right([sourceFile, expr, comment]);
  }
}
