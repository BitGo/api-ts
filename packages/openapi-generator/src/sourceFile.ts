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
    const lastSpan = swc.parseSync('');
    lastSpanEnd = lastSpan.span.end;

    const module = swc.parseSync(src, {
      syntax: 'typescript',
      target: 'esnext',
      comments: true,
    });

    module.span.start = lastSpan.span.start;

    const symbols = parseTopLevelSymbols(src, lastSpanEnd, module.body);
    return {
      path,
      src,
      symbols,
      span: module.span,
    };
  } catch (e: unknown) {
    console.error(`Error parsing source file: ${path}`, e);
    return undefined;
  }
}
