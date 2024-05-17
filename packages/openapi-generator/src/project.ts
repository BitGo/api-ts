import * as fs from 'fs';
import * as p from 'path';
import { promisify } from 'util';
import * as E from 'fp-ts/Either';
import resolve from 'resolve';

import { KNOWN_IMPORTS, type KnownCodec } from './knownImports';
import { parseSource, type SourceFile } from './sourceFile';

const readFile = promisify(fs.readFile);

export class Project {
  private readonly knownImports: Record<string, Record<string, KnownCodec>>;

  private files: Record<string, SourceFile>;
  private types: Record<string, string>;

  constructor(files: Record<string, SourceFile> = {}, knownImports = KNOWN_IMPORTS) {
    this.files = files;
    this.knownImports = knownImports;
    this.types = {};
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

      if (sourceFile === undefined) continue;

      // map types to their file path
      for (const exp of sourceFile.symbols.exports) {
        this.types[exp.exportedName] = path;
      }

      this.add(path, sourceFile);

      for (const sym of Object.values(sourceFile.symbols.imports)) {
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

  private resolvePath(path: string, basedir: string): E.Either<string, string> {
    try {
      const result = resolve.sync(path, {
        basedir,
        extensions: ['.ts', '.js', '.d.ts'],
      });

      return E.right(result);
    } catch (e: unknown) {
      if (e instanceof Error && e.message) {
        return E.left(e.message);
      }

      return E.left(JSON.stringify(e));
    }
  }

  private findSourceFileFromPackage(path: string): E.Either<string, string> {
    const mapName = path.replace('.js', '.js.map');

    if (fs.existsSync(mapName)) {
      const mapJson = JSON.parse(fs.readFileSync(mapName, 'utf8'));
      const dirName = p.dirname(path);
      const source = mapJson.sources[0];
      const response = resolve.sync(source, { basedir: dirName });
      return E.right(response);
    }

    return E.left('Map file not found for ' + path);
  }

  resolve(basedir: string, path: string): E.Either<string, string> {
    const BITGO_PREFIX = '@bitgo';
    try {
      let resolved = this.resolvePath(path, basedir);
      if (E.isLeft(resolved)) {
        // Could not resolve the path, try resolving in the types package
        resolved = this.resolvePath('@types/' + path, basedir);
      }

      // Types package wasn't found, return an error
      if (E.isLeft(resolved)) {
        return E.left('Could not resolve ' + path + ' from ' + basedir);
      }

      const result = resolved.right;

      // If we are parsing an internal type package, we want to return the path to the source TS file
      if (path.startsWith(BITGO_PREFIX)) {
        return this.findSourceFileFromPackage(result);
      } else {
        // Else - find the declaration file and return it if it exists
        const dTsName = result.replace('.js', '.d.ts');

        if (fs.existsSync(dTsName)) {
          return E.right(dTsName);
        }

        return E.right(result);
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.message) {
        return E.left(e.message);
      }

      return E.left(JSON.stringify(e));
    }
  }

  resolveKnownImport(path: string, name: string): KnownCodec | undefined {
    const baseKey = path.startsWith('.') ? '.' : path;
    return this.knownImports[baseKey]?.[name];
  }

  getTypes() {
    return this.types;
  }
}
