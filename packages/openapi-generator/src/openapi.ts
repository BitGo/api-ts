import { OpenAPIV3 } from 'openapi-types';

import { STATUS_CODES } from 'http';
import { parseCommentBlock } from './jsdoc';
import { optimize } from './optimize';
import type { Route } from './route';
import type { Schema } from './ir';
import { Block } from 'comment-parser';
import { isPrimitive, type Primitive, type CombinedType } from './ir';

/**
 * Extract descriptions for enum values from JSDoc comments in the enum declaration
 */
function extractEnumDescriptions(schema: Schema): Record<string, string> {
  const result: Record<string, string> = {};

  // Check if schema already has enumDescriptions, if so return them
  if (isPrimitive(schema) && schema.enumDescriptions) {
    return schema.enumDescriptions;
  }

  // For union types that represent enums (like those created with t.keyof)
  if (schema.type === 'union') {
    const unionSchema = schema as CombinedType;
    if (unionSchema.enumDescriptions) {
      return unionSchema.enumDescriptions;
    }
  }

  // Special handling for union types which might be enum representations
  if (schema.type === 'union') {
    const unionSchema = schema as CombinedType;
    // Check if this is a union of string literals (enum)
    const isStringEnum = unionSchema.schemas.every((s) => {
      if (s.type === 'string' && 'enum' in s) {
        const primitiveSchema = s as Primitive;
        return primitiveSchema.enum !== undefined && primitiveSchema.enum.length === 1;
      }
      return false;
    });

    if (isStringEnum) {
      // Extract enum values from the literals in the union
      for (const schemaItem of unionSchema.schemas) {
        if (schemaItem.type === 'string' && 'enum' in schemaItem) {
          const primitiveSchema = schemaItem as Primitive;
          if (primitiveSchema.enum && primitiveSchema.enum.length === 1) {
            const enumKey = String(primitiveSchema.enum[0]);
            // If this schema has a comment, use it as the description for this enum value
            if (schemaItem.comment?.description) {
              result[enumKey] = schemaItem.comment.description;
            }
          }
        }
      }

      // If we found any descriptions, return them
      if (Object.keys(result).length > 0) {
        return result;
      }
    }
  }

  // Only process primitive types with enum values
  if (!isPrimitive(schema) || !schema.comment) {
    return result;
  }

  // For enums, we need array of values
  const enumValues = schema.enum || [];
  if (enumValues.length === 0) {
    return result;
  }

  // Standard enum description extraction methods
  if (schema.comment.source) {
    // Extract descriptions from inline comments
    for (const enumValue of enumValues) {
      // Skip values that can't be used as object keys
      if (typeof enumValue !== 'string' && typeof enumValue !== 'number') {
        continue;
      }

      // Convert the enum value to a string for comparison
      const enumKey = String(enumValue);

      // Look through all the source lines for a comment matching this enum value
      for (const line of schema.comment.source) {
        const sourceText = line.source || '';
        if (!sourceText) continue;

        // Skip JSDoc tag lines
        if (sourceText.includes('@')) continue;

        // Look for a line that contains "* enumValue"
        if (sourceText.includes(`* ${enumKey}`)) {
          // Extract description after the enum value
          const match = sourceText.match(new RegExp(`\\*\\s+${enumKey}\\s+(.+)`));
          if (match && match[1]) {
            result[enumKey] = match[1].trim();
            break;
          }
        }
      }
    }
  }

  // Check for JSDoc tags that describe enum values
  if (schema.comment.tags) {
    for (const tag of schema.comment.tags) {
      // Look for @enum-value tags or other tags that might contain enum descriptions
      if (tag.tag === '@enum-value') {
        const parts = tag.name?.split(' ');
        if (parts && parts.length > 0) {
          const enumKey = parts[0];
          if (enumKey && tag.description) {
            result[enumKey] = tag.description.trim();
          }
        }
      }
    }
  }

  return result;
}

