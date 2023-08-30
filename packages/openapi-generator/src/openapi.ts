import { OpenAPIV3_1 } from 'openapi-types';

import { parseCommentBlock } from './jsdoc';
import type { Components } from './ref';
import type { Route } from './route';
import type { Schema } from './ir';

function schemaToOpenAPI(
  schema: Schema,
): OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject | undefined {
  switch (schema.type) {
    case 'primitive':
      return { type: schema.value };
    case 'literal':
      return { type: schema.kind, enum: [schema.value] };
    case 'ref':
      return { $ref: `#/components/schemas/${schema.name}` };
    case 'array':
      const innerSchema = schemaToOpenAPI(schema.items);
      if (innerSchema === undefined) {
        return undefined;
      }
      return { type: 'array', items: innerSchema };
    case 'object':
      return {
        type: 'object',
        properties: Object.entries(schema.properties).reduce(
          (acc, [name, prop]) => {
            const innerSchema = schemaToOpenAPI(prop);
            if (innerSchema === undefined) {
              return acc;
            }

            return { ...acc, [name]: innerSchema };
          },
          {} as Record<string, OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject>,
        ),
        required: schema.required,
      };
    case 'intersection':
      return {
        allOf: schema.schemas.flatMap((s) => {
          const innerSchema = schemaToOpenAPI(s);
          if (innerSchema === undefined) {
            return [];
          }
          return [innerSchema];
        }),
      };
    case 'union':
      return {
        oneOf: schema.schemas.flatMap((s) => {
          const innerSchema = schemaToOpenAPI(s);
          if (innerSchema === undefined) {
            return [];
          }
          return [innerSchema];
        }),
      };
    case 'record':
      const additionalProperties = schemaToOpenAPI(schema.codomain);
      if (additionalProperties === undefined) {
        return undefined;
      }
      return {
        type: 'object',
        additionalProperties,
      };
    case 'undefined':
      return undefined;
    case 'any':
      return {};
    default:
      return {};
  }
}

function routeToOpenAPI(route: Route): [string, string, OpenAPIV3_1.OperationObject] {
  const jsdoc = route.comment !== undefined ? parseCommentBlock(route.comment) : {};
  const operationId = jsdoc.tags?.operationId;
  const tag = jsdoc.tags?.tag ?? '';
  const isInternal = jsdoc.tags?.private !== undefined;

  return [
    route.path,
    route.method.toLowerCase(),
    {
      ...(jsdoc.summary !== undefined ? { summary: jsdoc.summary } : {}),
      ...(jsdoc.description !== undefined ? { description: jsdoc.description } : {}),
      ...(operationId !== undefined ? { operationId } : {}),
      ...(tag !== '' ? { tags: [tag] } : {}),
      ...(isInternal ? { 'x-internal': true } : {}),
      parameters: route.parameters.map((p) => {
        // Array types not allowed here
        const schema = schemaToOpenAPI(p.schema);

        return {
          name: p.name,
          ...(p.schema?.comment?.description !== undefined
            ? { description: p.schema.comment.description }
            : {}),
          in: p.type,
          required: p.required,
          ...(p.explode ? { style: 'form', explode: true } : {}),
          schema: schema as any, // TODO: Something to disallow arrays
        };
      }),
      ...(route.body !== undefined
        ? { requestBody: schemaToOpenAPI(route.body) as any }
        : {}),
      responses: Object.entries(route.response).reduce((acc, [code, response]) => {
        const description = response.comment?.description ?? '';

        return {
          ...acc,
          [Number(code)]: {
            description,
            content: {
              'application/json': { schema: schemaToOpenAPI(response) },
            },
          },
        };
      }, {}),
    },
  ];
}

export function convertRoutesToOpenAPI(
  info: OpenAPIV3_1.InfoObject,
  routes: Route[],
  schemas: Components,
): OpenAPIV3_1.Document {
  const paths = routes.reduce(
    (acc, route) => {
      const [path, method, pathItem] = routeToOpenAPI(route);
      let pathObject = acc[path] ?? {};
      pathObject[method] = pathItem;
      return { ...acc, [path]: pathObject };
    },
    {} as Record<string, Record<string, OpenAPIV3_1.PathItemObject>>,
  );

  const openapiSchemas = Object.entries(schemas).reduce(
    (acc, [name, schema]) => {
      const openapiSchema = schemaToOpenAPI(schema);
      if (openapiSchema === undefined) {
        return acc;
      } else {
        return { ...acc, [name]: openapiSchema };
      }
    },
    {} as Record<string, OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject>,
  );

  return {
    openapi: '3.1.0',
    info,
    paths,
    components: {
      schemas: openapiSchemas,
    },
  };
}
