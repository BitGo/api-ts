import { pipe } from 'fp-ts/function';
import * as A from 'fp-ts/Alt';
import * as RA from 'fp-ts/ReadonlyArray';
import * as E from 'fp-ts/Either';
import { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';
import {
  DiagnosticCategory,
  Node,
  Project,
  SourceFile,
  Symbol,
  VariableDeclaration,
} from 'ts-morph';

import { apiSpecVersion, schemaForApiSpec } from './route';
import { Config } from './config';
import { State } from './state';
import { filterUnrepresentable, toOpenAPISchema } from './expression';

export type Env = {
  config: Config;
  state: State;
};

function project({
  config: { tsConfig, virtualFiles },
}: Env): E.Either<string, Project> {
  const project = new Project({
    tsConfigFilePath: tsConfig,
  });
  for (const [filename, source] of Object.entries(virtualFiles)) {
    project.createSourceFile(filename, source);
  }

  const errors = project
    .getPreEmitDiagnostics()
    .filter((diag) => diag.getCategory() === DiagnosticCategory.Error);

  if (errors.length > 0) {
    const messages = errors.map((err) => {
      const message = err.getMessageText();
      if (typeof message === 'string') {
        return message;
      } else {
        return message.getMessageText();
      }
    });
    return E.left(`Errors found in project:\n${messages.join('\n')}`);
  }

  return E.right(project);
}

function sourceFile(project: Project, filename: string): E.Either<string, SourceFile> {
  return E.fromNullable(`${filename} not in project`)(project.getSourceFile(filename));
}

function variableDeclarationOfSymbol(
  sym: Symbol,
): E.Either<string, VariableDeclaration> {
  const declaration = sym.getDeclarations().find((d) => Node.isVariableDeclaration(d));
  // Asserting type because control-flow analysis is not narrowing it properly through find()
  return E.fromNullable(`${sym.getName()} has no variable declarations`)(
    declaration as VariableDeclaration,
  );
}

type PathSpec = { [Path: string]: { [Method: string]: OpenAPIV3_1.OperationObject } };

/**
 * There seems to be a bug in the openapi-types declaration for 3.1 parameters where their
 * schemas use the 3.0 schema object type that disallows nulls. I've checked with a schema
 * validator and it appears to accept null parameter (though why would you need this?), so
 * to work around the type definition bug, the parameter definitions can just be asserted.
 */
type ParameterList = (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[];

function routesForSymbol(
  config: Config,
  state: State,
  sym: Symbol,
): E.Either<string, PathSpec> {
  return pipe(
    variableDeclarationOfSymbol(sym),
    E.chain((node) => schemaForApiSpec(state, node)),
    E.map(
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
          isPrivate && !config.includeInternal
            ? paths
            : {
                ...paths,
                [path]: {
                  ...paths[path],
                  [method]: {
                    summary,
                    ...(description !== undefined ? { description } : {}),
                    ...(isPrivate ? { 'x-internal': true } : {}),
                    parameters: [
                      ...(query as ParameterList),
                      ...(params as ParameterList),
                    ],
                    responses: responses.reduce<OpenAPIV3_1.ResponsesObject>(
                      (acc, { code, schema: { schema } }) => ({
                        ...acc,
                        [code]: {
                          description: '', // DISCUSS: This field actually is required, is there a better default for this?
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
  );
}

export function componentsForProject(
  config: Config,
): E.Either<string, OpenAPIV3_1.Document> {
  const state: State = new State();

  return pipe(
    project({ config, state }),
    E.chain((project) => sourceFile(project, config.index)),
    E.chain((src) =>
      pipe(
        src.getExportSymbols(),
        RA.map((sym) =>
          pipe(
            E.Do,
            E.bind('paths', () => routesForSymbol(config, state, sym)),
            E.bind('version', () => E.right(apiSpecVersion(sym))),
          ),
        ),
        A.altAll(E.Alt)(E.left('no valid route symbols exported')),
      ),
    ),
    E.bind('components', () => {
      const schemas: Record<string, OpenAPIV3_1.SchemaObject> = {};
      let sym: Symbol | undefined;
      while ((sym = state.dequeueRef()) !== undefined) {
        const name = sym.getName();
        console.log(`processing ${name}`);
        const schemaE = pipe(
          variableDeclarationOfSymbol(sym),
          E.chain((node) => {
            const init = node.getInitializer();
            if (init === undefined) {
              return E.left(`no initializer for ${name}`);
            }
            return toOpenAPISchema(state, init, true);
          }),
          E.chain(filterUnrepresentable),
          E.map((spec) => spec.schema),
        );
        if (schemaE._tag === 'Left') {
          //return schemaE;
          continue;
        } else {
          schemas[name] = schemaE.right;
        }
      }
      return E.right({ schemas });
    }),
    E.map(({ components, paths, version }) => ({
      openapi: '3.1.0',
      info: {
        title: config.name,
        version: version,
      },
      paths,
      components,
    })),
  );
}
