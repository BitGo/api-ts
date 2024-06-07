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
    const defaultOpenAPIObject = buildDefaultOpenAPIObject(schema);

    switch (schema.type) {
      case 'boolean':
      case 'string':
      case 'number':
        return {
          type: schema.type,
          ...(schema.enum ? { enum: schema.enum } : {}),
          ...defaultOpenAPIObject,
        };
      case 'integer':
        return {
          type: 'number',
          ...(schema.enum ? { enum: schema.enum } : {}),
          ...defaultOpenAPIObject,
        };
      case 'null':
        // TODO: OpenAPI v3 does not have an explicit null type, is there a better way to represent this?
        // Or should we just conflate explicit null and undefined properties?
        return { nullable: true, enum: [] };
      case 'ref':
        // if defaultOpenAPIObject is empty, no need to wrap the $ref in an allOf array
        if (Object.keys(defaultOpenAPIObject).length === 0) {
          return { $ref: `#/components/schemas/${schema.name}` };
        }
        return {
          allOf: [{ $ref: `#/components/schemas/${schema.name}` }],
          ...defaultOpenAPIObject,
        };
      case 'array':
        const innerSchema = schemaToOpenAPI(schema.items);
        if (innerSchema === undefined) {
          return undefined;
        }
        return { type: 'array', items: innerSchema, ...defaultOpenAPIObject };
      case 'object':
        return {
          type: 'object',
          ...defaultOpenAPIObject,
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
          ...defaultOpenAPIObject,
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
          if (
            Object.keys(
              oneOf[0] as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject,
            )[0] === '$ref'
          )
            // OpenAPI spec doesn't allow $ref properties to have siblings, so they're wrapped in an 'allOf' array
            return {
              ...(nullable ? { nullable } : {}),
              allOf: oneOf,
              ...defaultOpenAPIObject,
            };
          else
            return {
              ...(nullable ? { nullable } : {}),
              ...oneOf[0],
              ...defaultOpenAPIObject,
            };
        } else {
          return { ...(nullable ? { nullable } : {}), oneOf, ...defaultOpenAPIObject };
        }
      case 'record':
        const additionalProperties = schemaToOpenAPI(schema.codomain);
        if (additionalProperties === undefined) {
          return undefined;
        }
        return {
          type: 'object',
          additionalProperties,
          ...defaultOpenAPIObject,
        };
      case 'undefined':
        return undefined;
      case 'any':
        return {};
      default:
        return {};
    }
  };

  /**
   *  This function will return the field value parsed as the type of the schema. i.e. if the schema is a number, it will return the field as a JS number.
   *
   * @param schema A schema object
   * @param fieldValue The value to parse
   * @returns the parsed value
   */
  const parseField = (schema: Schema, fieldValue: string): any => {
    if (schema.type === 'number' || schema.type === 'integer') {
      return Number(fieldValue);
    } else if (schema.type === 'boolean') {
      return fieldValue === 'true';
    } else if (schema.type === 'null') {
      return null;
    } else {
      return fieldValue;
    }
  };

  function buildDefaultOpenAPIObject(schema: Schema): OpenAPIV3.SchemaObject {
    const defaultValue = getTagName(schema, 'default');
    const example = getTagName(schema, 'example');
    const maxLength = getTagName(schema, 'maxLength');
    const minLength = getTagName(schema, 'minLength');
    const pattern = getTagName(schema, 'pattern');
    const minimum = getTagName(schema, 'minimum');
    const maximum = getTagName(schema, 'maximum');
    const minItems = getTagName(schema, 'minItems');
    const maxItems = getTagName(schema, 'maxItems');
    const minProperties = getTagName(schema, 'minProperties');
    const maxProperties = getTagName(schema, 'maxProperties');
    const exclusiveMinimum = getTagName(schema, 'exclusiveMinimum');
    const exclusiveMaximum = getTagName(schema, 'exclusiveMaximum');
    const multipleOf = getTagName(schema, 'multipleOf');
    const uniqueItems = getTagName(schema, 'uniqueItems');
    const readOnly = getTagName(schema, 'readOnly');
    const writeOnly = getTagName(schema, 'writeOnly');
    const format = getTagName(schema, 'format');

    const deprecated = schema.comment?.tags.find((t) => t.tag === 'deprecated');
    const description = schema.comment?.description;

    const defaultOpenAPIObject = {
      ...(defaultValue ? { default: parseField(schema, defaultValue) } : {}),
      ...(deprecated ? { deprecated: true } : {}),
      ...(description ? { description } : {}),
      ...(example ? { example: parseField(schema, example) } : {}),
      ...(maxLength ? { maxLength: Number(maxLength) } : {}),
      ...(minLength ? { minLength: Number(minLength) } : {}),
      ...(pattern ? { pattern } : {}),
      ...(minimum ? { minimum: Number(minimum) } : {}),
      ...(maximum ? { maximum: Number(maximum) } : {}),
      ...(minItems ? { minItems: Number(minItems) } : {}),
      ...(maxItems ? { maxItems: Number(maxItems) } : {}),
      ...(minProperties ? { minProperties: Number(minProperties) } : {}),
      ...(maxProperties ? { maxProperties: Number(maxProperties) } : {}),
      ...(exclusiveMinimum ? { exclusiveMinimum: true } : {}),
      ...(exclusiveMaximum ? { exclusiveMaximum: true } : {}),
      ...(multipleOf ? { multipleOf: Number(multipleOf) } : {}),
      ...(uniqueItems ? { uniqueItems: true } : {}),
      ...(readOnly ? { readOnly: true } : {}),
      ...(writeOnly ? { writeOnly: true } : {}),
      ...(format ? { format } : {}),
    };
    return defaultOpenAPIObject;
  }

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

function getTagName(schema: Schema, tagName: String): string | undefined {
  return schema.comment?.tags.find((t) => t.tag === tagName)?.name;
}

function routeToOpenAPI(route: Route): [string, string, OpenAPIV3.OperationObject] {
  const jsdoc = route.comment !== undefined ? parseCommentBlock(route.comment) : {};
  const operationId = jsdoc.tags?.operationId;
  const tag = jsdoc.tags?.tag ?? '';
  const isInternal = jsdoc.tags?.private !== undefined;
  const isUnstable = jsdoc.tags?.unstable !== undefined;
  const example = jsdoc.tags?.example;

  const knownTags = new Set([
    'operationId',
    'summary',
    'private',
    'unstable',
    'example',
    'tag',
    'description',
    'url',
  ]);
  const unknownTagsObject = Object.entries(jsdoc.tags ?? {}).reduce(
    (acc, [key, value]) => {
      if (!knownTags.has(key)) {
        return { ...acc, [key]: value || true };
      }
      return acc;
    },
    {},
  );

  const stripTopLevelComment = (schema: Schema) => {
    const copy = { ...schema };

    if (copy.comment?.description !== undefined && copy.comment?.description !== '') {
      copy.comment.description = '';
    }

    return copy;
  };

  const topLevelStripped = stripTopLevelComment(route.body!);

  const requestBody =
    route.body === undefined
      ? {}
      : {
          requestBody: {
            content: {
              'application/json': { schema: schemaToOpenAPI(topLevelStripped) },
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
      ...(Object.keys(unknownTagsObject).length > 0
        ? { 'x-unknown-tags': unknownTagsObject }
        : {}),
      parameters: route.parameters.map((p) => {
        // Array types not allowed here
        const schema = schemaToOpenAPI(p.schema);

        if (schema && 'description' in schema) {
          delete schema.description;
        }

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
                schema: schemaToOpenAPI(stripTopLevelComment(response)),
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
