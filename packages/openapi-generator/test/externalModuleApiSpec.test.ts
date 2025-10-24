import assert from 'assert';
import test from 'node:test';
import {
  Project,
  Route,
  parseApiSpec,
  Schema,
  getRefs,
  parseCodecInitializer,
  convertRoutesToOpenAPI,
} from '../src';
import { KNOWN_IMPORTS } from '../src/knownImports';
import { findSymbolInitializer } from '../src/resolveInit';
import * as p from 'node:path';
import * as E from 'fp-ts/Either';

/** External library parsing and api spec generation test case
 *
 *
 * @param description a description of the test case
 * @param entryPoint the entrypoint of the api spec
 * @param expected an open api spec object
 * @param expectedErrors  opetional record of expected parsing errors
 */
async function testCase(
  description: string,
  entryPoint: string,
  expected: Record<string, object | string>,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    const project = new Project({}, KNOWN_IMPORTS);
    const entryPointPath = p.resolve(entryPoint);
    await project.parseEntryPoint(entryPointPath);

    const sourceFile = project.get(entryPointPath);

    if (sourceFile === undefined) {
      throw new Error(`could not find source file ${entryPoint}`);
    }

    const actual: Record<string, Route[]> = {};
    const errors: string[] = [];

    for (const symbol of sourceFile.symbols.declarations) {
      if (symbol.init !== undefined) {
        if (symbol.init.type !== 'CallExpression') {
          continue;
        } else if (
          symbol.init.callee.type !== 'MemberExpression' ||
          symbol.init.callee.property.type !== 'Identifier' ||
          symbol.init.callee.property.value !== 'apiSpec'
        ) {
          continue;
        } else if (symbol.init.arguments.length !== 1) {
          continue;
        }
        const arg = symbol.init.arguments[0]!;
        if (arg.expression.type !== 'ObjectExpression') {
          continue;
        }
        const result = parseApiSpec(project, sourceFile, arg.expression);
        if (E.isLeft(result)) {
          errors.push(result.left);
        } else {
          actual[symbol.name] = result.right;
        }
      }
    }

    const apiSpec = Object.values(actual).flatMap((routes) => routes);

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
      const refs = getRefs(schema, project.getTypes());
      for (const ref of refs) {
        if (components[ref.name] !== undefined) {
          continue;
        }
        const sourceFile = project.get(ref.location);
        if (sourceFile === undefined) {
          errors.push(`Could not find '${ref.name}' from '${ref.location}'`);
          break;
        }

        const initE = findSymbolInitializer(project, sourceFile, ref.name);
        if (E.isLeft(initE)) {
          errors.push(
            `Could not find symbol '${ref.name}' in '${ref.location}': ${initE.left}`,
          );
          break;
        }
        const [newSourceFile, init] = initE.right;

        const codecE = parseCodecInitializer(project, newSourceFile, init);
        if (E.isLeft(codecE)) {
          errors.push(
            `Could not parse codec '${ref.name}' in '${ref.location}': ${codecE.left}`,
          );
          break;
        }
        components[ref.name] = codecE.right;
        queue.push(codecE.right);
      }
    }

    const name = description;

    const openapi = convertRoutesToOpenAPI(
      {
        title: name,
        version: '1.0.0',
        description,
      },
      [],
      apiSpec,
      components,
    );

    assert.deepStrictEqual(errors, expectedErrors);
    assert.deepStrictEqual(openapi, expected);
  });
}

testCase(
  'simple api spec with imported types',
  'test/sample-types/apiSpec.ts',
  {
    openapi: '3.0.3',
    info: {
      title: 'simple api spec with imported types',
      version: '1.0.0',
      description: 'simple api spec with imported types',
    },
    paths: {
      '/test': {
        post: {
          parameters: [],
          requestBody: {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    path1: {
                      type: 'string',
                    },
                    path2: {
                      type: 'number',
                    },
                    path3: {
                      type: 'boolean',
                    },
                    path4: {
                      type: 'string',
                      enum: ['literal'],
                    },
                  },
                  required: ['path1', 'path2', 'path3', 'path4'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'string',
                  },
                },
              },
            },
          },
        },
        get: {
          parameters: [],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SampleGetResponse',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        SampleGetResponse: {
          title: 'SampleGetResponse',
          type: 'object',
          properties: {
            response1: {
              type: 'string',
            },
            response2: {
              type: 'object',
              properties: {
                nested1: {
                  type: 'number',
                },
                nested2: {
                  type: 'boolean',
                },
              },
              required: ['nested1', 'nested2'],
            },
          },
          required: ['response1', 'response2'],
        },
      },
    },
  },
  [],
);

testCase(
  'simple api spec with exported enum',
  'test/sample-types/apiSpecWithEnum.ts',
  {
    openapi: '3.0.3',
    info: {
      title: 'simple api spec with exported enum',
      version: '1.0.0',
      description: 'simple api spec with exported enum',
    },
    paths: {
      '/test': {
        get: {
          parameters: [],
          responses: {
            '200': {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SampleEnumType',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        SampleEnumType: {
          title: 'SampleEnumType',
          type: 'string',
          enum: ['Value1', 'Value2'],
        },
      },
    },
  },
  [],
);

testCase(
  'simple api spec with exported union type',
  'test/sample-types/apiSpecWithUnion.ts',
  {
    openapi: '3.0.3',
    info: {
      title: 'simple api spec with exported union type',
      version: '1.0.0',
      description: 'simple api spec with exported union type',
    },
    paths: {
      '/test': {
        get: {
          parameters: [],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    $ref: '#/components/schemas/SampleUnion',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {
        SampleUnion: {
          title: 'SampleUnion',
          oneOf: [
            {
              type: 'string',
            },
            {
              type: 'number',
            },
          ],
        },
      },
    },
  },
  [],
);

testCase(
  'simple api spec with custom codec',
  'test/sample-types/apiSpecWithCustomCodec.ts',
  {
    openapi: '3.0.3',
    info: {
      title: 'simple api spec with custom codec',
      version: '1.0.0',
      description: 'simple api spec with custom codec',
    },
    paths: {
      '/test': {
        get: {
          parameters: [],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'string',
                    description: 'Sample custom codec',
                    example: 'sample',
                    format: 'sample',
                  },
                },
              },
            },
            201: {
              description: 'Created',
              content: {
                'application/json': {
                  schema: {
                    type: 'number',
                    description: 'Another sample codec',
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {},
    },
  },
  [],
);

testCase(
  'simple api spec with util type functions',
  'test/sample-types/apiSpecWithArrow.ts',
  {
    openapi: '3.0.3',
    info: {
      title: 'simple api spec with util type functions',
      version: '1.0.0',
      description: 'simple api spec with util type functions',
    },
    paths: {
      '/test': {
        get: {
          parameters: [],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      hasLargeNumberOfAddresses: {
                        nullable: true,
                        type: 'boolean',
                      },
                    },
                    required: ['hasLargeNumberOfAddresses'],
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {},
    },
  },
  [],
);

testCase(
  'simple api spec with block statement arrow functions',
  'test/sample-types/apiSpecWithBlockArrow.ts',
  {
    openapi: '3.0.3',
    info: {
      title: 'simple api spec with block statement arrow functions',
      version: '1.0.0',
      description: 'simple api spec with block statement arrow functions',
    },
    paths: {
      '/test': {
        get: {
          parameters: [],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      hasLargeNumberOfAddresses: {
                        nullable: true,
                        type: 'boolean',
                      },
                    },
                    required: ['hasLargeNumberOfAddresses'],
                  },
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas: {},
    },
  },
  [],
);
