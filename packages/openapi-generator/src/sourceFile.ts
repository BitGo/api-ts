import * as swc from '@swc/core';

import { parseTopLevelSymbols, type SymbolTable } from './symbol';

export type SourceFile = {
  path: string;
  src: string;
  symbols: SymbolTable;
  span: swc.Span;
};

// `module.span.start` is the offset of the first non-comment statement in a source file, so in order to get a better
// offset for the first symbol, we need to keep track of end of the previously parsed file. `swc` appears to use a global
// increasing counter for this, so we also need to track it globally here
let lastSpanEnd = -1;

export async function parseSource(
  path: string,
  src: string,
): Promise<SourceFile | undefined> {
  try {
    const module = await swc.parse(src, {
      syntax: 'typescript',
      target: 'esnext',
    });
    if (lastSpanEnd === -1) {
      // Since the starting offset is seemingly arbitrary, simulate it by subtracting the length of the source file
      // from the end of the first module. This probably doesn't matter since the first source file parsed will be
      // the apiSpec file.
      lastSpanEnd = module.span.end - src.length;
    }
    const symbols = parseTopLevelSymbols(src, lastSpanEnd, module.body);
    lastSpanEnd = module.span.end;
    return {
      path,
      src,
      symbols,
      span: module.span,
    };
  } catch (e: unknown) {
    console.error('Error parsing source file: ', path, e);
    return undefined;
  }
}
