import { parse as parseComment } from 'comment-parser';
import { flow, pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as RA from 'fp-ts/ReadonlyArray';
import {
  Expression,
  InitializerExpressionGetableNode,
  Node,
  Symbol,
  ts,
  Type,
} from 'ts-morph';
import type { OpenAPIV3_1 } from 'openapi-types';

import { toOpenAPISchema, ParseSchema } from './expression';
import { parseType } from './type';
import { State } from './state';

function propertySymOfType(type: Type, property: string): E.Either<string, Symbol> {
  return E.fromNullable(`no property '${property}' in ${type.getText()}`)(
    type.getProperty(property),
  );
}

function getJsDocParamDescription(property: Symbol): string[] {
  return property
    .getJsDocTags()
    .filter((t) => t.getName() === 'param')
    .flatMap((t) => t.getText())
    .map((t) => t.text);
}

function initializerForPropertySymbol(sym: Symbol): E.Either<string, Expression> {
  return pipe(
    E.fromNullable(`declaration not found for symbol ${sym.getName()}`)(
      sym.getDeclarations().find((d) => Node.isInitializerExpressionGetable(d)),
    ),
    E.chain((decl) =>
      Node.isPropertyAssignment(decl)
        ? E.right(decl)
        : E.left('declaration is not assignment'),
    ),
    E.chain((decl) => E.fromNullable('initializer not found')(decl.getInitializer())),
  );
}

function typeParamOfCodec(
  expr: Expression<ts.Expression>,
  param: 'A' | 'O' | 'I',
): E.Either<string, Type> {
  return pipe(
    E.fromNullable(`Could not get type of ${expr.getText()}`)(expr.getContextualType()),
    E.chain((type) => propertySymOfType(type, `_${param}`)),
    E.map((sym) => sym.getTypeAtLocation(expr)),
  );
}

function parametersFromCodecOutputSym(
  state: State,
  init: Expression,
  sym: Symbol,
  paramIn: 'query' | 'path',
): E.Either<
  string,
  readonly {
    description?: string | undefined;
    name: any;
    schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
    required: boolean;
    in: 'query' | 'path';
  }[]
> {
  return pipe(
    E.right(sym.getTypeAtLocation(init)),
    E.chain((type) =>
      pipe(
        RA.fromArray(type.getProperties()),
        RA.traverse(E.Applicative)((sym) =>
          pipe(
            E.Do,
            E.bind('name', () => E.right(sym.getName())),
            E.bind('description', () => E.right(getJsDocParamDescription(sym))),
            E.bind('codec', () => initializerForPropertySymbol(sym)),
          ),
        ),
      ),
    ),
    E.chain(
      flow(
        RA.traverse(E.Applicative)(({ description, name, codec }) =>
          pipe(
            toOpenAPISchema(state, codec),
            E.chain((result) =>
              result.type === 'unrepresentable'
                ? E.left('unrepresentable query param')
                : E.right(result),
            ),
            E.map(({ schema, required }) => ({
              name,
              schema,
              required,
              in: paramIn,
              ...(description.length > 0
                ? { description: description[description.length - 1] }
                : {}),
            })),
          ),
        ),
      ),
    ),
  );
}

function propertySymOfBaseDeclaration(
  decl: Expression,
  property: string,
): E.Either<string, Symbol> {
  const type = decl.getType();
  return propertySymOfType(type, property);
}

function stringLiteralValueOfProperty(
  decl: Expression,
  name: string,
): E.Either<string, string> {
  const type = decl.getType();
  return pipe(
    E.fromNullable(`no property '${name}' in ${type.getText()}`)(
      type.getProperty(name),
    ),
    E.chain((sym) =>
      E.fromNullable(`no declaration for symbol ${sym.getName()}`)(
        sym.getDeclarations().find((d) => Node.isPropertyAssignment(d)),
      ),
    ),
    E.chain((decl) =>
      E.fromNullable(`no initializer for ${decl.getText()}`)(
        Node.isPropertyAssignment(decl) ? decl.getInitializer() : undefined,
      ),
    ),
    E.chain((init) =>
      E.fromNullable(`initializer is not string literal`)(
        Node.isStringLiteral(init) ? init.getLiteralValue() : undefined,
      ),
    ),
  );
}

function outputTypeOfDeclaredRequestCodec(decl: Expression): E.Either<string, Type> {
  return pipe(
    propertySymOfBaseDeclaration(decl, 'request'),
    E.chain(initializerForPropertySymbol),
    E.chain((sym) => typeParamOfCodec(sym, 'O')),
  );
}

function routeDescription(initializer: Node): {
  description?: string;
  isPrivate: boolean;
} {
  return pipe(
    E.fromNullable('No symbol for initializer')(initializer.getSymbol()),
    E.chain((sym) =>
      E.fromNullable('No value declaration')(
        (sym.getAliasedSymbol() ?? sym).getValueDeclaration(),
      ),
    ),
    E.chain((decl): E.Either<string, { description?: string; isPrivate: boolean }> => {
      let current: Node | undefined = decl;
      while (current !== undefined) {
        const comments = current.getLeadingCommentRanges();
        if (comments.length > 0) {
          // Just taking the first one for now
          const comment = parseComment(comments[0]!.getText());
          if (comment.length === 0) {
            return E.left('no parsed comment');
          }
          const description = comment[0]!.description;
          const isPrivate =
            comment[0]!.tags.findIndex(({ tag }) => tag === 'private') >= 0;
          return E.right({ description, isPrivate });
        } else {
          const next = current.getParent();
          if (!next || next.getPos() === current.getPos()) {
            break;
          }
          current = next;
        }
      }
      return E.left('no comment found');
    }),
    E.getOrElseW(() => ({ isPrivate: false })),
  );
}

function getRouteSummary(expr: Expression) {
  const sym = expr.getSymbol();
  if (!sym) {
    return 'Unknown route';
  } else {
    return (sym.getAliasedSymbol() ?? sym).getName();
  }
}

function propsToOpenAPISchema(
  state: State,
  node: Expression<ts.Expression>,
  type: Type,
) {
  return parseType({
    location: node,
    type,
    parseExpression: (expr) => toOpenAPISchema(state, expr),
  });
}

type RouteNode = {
  readonly description: string;
  readonly isPrivate: boolean;
  readonly query: readonly {
    description?: string | undefined;
    name: any;
    schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
    required: boolean;
    in: 'query' | 'path';
  }[];
  readonly path: string;
  readonly summary: string;
  readonly method: string;
  readonly params: readonly {
    description?: string | undefined;
    name: any;
    schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
    required: boolean;
    in: 'query' | 'path';
  }[];
  readonly body: ParseSchema | undefined;
  readonly responses: readonly {
    code: string;
    schema: ParseSchema;
  }[];
};

export function schemaForRouteNode(
  state: State,
  node: Expression<ts.Expression>,
): E.Either<string, RouteNode> {
  const description = {
    ...routeDescription(node),
    summary: getRouteSummary(node),
  };
  const wtf = pipe(
    E.right(description) as any,
    E.bind('summary', () => E.right(getRouteSummary(node))),
    E.bind('path', () => stringLiteralValueOfProperty(node, 'path')),
  );
  const bbq = pipe(
    wtf,
    E.bind('method', () =>
      pipe(
        stringLiteralValueOfProperty(node, 'method'),
        E.map((m) => m.toLowerCase()),
      ),
    ),
    E.bind('query', () =>
      pipe(
        outputTypeOfDeclaredRequestCodec(node),
        E.chain((type) => propertySymOfType(type, 'query')),
        E.chain((sym) => parametersFromCodecOutputSym(state, node, sym, 'query')),
      ),
    ),
    E.bind('params', () =>
      pipe(
        outputTypeOfDeclaredRequestCodec(node),
        E.chain((type) => propertySymOfType(type, 'params')),
        E.chain((sym) => parametersFromCodecOutputSym(state, node, sym, 'path')),
      ),
    ),
  );
  return pipe(
    bbq as any,
    E.bind('body', () =>
      pipe(
        outputTypeOfDeclaredRequestCodec(node),
        E.chain((type) => propertySymOfType(type, 'body')),
        E.map((sym) => sym.getTypeAtLocation(node)),
        E.chain((type) => propsToOpenAPISchema(state, node, type)),
        E.chain((body) =>
          body.type === 'unrepresentable'
            ? E.left('unrepresentable body type')
            : E.right(body),
        ),
        E.orElseW(() => E.right(undefined)),
      ),
    ),
    E.bind('responses', () =>
      pipe(
        propertySymOfType(node.getType(), 'response'),
        E.map((sym) => sym.getTypeAtLocation(node)),
        E.map((type) => type.getProperties()),
        E.chain((props) => {
          const result = RA.traverse(E.Applicative)((sym: Symbol) => {
            return pipe(
              initializerForPropertySymbol(sym),
              E.chain((expr) => toOpenAPISchema(state, expr)),
              E.chain((response) =>
                response.type === 'unrepresentable'
                  ? E.left('unrepresentable response')
                  : E.right(response),
              ),
              E.bindTo('schema'),
              E.bind('code', () => {
                const name = sym.getName();
                return E.fromNullable('undefined response code name')(name);
              }),
            );
          })(props);
          return result;
        }),
      ),
    ),
  ) as any;
}

export const apiSpecVersion = (sym: Symbol) =>
  pipe(
    E.fromNullable('no version tag for symbol')(
      sym.getJsDocTags().find((tag) => tag.getName() === 'version'),
    ),
    E.chain((tag) => E.fromNullable('no text for version tag')(tag.getText()[0])),
    E.map((text) => text.text),
    E.getOrElse(() => '0.1.0'),
  );

function initializerForSymbol(
  symbol: Symbol,
): E.Either<string, Node & InitializerExpressionGetableNode> {
  const decl = symbol.getDeclarations()[0];
  if (!decl) {
    return E.left(`no declarations for route symbol ${symbol.getName()}`);
  }
  if (!Node.isInitializerExpressionGetable(decl)) {
    return E.left(`declaration '${decl.getText()}' is not initializer`);
  }
  return E.right(decl);
}

export function routesForApiSpecNode(apiSpec: Node): E.Either<string, readonly Node[]> {
  const apiActions = apiSpec.getType().getProperties();
  const routeSymbols = apiActions.flatMap((actionSym) =>
    actionSym.getTypeAtLocation(apiSpec).getProperties(),
  );
  return pipe(routeSymbols, RA.traverse(E.Applicative)(initializerForSymbol));
}

export function schemaForApiSpec(state: State, apiSpec: Node) {
  return pipe(
    apiSpec.getType().getProperties(),
    RA.chain((operationSym) => operationSym.getTypeAtLocation(apiSpec).getProperties()),
    RA.traverse(E.Applicative)((routeSym) =>
      pipe(
        E.fromNullable(`no declarations for route symbol ${routeSym.getName()}`)(
          routeSym.getDeclarations()[0],
        ),
        E.chain((node) =>
          Node.isInitializerExpressionGetable(node)
            ? E.fromNullable('initializer not found')(node.getInitializer())
            : E.left('decl not initializer'),
        ),
        E.chain((node) => schemaForRouteNode(state, node)),
      ),
    ),
  );
}
