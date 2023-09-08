#!/usr/bin/env node

import {
  command,
  run,
  option,
  string,
  optional,
  flag,
  boolean,
  positional,
} from 'cmd-ts';
import * as E from 'fp-ts/Either';
import * as fs from 'fs';
import * as p from 'path';

import { parseApiSpec } from './apiSpec';
import { getRefs } from './ref';
import { convertRoutesToOpenAPI } from './openapi';
import type { Route } from './route';
import type { Schema } from './ir';
import { Project } from './project';
import { KNOWN_IMPORTS } from './knownImports';
import { findSymbolInitializer } from './resolveInit';
import { parseCodecInitializer } from './codec';

const app = command({
  name: 'api-ts',
  args: {
    input: positional({
      type: string,
      description: `API route definition file`,
      displayName: 'file',
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
    version: option({
      type: string,
      description: 'API version',
      long: 'version',
      short: 'v',
      defaultValue: () => {
        const pkgFile = p.join(process.cwd(), 'package.json');
        try {
          const pkgJson = fs.readFileSync(pkgFile, 'utf-8');
          return JSON.parse(pkgJson)['version'] ?? '0.0.1';
        } catch (err) {
          return '0.0.1';
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
    codecFile: option({
      type: optional(string),
      description: 'Custom codec definition file',
      long: 'codec-file',
      short: 'c',
      defaultValue: () => undefined,
    }),
  },
  handler: async ({ input, name, version, codecFile }) => {
    const filePath = p.resolve(input);

    let knownImports = KNOWN_IMPORTS;
    if (codecFile !== undefined) {
      const codecFilePath = p.resolve(codecFile);
      const codecModule = await import(codecFilePath);
      if (codecModule.default === undefined) {
        console.error(`Could not find default export in ${codecFilePath}`);
        process.exit(1);
      }
      const customCodecs = codecModule.default(E);
      knownImports = { ...knownImports, ...customCodecs };
    }

    const project = await new Project({}, knownImports).parseEntryPoint(filePath);
    if (E.isLeft(project)) {
      console.error(project.left);
      process.exit(1);
    }

    const entryPoint = project.right.get(filePath);
    if (entryPoint === undefined) {
      console.error(`Could not find entry point ${filePath}`);
      process.exit(1);
    }

    let apiSpec: Route[] | undefined;
    for (const symbol of Object.values(entryPoint.symbols.declarations)) {
      if (symbol.init === undefined) {
        continue;
      } else if (symbol.init.type !== 'CallExpression') {
        continue;
      } else if (symbol.init.arguments.length === 0) {
        continue;
      }

      const result = parseApiSpec(
        project.right,
        entryPoint,
        symbol.init.arguments[0]!.expression,
      );
      if (E.isLeft(result)) {
        console.error(`Error parsing ${symbol.name}: ${result.left}`);
        continue;
      }

      apiSpec = result.right;
      break;
    }
    if (apiSpec === undefined) {
      console.error(`Could not find API spec in ${filePath}`);
      process.exit(1);
    }

    const components: Record<string, Schema> = {};
    const queue: Schema[] = apiSpec.flatMap((route) => {
      return [
        ...route.parameters.map((p) => p.schema),
        ...(route.body !== undefined ? [route.body] : []),
        ...Object.values(route.response),
      ];
    });
    let schema: Schema | undefined;
    while (((schema = queue.pop()), schema !== undefined)) {
      const refs = getRefs(schema);
      for (const ref of refs) {
        if (components[ref.name] !== undefined) {
          continue;
        }
        const sourceFile = project.right.get(ref.location);
        if (sourceFile === undefined) {
          console.error(`Could not find source file '${ref.location}'`);
          process.exit(1);
        }
        const initE = findSymbolInitializer(project.right, sourceFile, ref.name);
        if (E.isLeft(initE)) {
          console.error(
            `Could not find symbol '${ref.name}' in '${ref.location}': ${initE.left}`,
          );
          process.exit(1);
        }
        const [newSourceFile, init] = initE.right;
        const codecE = parseCodecInitializer(project.right, newSourceFile, init);
        if (E.isLeft(codecE)) {
          console.error(
            `Could not parse codec '${ref.name}' in '${ref.location}': ${codecE.left}`,
          );
          process.exit(1);
        }
        components[ref.name] = codecE.right;
        queue.push(codecE.right);
      }
    }

    const openapi = convertRoutesToOpenAPI(
      {
        title: name,
        version: version,
      },
      apiSpec,
      components,
    );

    console.log(JSON.stringify(openapi, null, 2));
  },
});

// parse arguments
run(app, process.argv.slice(2));
