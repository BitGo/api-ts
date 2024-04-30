import { OpenAPIV3 } from 'openapi-types';

import { STATUS_CODES } from 'http';
import { parseCommentBlock } from './jsdoc';
import { optimize } from './optimize';
import type { Route } from './route';
import type { Schema } from './ir';

function schemaToOpenAPI(
  schema: Schema,
): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined {
  schema = optimize(schema);

  const createOpenAPIObject = (
    schema: Schema,
  ): OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject | undefined => {
    switch (schema.type) {
      case 'boolean':
      case 'string':
      case 'number':
        return { type: schema.type, ...(schema.enum ? { enum: schema.enum } : {}) };
      case 'integer':
        return { type: 'number', ...(schema.enum ? { enum: schema.enum } : {}) };
      case 'null':
        // TODO: OpenAPI v3 does not have an explicit null type, is there a better way to represent this?
        // Or should we just conflate explicit null and undefined properties?
        return { nullable: true, enum: [] };
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
            {} as Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>,
          ),
          ...(schema.required.length > 0 ? { required: schema.required } : {}),
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
        let nullable = false;
        let oneOf: (OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject)[] = [];
        for (const s of schema.schemas) {
          if (s.type === 'null') {
            nullable = true;
            continue;
          }
          const innerSchema = schemaToOpenAPI(s);
          if (innerSchema !== undefined) {
            oneOf.push(innerSchema);
          }
        }
        if (oneOf.length === 0) {
          return undefined;
        } else if (oneOf.length === 1) {
          return { ...(nullable ? { nullable } : {}), ...oneOf[0] };
        } else {
          return { ...(nullable ? { nullable } : {}), oneOf };
        }
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
  };

  const titleObject = schema.comment?.tags.find((t) => t.tag === 'title');

  let openAPIObject = createOpenAPIObject(schema);

  if (titleObject !== undefined) {
    openAPIObject = {
      ...openAPIObject,
      title: `${titleObject.name} ${titleObject.description}`.trim(),
    };
  }

  return openAPIObject;
}

function routeToOpenAPI(route: Route): [string, string, OpenAPIV3.OperationObject] {
  const jsdoc = route.comment !== undefined ? parseCommentBlock(route.comment) : {};
  const operationId = jsdoc.tags?.operationId;
  const tag = jsdoc.tags?.tag ?? '';
  const isInternal = jsdoc.tags?.private !== undefined;
  const isUnstable = jsdoc.tags?.unstable !== undefined;
  const example = jsdoc.tags?.example;

  const requestBody =
    route.body === undefined
      ? {}
      : {
          requestBody: {
            content: {
              'application/json': { schema: schemaToOpenAPI(route.body) },
            },
          },
        };

  return [
    route.path,
    route.method.toLowerCase(),
    {
      ...(jsdoc.summary !== undefined ? { summary: jsdoc.summary } : {}),
      ...(jsdoc.description !== undefined ? { description: jsdoc.description } : {}),
      ...(operationId !== undefined ? { operationId } : {}),
      ...(tag !== '' ? { tags: [tag] } : {}),
      ...(isInternal ? { 'x-internal': true } : {}),
      ...(isUnstable ? { 'x-unstable': true } : {}),
      parameters: route.parameters.map((p) => {
        // Array types not allowed here
        const schema = schemaToOpenAPI(p.schema);

        return {
          name: p.name,
          ...(p.schema?.comment?.description !== undefined
            ? { description: p.schema.comment.description }
            : {}),
          in: p.type,
          ...(p.required ? { required: true } : {}),
          ...(p.explode ? { style: 'form', explode: true } : {}),
          schema: schema as any, // TODO: Something to disallow arrays
        };
      }),
      ...requestBody,
      responses: Object.entries(route.response).reduce((acc, [code, response]) => {
        const description = response.comment?.description ?? STATUS_CODES[code] ?? '';

        return {
          ...acc,
          [Number(code)]: {
            description,
            content: {
              'application/json': {
                schema: schemaToOpenAPI(response),
                ...(example !== undefined ? { example } : undefined),
              },
            },
          },
        };
      }, {}),
    },
  ];
}

export function convertRoutesToOpenAPI(
  info: OpenAPIV3.InfoObject,
  servers: OpenAPIV3.ServerObject[],
  routes: Route[],
  schemas: Record<string, Schema>,
): OpenAPIV3.Document {
  const paths = routes.reduce(
    (acc, route) => {
      const [path, method, pathItem] = routeToOpenAPI(route);
      let pathObject = acc[path] ?? {};
      pathObject[method] = pathItem;
      return { ...acc, [path]: pathObject };
    },
    {} as Record<string, Record<string, OpenAPIV3.PathItemObject>>,
  );

  const openapiSchemas = Object.entries(schemas).reduce(
    (acc, [name, schema]) => {
      const openapiSchema = schemaToOpenAPI(schema);
      if (openapiSchema === undefined) {
        return acc;
      } else if ('$ref' in openapiSchema) {
        return {
          ...acc,
          [name]: {
            allOf: [{ title: name }, openapiSchema],
          },
        };
      } else {
        return {
          ...acc,
          [name]: {
            title: name,
            ...openapiSchema,
          },
        };
      }
    },
    {} as Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>,
  );

  return {
    openapi: '3.0.3',
    info,
    ...(servers.length > 0 ? { servers } : {}),
    paths,
    components: {
      schemas: openapiSchemas,
    },
  };
}
