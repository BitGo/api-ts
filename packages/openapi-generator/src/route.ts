import type { Block } from 'comment-parser';
import * as E from 'fp-ts/Either';

import { parseCodecInitializer } from './codec';
import type { CombinedType, Schema } from './ir';
import type { Project } from './project';
import { findSymbolInitializer } from './resolveInit';
import { errorLeft } from './error';

export type Parameter = {
  type: 'path' | 'query' | 'header';
  name: string;
  schema: Schema;
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
      return errorLeft(`Could not find '${schema.name}' from '${schema.location}'`);
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
    return errorLeft('request must be an object');
  }
  const parameters: Parameter[] = [];
  const querySchema = schema.properties['query'];
  if (querySchema !== undefined) {
    if (querySchema.type !== 'object') {
      return errorLeft('Route query must be an object');
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
      return errorLeft('Route path must be an object');
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

  const headerSchema = schema.properties['headers'];
  if (headerSchema !== undefined) {
    if (headerSchema.type !== 'object') {
      return errorLeft('Route headers must be an object');
    } else {
      for (const [name, prop] of Object.entries(headerSchema.properties)) {
        parameters.push({
          type: 'header',
          name,
          schema: prop,
          required: headerSchema.required.includes(name),
        });
      }
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
    return errorLeft('request must be a union');
  }

  // For query params and body, construct a union of the related sub-schemas
  // For path params, just take them from the first sub-schema
  // This isn't perfect but it's about as good as we can do in openapi
  const parameters: Parameter[] = [];
  const querySchema: Schema = { type: 'union', schemas: [] };
  const headerSchema: Schema = { type: 'union', schemas: [] };
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
      return errorLeft('Route request union must be all objects');
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
    if (subSchema.properties['headers'] !== undefined) {
      headerSchema.schemas.push(subSchema.properties['headers']);
    }
  }
  if (querySchema.schemas.length > 0) {
    parameters.push({
      type: 'query',
      name: 'union',
      required: true,
      schema: querySchema,
    });
  }
  if (headerSchema.schemas.length > 0) {
    // For headers in unions, deduplicate and merge properties from all schemas
    const headerParams = new Map<string, Parameter>();

    for (const subSchema of schema.schemas) {
      if (
        subSchema.type === 'object' &&
        subSchema.properties['headers']?.type === 'object'
      ) {
        const headers = subSchema.properties['headers'];
        for (const [name, prop] of Object.entries(headers.properties)) {
          // Only add if not already present
          if (!headerParams.has(name)) {
            headerParams.set(name, {
              type: 'header',
              name,
              schema: prop,
              required: headers.required.includes(name),
            });
          }
        }
      }
    }

    parameters.push(...headerParams.values());
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
    return errorLeft('request must be an intersection');
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
    return errorLeft(`Unsupported request type ${schema.type}`);
  }
}

export function resolveStringProperty(
  project: Project,
  schema: Schema | undefined,
  name: string,
): E.Either<string, string> {
  if (schema === undefined) {
    return errorLeft(`Route ${name} is missing`);
  } else if (schema.type === 'ref') {
    const derefE = derefRequestSchema(project, schema);
    if (E.isLeft(derefE)) {
      return derefE;
    }
    return resolveStringProperty(project, derefE.right, name);
  } else if (schema.type === 'string' && schema.enum?.length === 1) {
    return E.right(schema.enum[0]! as string);
  } else {
    return errorLeft(`Route ${name} must be a string literal`);
  }
}

export function parseRoute(project: Project, schema: Schema): E.Either<string, Route> {
  if (schema.type !== 'object') {
    return errorLeft('Route must be an object');
  }

  const pathE = resolveStringProperty(project, schema.properties['path'], 'path');
  if (E.isLeft(pathE)) {
    return pathE;
  }
  const path = pathE.right;

  const methodE = resolveStringProperty(project, schema.properties['method'], 'method');
  if (E.isLeft(methodE)) {
    return methodE;
  }
  const method = methodE.right;

  const requestSchema = schema.properties['request'];
  if (requestSchema === undefined) {
    return errorLeft('Route must have a request');
  }
  const requestPropertiesE = parseRequestSchema(project, requestSchema);
  if (E.isLeft(requestPropertiesE)) {
    return requestPropertiesE;
  }
  const { parameters, body } = requestPropertiesE.right;

  if (schema.properties['response'] === undefined) {
    return errorLeft('Route must have responses');
  } else if (schema.properties['response'].type !== 'object') {
    return errorLeft('Route responses must be an object');
  }

  return E.right({
    path,
    method,
    parameters,
    response: schema.properties['response'].properties,
    ...(body !== undefined ? { body } : {}),
    ...(schema.comment !== undefined ? { comment: schema.comment } : {}),
  });
}
