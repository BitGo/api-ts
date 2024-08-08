import * as fs from 'fs';
import * as p from 'path';
import { promisify } from 'util';
import * as E from 'fp-ts/Either';
import resolve from 'resolve';

import { KNOWN_IMPORTS, type KnownCodec } from './knownImports';
import { parseSource, type SourceFile } from './sourceFile';
import { errorLeft, logError, logInfo } from './error';

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
    const visitedPackages = new Set<string>();
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
        if (!sym.from.startsWith('.')) {
          // If we are not resolving a relative path, we need to resolve the entry point
          const baseDir = p.dirname(sourceFile.path);
          let entryPoint = this.resolveEntryPoint(baseDir, sym.from);

          if (!visitedPackages.has(sym.from)) {
            // This is a step that checks if this import has custom codecs, and loads them into known imports
            await this.populateCustomCodecs(baseDir, sym.from);
          }

          visitedPackages.add(sym.from);

          if (E.isLeft(entryPoint)) {
            continue;
          } else if (!this.has(entryPoint.right)) {
            queue.push(entryPoint.right);
          }
        } else {
          const filePath = p.dirname(path);
          const absImportPathE = this.resolve(filePath, sym.from);
          if (E.isLeft(absImportPathE)) {
            return absImportPathE;
          } else if (!this.has(absImportPathE.right)) {
            queue.push(absImportPathE.right);
          }
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

  resolveEntryPoint(basedir: string, library: string): E.Either<string, string> {
    try {
      const packageJson = resolve.sync(`${library}/package.json`, {
        basedir,
        extensions: ['.json'],
      });
      const packageInfo = JSON.parse(fs.readFileSync(packageJson, 'utf8'));

      let typesEntryPoint = '';

      if (packageInfo['types']) {
        typesEntryPoint = packageInfo['types'];
      }

      if (packageInfo['typings']) {
        typesEntryPoint = packageInfo['typings'];
      }

      if (!typesEntryPoint) {
        return errorLeft(`Could not find types entry point for ${library}`);
      }

      const entryPoint = resolve.sync(`${library}/${typesEntryPoint}`, {
        basedir,
        extensions: ['.ts', '.js'],
      });
      return E.right(entryPoint);
    } catch (err) {
      return errorLeft(`Could not resolve entry point for ${library}: ${err}`);
    }
  }

  resolve(basedir: string, path: string): E.Either<string, string> {
    try {
      const result = resolve.sync(path, {
        basedir,
        extensions: ['.ts', '.js'],
      });
      return E.right(result);
    } catch (e: unknown) {
      if (e instanceof Error && e.message) {
        return errorLeft(e.message);
      }

      return errorLeft(JSON.stringify(e));
    }
  }

  resolveKnownImport(path: string, name: string): KnownCodec | undefined {
    const baseKey = path.startsWith('.') ? '.' : path;
    return this.knownImports[baseKey]?.[name];
  }

  getTypes() {
    return this.types;
  }

  private async populateCustomCodecs(basedir: string, packageName: string) {
    try {
      const packageJson = resolve.sync(`${packageName}/package.json`, {
        basedir,
        extensions: ['.json'],
      });
      const packageInfo = JSON.parse(fs.readFileSync(packageJson, 'utf8'));

      if (packageInfo['customCodecFile']) {
        // The package defines their own custom codecs
        const customCodecPath = resolve.sync(
          `${packageName}/${packageInfo['customCodecFile']}`,
          {
            basedir,
            extensions: ['.ts', '.js'],
          },
        );
        const module = await import(customCodecPath);
        if (module.default === undefined) {
          logError(`Could not find default export in ${customCodecPath}`);
          return;
        }

        const customCodecs = module.default(E);
        this.knownImports[packageName] = {
          ...customCodecs,
          ...this.knownImports[packageName],
        };

        logInfo(`Loaded custom codecs for ${packageName}`);
      }
    } catch (e) {
      return;
    }
  }
}
