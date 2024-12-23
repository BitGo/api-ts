import * as fs from 'fs/promises';
import * as p from 'node:path';

export async function getPackageJsonPath(
  entryPoint: string,
): Promise<string | undefined> {
  let dir = p.dirname(entryPoint);
  while (dir !== '/') {
    const pkgJsonPath = p.join(dir, 'package.json');
    try {
      const pkgJson = await fs.stat(pkgJsonPath);
      if (pkgJson !== undefined) {
        return pkgJsonPath;
      }
    } catch (e: any) {
      if (e.code === 'ENOENT') {
        const parentDir = p.dirname(dir);
        if (parentDir === dir) {
          // This is the root directory
          break;
        }
        dir = parentDir;
        continue;
      } else {
        throw e;
      }
    }
  }
  return undefined;
}
