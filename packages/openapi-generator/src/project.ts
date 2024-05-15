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
  private type_packages: Array<string>;

  constructor(files: Record<string, SourceFile> = {}, knownImports = KNOWN_IMPORTS) {
    this.files = files;
    this.knownImports = knownImports;
    this.types = {};
    this.type_packages = [
      '@bitgo-private/address-book-types',
      '@bitgo-private/entity-validation-types',
      '@bitgo-private/original-indexer-types',
      '@bitgo-private/policy-service-types',
      '@bitgo-private/query-param-types',
      '@bitgo-private/request-types',
      '@bitgo-private/schema-decoding',
      '@bitgo-private/travel-rule-types',
      '@bitgo-private/wallet-platform-types',
      '@bitgo/public-types',
      '@bitgo-private/compliance-tx-monitoring-types',
      '@bitgo-private/event-service-types',
      '@bitgo-private/ims-type',
    ];
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

  getSourceFile(): Record<string, SourceFile> {
    return this.files;
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

  // add @types to beginning of path if path is a type package
  maybeModifyPath(path: string) {
    const typePackages = ['express', 'superagent', 'cookiejar'];
    if (typePackages.includes(path)) return '@types/' + path;
    return path;
  }

  resolve(basedir: string, path: string): E.Either<string, string> {
    try {
      path = this.maybeModifyPath(path);

      // express doesn't parse for some reason
      if (path.includes('express')) return E.right('express');

      const result = resolve.sync(path, {
        basedir,
        extensions: ['.ts', '.js', '.d.ts'],
      });

      if (this.type_packages.includes(path)) {
        const mapName = result.replace('.js', '.js.map');

        if (fs.existsSync(mapName)) {
          const mapJson = JSON.parse(fs.readFileSync(mapName, 'utf8'));
          const dirName = p.dirname(result);
          const source = mapJson.sources[0];
          const response = resolve.sync(source, { basedir: dirName });
          return E.right(response);
        }

        return E.left('Map file not found for ' + path);
      } else {
        const dTsName = result.replace('.js', '.d.ts');

        if (fs.existsSync(dTsName)) {
          return E.right(dTsName);
        }

        return E.right(result);
      }
    } catch (e: any) {
      if (typeof e === 'object' && e.hasOwnProperty('message')) {
        return E.left(e.message);
      } else {
        return E.left(JSON.stringify(e));
      }
    }
  }

  resolveKnownImport(path: string, name: string): KnownCodec | undefined {
    const baseKey = path.startsWith('.') ? '.' : path;
    return this.knownImports[baseKey]?.[name];
  }

  getKnownImports() {
    return this.knownImports;
  }

  getTypes() {
    return this.types;
  }
}
