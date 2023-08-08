import * as swc from '@swc/core';
import type { Block } from 'comment-parser';

import { leadingComment } from './comments';

export type Import = {
  type: 'named';
  importedName: string;
  localName: string;
  from: string;
};

export type ImportStar = {
  type: 'star';
  localName: string;
  from: string;
};

export type ImportStatement = Import | ImportStar;

export type Export = {
  type: 'named';
  exportedName: string;
  localName: string;
};

export type Declaration = {
  name: string;
  init: swc.Expression;
  comment?: Block;
};

export type SymbolTable = {
  imports: ImportStatement[];
  exports: Export[];
  exportStarFiles: string[];
  declarations: Declaration[];
};

function parseImportDeclaration(decl: swc.ImportDeclaration): ImportStatement[] {
  const result: ImportStatement[] = [];
  decl.specifiers.forEach((specifier) => {
    const from = decl.source.value;
    switch (specifier.type) {
      case 'ImportSpecifier':
        result.push({
          type: 'named',
          importedName: specifier.imported?.value ?? specifier.local.value,
          localName: specifier.local.value,
          from,
        });
        break;
      case 'ImportDefaultSpecifier':
        result.push({
          type: 'named',
          importedName: 'default',
          localName: specifier.local.value,
          from,
        });
        break;
      case 'ImportNamespaceSpecifier':
        result.push({
          type: 'star',
          localName: specifier.local.value,
          from,
        });
        break;
    }
  });
  return result;
}

function parseExportNamedDeclaration(decl: swc.ExportNamedDeclaration): SymbolTable {
  const result: SymbolTable = {
    imports: [],
    exports: [],
    exportStarFiles: [],
    declarations: [],
  };

  decl.specifiers.forEach((specifier) => {
    switch (specifier.type) {
      case 'ExportSpecifier':
        result.exports.push({
          type: 'named',
          exportedName: specifier.exported?.value ?? specifier.orig.value,
          localName: specifier.orig.value,
        });
        if (decl.source) {
          result.imports.push({
            type: 'named',
            importedName: specifier.orig.value,
            localName: specifier.orig.value,
            from: decl.source.value,
          });
        }
        break;
      case 'ExportDefaultSpecifier':
        result.exports.push({
          type: 'named',
          exportedName: 'default',
          localName: specifier.exported.value,
        });
        break;
    }
  });

  return result;
}

function parseDeclaration(
  src: string,
  srcSpanStart: number,
  prev: swc.ModuleItem | undefined,
  decl: swc.Declaration | swc.ExportDeclaration,
): SymbolTable {
  const result: SymbolTable = {
    imports: [],
    exports: [],
    exportStarFiles: [],
    declarations: [],
  };

  const subDeclaration: swc.Declaration =
    decl.type === 'ExportDeclaration' ? decl.declaration : decl;

  if (subDeclaration.type === 'VariableDeclaration') {
    const comment =
      prev !== undefined
        ? leadingComment(src, srcSpanStart, prev.span.end, decl.span.start)[0]
        : undefined;
    subDeclaration.declarations.forEach((d) => {
      if (
        d.type === 'VariableDeclarator' &&
        d.id.type === 'Identifier' &&
        d.init !== undefined
      ) {
        const name = d.id.value;
        result.declarations.push({
          name,
          init: d.init,
          comment,
        });
        if (decl.type === 'ExportDeclaration') {
          result.exports.push({
            type: 'named',
            exportedName: name,
            localName: name,
          });
        }
      }
    });
  }
  return result;
}

export function parseTopLevelSymbols(
  src: string,
  srcSpanStart: number,
  topLevel: swc.ModuleItem[],
): SymbolTable {
  let symbols: SymbolTable = {
    imports: [],
    exports: [],
    exportStarFiles: [],
    declarations: [],
  };

  function addTable(input: SymbolTable) {
    symbols.imports.push(...input.imports);
    symbols.exports.push(...input.exports);
    symbols.exportStarFiles.push(...input.exportStarFiles);
    symbols.declarations.push(...input.declarations);
  }

  topLevel.forEach((item, idx, items) => {
    if (item.type === 'ImportDeclaration') {
      const newSyms = parseImportDeclaration(item);
      symbols.imports.push(...newSyms);
    } else if (
      item.type === 'VariableDeclaration' ||
      item.type === 'ExportDeclaration'
    ) {
      const newSyms = parseDeclaration(src, srcSpanStart, items[idx - 1], item);
      addTable(newSyms);
    } else if (item.type === 'ExportNamedDeclaration') {
      const newSyms = parseExportNamedDeclaration(item);
      addTable(newSyms);
    } else if (item.type === 'ExportAllDeclaration') {
      symbols.exportStarFiles.push(item.source.value);
    } else if (item.type === 'ExportDefaultExpression') {
      if (item.expression.type === 'Identifier') {
        symbols.exports.push({
          type: 'named',
          exportedName: 'default',
          localName: item.expression.value,
        });
      }
    }
  });

  return symbols;
}
