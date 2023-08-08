#!/usr/bin/env node

import { command, run, option, string, flag, boolean, positional } from 'cmd-ts';
import * as E from 'fp-ts/Either';
import * as fs from 'fs';
import * as p from 'path';

import { parseApiSpec } from './apiSpec';
import { Components, parseRefs } from './ref';
import { convertRoutesToOpenAPI } from './openapi';
import type { Route } from './route';
import type { Schema } from './ir';
import { Project } from './project';

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
  },
  handler: async ({ input, name, version }) => {
    const filePath = p.resolve(input);

    const project = await new Project().parseEntryPoint(filePath);
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

    const components: Components = {};
    const queue: Schema[] = apiSpec.flatMap((route) => {
      return [
        ...route.parameters.map((p) => p.schema),
        ...(route.body !== undefined ? [route.body] : []),
        ...Object.values(route.response),
      ];
    });
    let schema: Schema | undefined;
    while (((schema = queue.pop()), schema !== undefined)) {
      const newComponents = parseRefs(project.right, schema);
      for (const [name, schema] of Object.entries(newComponents)) {
        if (components[name] !== undefined) {
          continue;
        }
        components[name] = schema;
        queue.push(schema);
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
