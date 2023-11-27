import type { Block } from 'comment-parser';
import * as E from 'fp-ts/Either';

import { parseCodecInitializer } from './codec';
import type { CombinedType, Schema } from './ir';
import type { Project } from './project';
import { findSymbolInitializer } from './resolveInit';

export type Parameter = {
  type: 'path' | 'query';
  name: string;
  schema: Schema;
  explode?: boolean;
  required: boolean;
};

export type Route = {
  path: string;
  method: string;
  parameters: Parameter[];
  body?: Schema;
  response: Record<number, Schema>;
  comment?: Block;
};

type Request = {
  parameters: Parameter[];
  body?: Schema;
};

function derefRequestSchema(
  project: Project,
  schema: Schema,
): E.Either<string, Schema> {
  if (schema.type === 'ref') {
    const sourceFile = project.get(schema.location);
    if (sourceFile === undefined) {
      return E.left(`Could not find '${schema.name}' from '${schema.location}'`);
    }
    const initE = findSymbolInitializer(project, sourceFile, schema.name);
    if (E.isLeft(initE)) {
      return initE;
    }
    const [newSourceFile, init] = initE.right;
    return parseCodecInitializer(project, newSourceFile, init);
  } else {
    return E.right(schema);
  }
}

function parseRequestObject(schema: Schema): E.Either<string, Request> {
  if (schema.type !== 'object') {
    return E.left('request must be an object');
  }
  const parameters: Parameter[] = [];
  const querySchema = schema.properties['query'];
  if (querySchema !== undefined) {
    if (querySchema.type !== 'object') {
      return E.left('Route query must be an object');
    } else {
      for (const [name, prop] of Object.entries(querySchema.properties)) {
        parameters.push({
          type: 'query',
          name,
          schema: prop,
          required: querySchema.required.includes(name),
        });
      }
    }
  }
  const pathSchema = schema.properties['params'];
  if (pathSchema !== undefined) {
    if (pathSchema.type !== 'object') {
      return E.left('Route path must be an object');
    }
    for (const [name, prop] of Object.entries(pathSchema.properties)) {
      parameters.push({
        type: 'path',
        name,
        schema: prop,
        required: pathSchema.required.includes(name),
      });
    }
  }

  return E.right({
    parameters,
    body: schema.properties['body'],
  });
}

function parseRequestUnion(
  project: Project,
  schema: Schema,
): E.Either<string, Request> {
  if (schema.type !== 'union') {
    return E.left('request must be a union');
  }

  // For query params and body, construct a union of the related sub-schemas
  // For path params, just take them from the first sub-schema
  // This isn't perfect but it's about as good as we can do in openapi
  const parameters: Parameter[] = [];
  const querySchema: Schema = { type: 'union', schemas: [] };
  let body: Schema | undefined;

  for (let subSchema of schema.schemas) {
    if (subSchema.type === 'ref') {
      let derefE = derefRequestSchema(project, subSchema);
      if (E.isLeft(derefE)) {
        return derefE;
      }
      subSchema = derefE.right;
    }

    if (subSchema.type !== 'object') {
      return E.left('Route request union must be all objects');
    }
    if (subSchema.properties['query'] !== undefined) {
      querySchema.schemas.push(subSchema.properties['query']);
    }
    if (subSchema.properties['body'] !== undefined) {
      if (body === undefined) {
        body = { type: 'union', schemas: [] };
      }
      (body as CombinedType).schemas.push(subSchema.properties['body']);
    }
  }
  if (querySchema.schemas.length > 0) {
    parameters.push({
      type: 'query',
      name: 'union',
      explode: true,
      required: true,
      schema: querySchema,
    });
  }

  const firstSubSchema = schema.schemas[0];
  if (firstSubSchema !== undefined && firstSubSchema.type === 'object') {
    const pathSchema = firstSubSchema.properties['params'];
    if (pathSchema !== undefined && pathSchema.type === 'object') {
      for (const [name, prop] of Object.entries(pathSchema.properties)) {
        parameters.push({
          type: 'path',
          name,
          schema: prop,
          required: pathSchema.required.includes(name),
        });
      }
    }
  }

  return E.right({ parameters, body });
}

function parseRequestIntersection(
  project: Project,
  schema: Schema,
): E.Either<string, Request> {
  if (schema.type !== 'intersection') {
    return E.left('request must be an intersection');
  }
  const result: Request = {
    parameters: [],
    body: { type: 'intersection', schemas: [] },
  };
  for (const subSchema of schema.schemas) {
    const subResultE = parseRequestSchema(project, subSchema);
    if (E.isLeft(subResultE)) {
      return subResultE;
    }
    result.parameters.push(...subResultE.right.parameters);
    if (subResultE.right.body !== undefined) {
      (result.body as CombinedType).schemas.push(subResultE.right.body);
    }
  }
  if ((result.body as CombinedType).schemas.length === 0) {
    delete result.body;
  }
  return E.right(result);
}

function parseRequestSchema(
  project: Project,
  schema: Schema,
): E.Either<string, Request> {
  if (schema.type === 'ref') {
    const derefE = derefRequestSchema(project, schema);
    if (E.isLeft(derefE)) {
      return derefE;
    }
    return parseRequestSchema(project, derefE.right);
  } else if (schema.type === 'object') {
    return parseRequestObject(schema);
  } else if (schema.type === 'union') {
    return parseRequestUnion(project, schema);
  } else if (schema.type === 'intersection') {
    return parseRequestIntersection(project, schema);
  } else {
    return E.left(`Unsupported request type ${schema.type}`);
  }
}

export function parseRoute(project: Project, schema: Schema): E.Either<string, Route> {
  if (schema.type !== 'object') {
    return E.left('Route must be an object');
  }

  if (schema.properties['path'] === undefined) {
    return E.left('Route must have a path');
  } else if (
    schema.properties['path'].type !== 'string' ||
    schema.properties['path'].enum?.length !== 1
  ) {
    return E.left('Route path must be a string literal');
  }

  if (schema.properties['method'] === undefined) {
    return E.left('Route must have a method');
  } else if (
    schema.properties['method'].type !== 'string' ||
    schema.properties['method'].enum?.length !== 1
  ) {
    return E.left('Route method must be a string literal');
  }

  const requestSchema = schema.properties['request'];
  if (requestSchema === undefined) {
    return E.left('Route must have a request');
  }
  const requestPropertiesE = parseRequestSchema(project, requestSchema);
  if (E.isLeft(requestPropertiesE)) {
    return requestPropertiesE;
  }
  const { parameters, body } = requestPropertiesE.right;

  if (schema.properties['response'] === undefined) {
    return E.left('Route must have responses');
  } else if (schema.properties['response'].type !== 'object') {
    return E.left('Route responses must be an object');
  }

  return E.right({
    path: schema.properties['path'].enum![0] as string,
    method: schema.properties['method'].enum![0] as string,
    parameters,
    response: schema.properties['response'].properties,
    ...(body !== undefined ? { body } : {}),
    ...(schema.comment !== undefined ? { comment: schema.comment } : {}),
  });
}
