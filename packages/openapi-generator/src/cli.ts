#!/usr/bin/env node

import { command, run, option, string, flag, boolean } from 'cmd-ts';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as fs from 'fs';
import * as p from 'path';
import { promisify } from 'util';
import * as yaml from 'yaml';

import { componentsForProject } from './project';

const writeFile = promisify(fs.writeFile.bind(fs));

const app = command({
  name: 'api-ts',
  args: {
    input: option({
      type: string,
      description: `API route definition file (default: './src/index.ts')`,
      long: 'input',
      short: 'i',
      defaultValue: () => p.join(process.cwd(), 'src', 'index.ts'),
    }),
    output: option({
      type: string,
      description: `OpenAPI output file (default: './api.json')`,
      long: 'output',
      short: 'o',
      defaultValue: () => p.join(process.cwd(), 'api.json'),
    }),
    tsConfig: option({
      type: string,
      description: `path to tsconfig.json in project root (default: './tsconfig.json')`,
      long: 'tsconfig',
      short: 't',
      defaultValue: () => p.join(process.cwd(), 'tsconfig.json'),
    }),
    name: option({
      type: string,
      description: 'API name',
      long: 'name',
      short: 'n',
      defaultValue: () => {
        const pkgFile = p.join(process.cwd(), 'package.json');
        try {
          const pkgJson = fs.readFileSync(pkgFile, 'utf-8');
          return JSON.parse(pkgJson)['name'] ?? 'openapi-generator';
        } catch (err) {
          return 'openapi-generator';
        }
      },
    }),
    includeInternal: flag({
      type: boolean,
      description: 'include routes marked private',
      long: 'internal',
      short: 'i',
      defaultValue: () => false,
    }),
  },
  handler: async ({ input, output, tsConfig, name, includeInternal }) => {
    const api = pipe(
      componentsForProject({
        virtualFiles: {},
        index: input,
        tsConfig,
        name,
        includeInternal,
      }),
      E.matchW(
        (err) => {
          console.log(`Error processing project: ${err}`);
          return process.exit(1);
        },
        (api) => api,
      ),
    );
    const formattedApi = output.includes('.yaml')
      ? yaml.stringify(api, null, 2) + '\n'
      : JSON.stringify(api, null, 2) + '\n';
    await writeFile(output, formattedApi);
  },
});

// parse arguments
run(app, process.argv.slice(2));
