import * as E from 'fp-ts/Either';

import { parseCodecInitializer } from './codec';
import type { Project } from './project';
import type { Schema } from './ir';
import { findSymbolInitializer } from './resolveInit';

export type Components = Record<string, Schema>;

export function parseRefs(project: Project, schema: Schema): Record<string, Schema> {
  if (schema.type === 'ref') {
    const sourceFile = project.get(schema.location);
    if (sourceFile === undefined) {
      return {};
    }
    const initE = findSymbolInitializer(project, sourceFile, schema.name);
    if (E.isLeft(initE)) {
      return {};
    }
    const [newSourceFile, init] = initE.right;
    const codecE = parseCodecInitializer(project, newSourceFile, init);
    if (E.isLeft(codecE)) {
      return {};
    }
    const codec = codecE.right;
    return { [schema.name]: codec };
  } else if (schema.type === 'array') {
    return parseRefs(project, schema.items);
  } else if (schema.type === 'intersection' || schema.type === 'union') {
    return schema.schemas.reduce((acc, member) => {
      return { ...acc, ...parseRefs(project, member) };
    }, {});
  } else if (schema.type === 'object') {
    return Object.values(schema.properties).reduce((acc, member) => {
      return { ...acc, ...parseRefs(project, member) };
    }, {});
  } else if (schema.type === 'record') {
    return parseRefs(project, schema.codomain);
  } else {
    return {};
  }
}
