import * as fs from 'fs';
import * as p from 'path';
import { promisify } from 'util';
import * as E from 'fp-ts/Either';
import resolve from 'resolve';

import { parseSource, type SourceFile } from './sourceFile';

const readFile = promisify(fs.readFile);

export class Project {
  private files: Record<string, SourceFile>;

  constructor(files: Record<string, SourceFile> = {}) {
    this.files = files;
  }

  add(path: string, sourceFile: SourceFile): void {
    this.files[path] = sourceFile;
  }

  get(path: string): SourceFile | undefined {
    return this.files[path];
  }

  has(path: string): boolean {
    return this.files.hasOwnProperty(path);
  }

  async parseEntryPoint(entryPoint: string): Promise<E.Either<string, Project>> {
    const queue: string[] = [entryPoint];
    let path: string | undefined;
    while (((path = queue.pop()), path !== undefined)) {
      if (!['.ts', '.js'].includes(p.extname(path))) {
        continue;
      }

      const src = await this.readFile(path);
      const sourceFile = await parseSource(path, src);

      this.add(path, sourceFile);

      for (const sym of Object.values(sourceFile.symbols.imports)) {
        if (!sym.from.startsWith('.')) {
          continue;
        }

        const filePath = p.dirname(path);
        const absImportPathE = this.resolve(filePath, sym.from);
        if (E.isLeft(absImportPathE)) {
          return absImportPathE;
        } else if (!this.has(absImportPathE.right)) {
          queue.push(absImportPathE.right);
        }
      }
      for (const starExport of sourceFile.symbols.exportStarFiles) {
        const filePath = p.dirname(path);
        const absImportPathE = this.resolve(filePath, starExport);
        if (E.isLeft(absImportPathE)) {
          return absImportPathE;
        } else if (!this.has(absImportPathE.right)) {
          queue.push(absImportPathE.right);
        }
      }
    }

    return E.right(this);
  }

  async readFile(filename: string): Promise<string> {
    return await readFile(filename, 'utf8');
  }

  resolve(basedir: string, path: string): E.Either<string, string> {
    try {
      const result = resolve.sync(path, {
        basedir,
        extensions: ['.ts', '.js'],
      });
      return E.right(result);
    } catch (e: any) {
      if (typeof e === 'object' && e.hasOwnProperty('message')) {
        return E.left(e.message);
      } else {
        return E.left(JSON.stringify(e));
      }
    }
  }
}
