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
import type { Expression } from '@swc/core';

import { parseApiSpec } from './apiSpec';
import { getRefs } from './ref';
import { convertRoutesToOpenAPI } from './openapi';
import type { Route } from './route';
import type { Schema } from './ir';
import { getPackageJsonPath } from './packageInfo';
import { Project } from './project';
import { KNOWN_IMPORTS } from './knownImports';
import { findSymbolInitializer } from './resolveInit';
import { parseCodecInitializer } from './codec';
import { SourceFile } from './sourceFile';

const app = command({
  name: 'api-ts',
  args: {
    input: positional({
      type: string,
      description: `API route definition file`,
      displayName: 'file',
    }),
    name: option({
      type: optional(string),
      description: 'API name',
      long: 'name',
      short: 'n',
    }),
    version: option({
      type: optional(string),
      description: 'API version',
      long: 'version',
      short: 'v',
    }),
    description: option({
      type: optional(string),
      description: 'API description',
      long: 'description',
      short: 'd',
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
    }),
  },
  handler: async ({
    input,
    name: nameParam,
    version: versionParam,
    description: descriptionParam,
    codecFile: codecFileParam,
  }) => {
    const filePath = p.resolve(input);

    const packageJsonPath = await getPackageJsonPath(filePath);
    let packageJson: Record<string, any> = {};
    if (packageJsonPath !== undefined) {
      packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    }

    const name = nameParam ?? packageJson['name'] ?? 'openapi-generator';
    const version = versionParam ?? packageJson['version'] ?? '0.0.1';
    const description =
      descriptionParam ?? packageJson['description'] ?? `API spec for ${name}`;

    let codecFile: string | undefined = codecFileParam;
    if (
      codecFileParam === undefined &&
      packageJsonPath !== undefined &&
      packageJson['openapi-generator']?.['codec-file'] !== undefined
    ) {
      const relativeCodecFilePath = packageJson['openapi-generator']['codec-file'];
      codecFile = p.join(p.dirname(packageJsonPath), relativeCodecFilePath);
    }

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

    let apiSpec: Route[] = [];
    for (const symbol of Object.values(entryPoint.symbols.declarations)) {
      if (symbol.init === undefined) {
        continue;
      } else if (symbol.init.type !== 'CallExpression') {
        continue;
      } else if (symbol.init.arguments.length === 0) {
        continue;
      } else if (
        symbol.init.callee.type === 'Super' ||
        symbol.init.callee.type === 'Import'
      ) {
        console.error(
          `Skipping ${symbol.name} because it is a ${symbol.init.callee.type}`,
        );
        continue;
      } else if (!isApiSpec(entryPoint, symbol.init.callee)) {
        continue;
      }
      console.error(`Found API spec in ${symbol.name}`);

      const result = parseApiSpec(
        project.right,
        entryPoint,
        symbol.init.arguments[0]!.expression,
      );
      if (E.isLeft(result)) {
        console.error(`Error parsing ${symbol.name}: ${result.left}`);
        process.exit(1);
      }

      apiSpec.push(...result.right);
    }
    if (apiSpec.length === 0) {
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
          console.error(`Could not find '${ref.name}' from '${ref.location}'`);
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
        version,
        description,
      },
      apiSpec,
      components,
    );

    console.log(JSON.stringify(openapi, null, 2));
  },
});

function isApiSpec(entryPoint: SourceFile, init: Expression): boolean {
  if (init.type === 'Identifier') {
    return (
      entryPoint.symbols.imports.find(
        (imp) =>
          imp.type === 'named' &&
          imp.from === '@api-ts/io-ts-http' &&
          imp.importedName === 'apiSpec' &&
          imp.localName === init.value,
      ) !== undefined
    );
  } else if (init.type === 'MemberExpression') {
    return (
      entryPoint.symbols.imports.find(
        (imp) =>
          imp.type === 'star' &&
          imp.from === '@api-ts/io-ts-http' &&
          init.object.type === 'Identifier' &&
          init.object.value === imp.localName &&
          init.property.type === 'Identifier' &&
          init.property.value === 'apiSpec',
      ) !== undefined
    );
  } else {
    return false;
  }
}

// parse arguments
run(app, process.argv.slice(2));