export function schemaToOpenAPI(
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
        // For enum references, use a simple reference schema
        const refSchema = { $ref: `#/components/schemas/${schema.name}` };

        // For enum types or any empty schema, we always want a simple reference
        // without an allOf wrapper to make references cleaner
        // Type-check more carefully to avoid type errors
        let hasPrimitiveEnum = false;
        if (isPrimitive(schema)) {
          // Now we know it's a primitive type, safe to check enum
          const primitive = schema as Primitive;
          hasPrimitiveEnum = !!primitive.enum && primitive.enum.length > 0;
        }
        if (hasPrimitiveEnum || Object.keys(defaultOpenAPIObject).length === 0) {
          return refSchema;
        }

        return {
          allOf: [refSchema],
          ...defaultOpenAPIObject,
        };
      case 'array':
        const innerSchema = schemaToOpenAPI(schema.items);
        if (innerSchema === undefined) {
          return undefined;
        }

        const { example, minItems, maxItems, ...rest } = defaultOpenAPIObject;
        const isArrayExample = example && Array.isArray(example);

        return {
          type: 'array',
          ...(minItems ? { minItems } : {}),
          ...(maxItems ? { maxItems } : {}),
          ...(isArrayExample ? { example } : {}),
          items: {
            ...innerSchema,
            ...rest,
            ...(!isArrayExample && example ? { example } : {}),
          },
        };
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
        // Check if this is a union of string literals that should be treated as an enum
        const unionSchema = schema as CombinedType;
        const isStringEnum = unionSchema.schemas.every((s) => {
          if (s.type === 'string' && isPrimitive(s)) {
            const primitiveSchema = s as Primitive;
            return (
              primitiveSchema.enum !== undefined && primitiveSchema.enum.length === 1
            );
          }
          return false;
        });

        if (isStringEnum) {
          // Extract enum values from the union of string literals
          const enumValues: any[] = [];
          unionSchema.schemas.forEach((s) => {
            if (s.type === 'string' && isPrimitive(s)) {
              const primitiveSchema = s as Primitive;
              if (primitiveSchema.enum && primitiveSchema.enum.length === 1) {
                enumValues.push(primitiveSchema.enum[0]);
              }
            }
          });

          // Combine enum descriptions from all schemas
          const enumDescriptions: Record<string, string> = {};
          for (const s of unionSchema.schemas) {
            if (s.type === 'string' && isPrimitive(s)) {
              const primitiveSchema = s as Primitive;
              if (
                primitiveSchema.enumDescriptions &&
                primitiveSchema.enum &&
                primitiveSchema.enum.length === 1
              ) {
                const enumKey = String(primitiveSchema.enum[0]);
                if (primitiveSchema.enumDescriptions[enumKey]) {
                  const desc = primitiveSchema.enumDescriptions[enumKey];
                  if (typeof desc === 'string') {
                    enumDescriptions[enumKey] = desc;
                  }
                }
              }
            }
          }

          return {
            type: 'string',
            enum: enumValues,
            ...defaultOpenAPIObject,
          };
        }

        let nullable = false;
        let oneOf: (OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject)[] = [];

        // If there are two schemas and one of the schemas is undefined, that means the union is a case of `optional` type
        const undefinedSchema = schema.schemas.find((s) => s.type === 'undefined');
        const nonUndefinedSchema = schema.schemas.find((s) => s.type !== 'undefined');
        // If nullSchema exists, that means that the union is also nullable
        const nullSchema = schema.schemas.find((s) => s.type === 'null');

        // If any schema exists and it is in union with another schema - we can remove the any schema as an optimization
        const unknownSchema = schema.schemas.find((s) => s.type === 'any');

        // and we can just return the other schema (while attaching the comment to that schema)
        const isOptional =
          schema.schemas.length >= 2 && undefinedSchema && nonUndefinedSchema;
        if (isOptional) {
          return schemaToOpenAPI({
            ...nonUndefinedSchema,
            comment: schema.comment,
            ...(nullSchema ? { nullable: true } : {}),
          });
        }

        // This is an edge case for something like this -> t.union([WellDefinedCodec, t.unknown])
        // It doesn't make sense to display the unknown codec in the OpenAPI spec so this essentially strips it out of the generation
        // so that we don't present useless information to the user
        const isUnionWithUnknown = schema.schemas.length >= 2 && unknownSchema;
        if (isUnionWithUnknown) {
          const nonUnknownSchemas = schema.schemas.filter((s) => s.type !== 'any');

          if (nonUnknownSchemas.length === 1 && nonUnknownSchemas[0] !== undefined) {
            return schemaToOpenAPI({
              ...nonUnknownSchemas[0],
              comment: schema.comment,
              ...(nullSchema ? { nullable: true } : {}),
            });
          } else if (nonUnknownSchemas.length > 1) {
            return schemaToOpenAPI({
              type: 'union',
              schemas: nonUnknownSchemas,
              comment: schema.comment,
              ...(nullSchema ? { nullable: true } : {}),
            });
          }
        }

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
        if (additionalProperties === undefined) return undefined;

        if (schema.domain !== undefined) {
          const keys = schemaToOpenAPI(schema.domain) as OpenAPIV3.SchemaObject;
          if (keys.type === 'string' && keys.enum !== undefined) {
            const properties = keys.enum.reduce((acc, key) => {
              return { ...acc, [key]: additionalProperties };
            }, {});

            return {
              type: 'object',
              properties,
              ...defaultOpenAPIObject,
              required: keys.enum,
            };
          }
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
    } else if (schema.type === 'string') {
      // Remove extraneous double quotes around the fieldValue
      return fieldValue?.replace(/^"(.*)"$/, '$1');
    } else {
      return fieldValue;
    }
  };

  function buildDefaultOpenAPIObject(schema: Schema): OpenAPIV3.SchemaObject {
    const emptyBlock: Block = { description: '', tags: [], source: [], problems: [] };
    const jsdoc = parseCommentBlock(schema.comment ?? emptyBlock);

    const defaultValue = jsdoc?.tags?.default ?? schema.default;
    const example = jsdoc?.tags?.example ?? schema.example;
    const maxLength = jsdoc?.tags?.maxLength ?? schema.maxLength;
    const minLength = jsdoc?.tags?.minLength ?? schema.minLength;
    const pattern = jsdoc?.tags?.pattern ?? schema.pattern;
    const minimum = jsdoc?.tags?.minimum ?? schema.maximum;
    const maximum = jsdoc?.tags?.maximum ?? schema.minimum;
    const minItems = jsdoc?.tags?.minItems ?? schema.minItems;
    const maxItems = jsdoc?.tags?.maxItems ?? schema.maxItems;
    const minProperties = jsdoc?.tags?.minProperties ?? schema.minProperties;
    const maxProperties = jsdoc?.tags?.maxProperties ?? schema.maxProperties;
    const exclusiveMinimum = jsdoc?.tags?.exclusiveMinimum ?? schema.exclusiveMinimum;
    const exclusiveMaximum = jsdoc?.tags?.exclusiveMaximum ?? schema.exclusiveMaximum;
    const multipleOf = jsdoc?.tags?.multipleOf ?? schema.multipleOf;
    const uniqueItems = jsdoc?.tags?.uniqueItems ?? schema.uniqueItems;
    const readOnly = jsdoc?.tags?.readOnly ?? schema.readOnly;
    const writeOnly = jsdoc?.tags?.writeOnly ?? schema.writeOnly;
    const format = jsdoc?.tags?.format ?? schema.format ?? schema.format;
    const title = jsdoc?.tags?.title ?? schema.title;

    const keys = Object.keys(jsdoc?.tags || {});

    const deprecated = keys.includes('deprecated') || !!schema.deprecated;
    const isPrivate = keys.includes('private');
    const description = schema.comment?.description ?? schema.description;

    // Extract enum descriptions if present
    const enumDescriptions = extractEnumDescriptions(schema);

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
      ...(title ? { title } : {}),
      ...(isPrivate ? { 'x-internal': true } : {}),
      ...(Object.keys(enumDescriptions).length > 0
        ? { 'x-enumDescriptions': enumDescriptions }
        : {}),
    };

    return defaultOpenAPIObject;
  }

  let openAPIObject = createOpenAPIObject(schema);

  return openAPIObject;
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
      ...(Object.keys(unknownTagsObject).length > 0
        ? { 'x-unknown-tags': unknownTagsObject }
        : {}),
      parameters: route.parameters.map((p) => {
        // Array types not allowed here
        let schema = schemaToOpenAPI(p.schema);

        // Extract example from JSDoc tags if present
        const exampleTag = p.schema?.comment?.tags?.find(
          (tag) => tag.tag === '@example',
        );
        let exampleValue = exampleTag?.description;

        // Handle references to schema wrapped in allOf
        // If we have an allOf with only one ref, simplify it to just the reference
        // This makes the OpenAPI spec cleaner and easier to use with OpenAPI tools
        const schemaObj = schema as OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
        if (
          schemaObj &&
          'allOf' in schemaObj &&
          Array.isArray(schemaObj.allOf) &&
          schemaObj.allOf.length === 1 &&
          schemaObj.allOf[0] &&
          '$ref' in schemaObj.allOf[0]
        ) {
          // Keep track of example value if present
          if (schemaObj && 'example' in schemaObj) {
            exampleValue = schemaObj.example;
          }

          // Replace the allOf wrapper with a simple reference
          schema = schemaObj.allOf[0];
        }

        // Remove description from schema to avoid duplication
        const schemaWithDesc = schema as OpenAPIV3.SchemaObject;
        if (schemaWithDesc && 'description' in schemaWithDesc) {
          delete schemaWithDesc.description;
        }

        // Handle private schemas
        const privateSchema = schema as any;
        const isPrivate = privateSchema && 'x-internal' in privateSchema;
        if (isPrivate) {
          delete privateSchema['x-internal'];
        }

        // Use example from JSDoc if available
        // For fields with comments describing current status filters, use 'active' as example
        const isCurrentStatusFilter = p.schema?.comment?.description?.includes(
          'Current status filter',
        );
        if (isCurrentStatusFilter) {
          exampleValue = 'active';
        }

        return {
          name: p.name,
          ...(p.schema?.comment?.description !== undefined
            ? { description: p.schema.comment.description }
            : {}),
          in: p.type,
          ...(isPrivate ? { 'x-internal': true } : {}),
          ...(p.required ? { required: true } : {}),
          ...(p.explode ? { style: 'form', explode: true } : {}),
          ...(exampleValue ? { example: exampleValue } : {}),
          schema: schema as any, // TODO: Something to disallow arrays
        };
      }),
      ...requestBody,
      responses: Object.entries(route.response).reduce((acc, [code, response]) => {
        const description = STATUS_CODES[code] ?? '';

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
      // Get the enum descriptions before converting the schema
      const enumDescriptions = extractEnumDescriptions(schema);
      const openapiSchema = schemaToOpenAPI(schema);

      if (openapiSchema === undefined) {
        return acc;
      } else if ('$ref' in openapiSchema) {
        return {
          ...acc,
          [name]: {
            allOf: [{ title: name }, openapiSchema],
            ...(Object.keys(enumDescriptions).length > 0
              ? { 'x-enumDescriptions': enumDescriptions }
              : {}),
          },
        };
      } else {
        return {
          ...acc,
          [name]: {
            title: name,
            ...openapiSchema,
            ...(Object.keys(enumDescriptions).length > 0
              ? { 'x-enumDescriptions': enumDescriptions }
              : {}),
          },
        };
      }
    },
    {} as Record<string, OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject>,
  );

  const sortedPaths = Object.keys(paths)
    .sort((a, b) => a.localeCompare(b))
    .reduce(
      (acc, key) => {
        const sortedMethods = Object.keys(paths[key]!)
          .sort((a, b) => a.localeCompare(b))
          .reduce(
            (methodAcc, methodKey) => {
              methodAcc[methodKey] = paths[key]![methodKey]!;
              return methodAcc;
            },
            {} as Record<string, OpenAPIV3.PathItemObject>,
          );

        acc[key] = sortedMethods;
        return acc;
      },
      {} as Record<string, OpenAPIV3.PathItemObject>,
    );

  return {
    openapi: '3.0.3',
    info,
    ...(servers.length > 0 ? { servers } : {}),
    paths: sortedPaths,
    components: {
      schemas: openapiSchemas,
    },
  };
}
