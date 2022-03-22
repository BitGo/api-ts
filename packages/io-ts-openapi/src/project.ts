import { flow, pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Alt';
import * as RA from 'fp-ts/ReadonlyArray';
import * as E from 'fp-ts/Either';
import * as RE from 'fp-ts/ReaderEither';
import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import { Node, Project, SourceFile, Symbol, VariableDeclaration } from 'ts-morph';

import { schemaForApiSpec } from './route';
import { Config } from './config';

type Env = {
  memo: { [K: string]: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject };
  config: Config;
};

const project = ({
  config: { tsConfig, virtualFiles },
}: Env): E.Either<string, Project> => {
  const project = new Project({
    tsConfigFilePath: tsConfig,
  });
  for (const [filename, source] of Object.entries(virtualFiles)) {
    project.createSourceFile(filename, source);
  }

  return E.right(project);
};

const sourceFile = (filename: string) => (project: Project) =>
  E.fromNullable(`${filename} not in project`)(project.getSourceFile(filename));

const variableDeclarationOfSymbol = (sym: Symbol) => {
  const declaration = sym.getDeclarations().find((d) => Node.isVariableDeclaration(d));
  // Asserting type because control-flow analysis is not narrowing it properly through find()
  return E.fromNullable(`${sym.getName()} has no variable declarations`)(
    declaration as VariableDeclaration,
  );
};

type PathSpec = { [Path: string]: { [Method: string]: OpenAPIV3_1.OperationObject } };

/**
 * There seems to be a bug in the openapi-types declaration for 3.1 parameters where their
 * schemas use the 3.0 schema object type that disallows nulls. I've checked with a schema
 * validator and it appears to accept null parameter (though why would you need this?), so
 * to work around the type definition bug, the parameter definitions can just be asserted.
 */
type ParameterList = (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[];

const routesForSourceFile =
  (source: SourceFile) =>
  ({ config: { includeInternal }, memo }: Env) =>
    pipe(
      source.getExportSymbols(),
      RA.map(flow(variableDeclarationOfSymbol, E.chain(schemaForApiSpec(memo)))),
      A.altAll(E.Alt)(E.left('no valid exports found')),
      E.map(
        flow(
          RA.reduce(
            {},
            (
              paths: PathSpec,
              {
                path,
                method,
                query,
                params,
                body,
                responses,
                summary,
                description,
                isPrivate,
              },
            ) =>
              isPrivate && !includeInternal
                ? paths
                : {
                    ...paths,
                    [path]: {
                      ...paths[path],
                      [method]: {
                        summary,
                        description,
                        ...(isPrivate ? { 'x-internal': true } : {}),
                        parameters: [
                          ...(query as ParameterList),
                          ...(params as ParameterList),
                        ],
                        responses: responses.reduce<OpenAPIV3_1.ResponsesObject>(
                          (acc, { code, schema: { schema } }) => ({
                            ...acc,
                            [code]: {
                              description: '',
                              content: {
                                'application/json': { schema },
                              },
                            },
                          }),
                          {},
                        ),
                        ...(body !== undefined
                          ? {
                              requestBody: {
                                content: {
                                  'application/json': {
                                    schema: body.schema,
                                  },
                                },
                                required: body.required,
                              },
                            }
                          : {}),
                      },
                    },
                  },
          ),
        ),
      ),
    );

export function componentsForProject(
  config: Config,
): E.Either<string, OpenAPIV3_1.Document> {
  const memo = {};

  return pipe(
    project,
    RE.chainEitherK(sourceFile(config.index)),
    RE.chain(routesForSourceFile),
    RE.map((paths) => ({
      openapi: '3.1.0',
      info: {
        title: config.name,
        version: '1',
      },
      paths,
      components: {
        schemas: memo,
      },
    })),
  )({ config, memo });
}
