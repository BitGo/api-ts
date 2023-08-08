import * as swc from '@swc/core';

import { parseTopLevelSymbols, type SymbolTable } from './symbol';

export type SourceFile = {
  path: string;
  src: string;
  symbols: SymbolTable;
  span: swc.Span;
};

export async function parseSource(path: string, src: string): Promise<SourceFile> {
  try {
    const module = await swc.parse(src, {
      syntax: 'typescript',
      target: 'esnext',
    });
    const symbols = parseTopLevelSymbols(src, module.span.start, module.body);
    return {
      path,
      src,
      symbols,
      span: module.span,
    };
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
