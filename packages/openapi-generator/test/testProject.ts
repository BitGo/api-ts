import * as E from 'fp-ts/lib/Either';
import { Volume, type NestedDirectoryJSON } from 'memfs';
import resolve from 'resolve';
import { promisify } from 'util';

import { Project } from '../src';
import type { KnownImports } from '../src/knownImports';

export class TestProject extends Project {
  private volume: ReturnType<(typeof Volume)['fromJSON']>;

  constructor(files: NestedDirectoryJSON, knownImports?: KnownImports) {
    super({}, knownImports);
    this.volume = Volume.fromNestedJSON(files, '/');
  }

  override async readFile(filename: string): Promise<string> {
    const file: any = await promisify(this.volume.readFile.bind(this.volume))(filename);
    return file.toString('utf-8');
  }

  override resolve(basedir: string, path: string): E.Either<string, string> {
    try {
      const result = resolve.sync(path, {
        basedir,
        extensions: ['.ts', '.js'],
        readFileSync: this.volume.readFileSync.bind(this.volume),
        isFile: (file) => {
          try {
            var stat = this.volume.statSync(file);
          } catch (e: any) {
            if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return false;
            throw e;
          }
          return stat.isFile() || stat.isFIFO();
        },
        isDirectory: (dir) => {
          try {
            var stat = this.volume.statSync(dir);
          } catch (e: any) {
            if (e && (e.code === 'ENOENT' || e.code === 'ENOTDIR')) return false;
            throw e;
          }
          return stat.isDirectory();
        },
        realpathSync: (file) => {
          try {
            return this.volume.realpathSync(file) as string;
          } catch (realPathErr: any) {
            if (realPathErr.code !== 'ENOENT') {
              throw realPathErr;
            }
          }
          return file;
        },
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
