import { HttpResponseCodes } from '@api-ts/io-ts-http';
import { parse as parseComment } from 'comment-parser';
import { flow, pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as RA from 'fp-ts/ReadonlyArray';
import * as RE from 'fp-ts/ReaderEither';
import { Expression, Node, Symbol, ts, Type } from 'ts-morph';

import { toOpenAPISchema as toSchema } from './expression';
import { parseType } from './type';

type RouteDeclarationEnv = {
  decl: Expression<ts.Expression>;
  memo: any;
};

type RouteParseError = string;

type RouteParseStep<R> = RE.ReaderEither<RouteDeclarationEnv, RouteParseError, R>;

const propertySymOfType = (property: string) => (type: Type) =>
  E.fromNullable(`no property '${property}' in ${type.getText()}`)(
    type.getProperty(property),
  );

const typeOfSymbol =
  (sym: Symbol): RouteParseStep<Type> =>
  ({ decl }: RouteDeclarationEnv) =>
    E.right<string, Type>(sym.getTypeAtLocation(decl));

const baseDeclarationType: RouteParseStep<Type> = ({ decl }) => E.right(decl.getType());

const getJsDocParamDescription = (property: Symbol) =>
  property
    .getJsDocTags()
    .filter((t) => t.getName() === 'param')
    .flatMap((t) => t.getText())
    .map((t) => t.text);

const initializerForPropertySymbol = (sym: Symbol) =>
  pipe(
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

const typeParamOfCodec =
  (param: 'A' | 'O' | 'I') => (expr: Expression<ts.Expression>) =>
    pipe(
      RE.fromEither(
        E.fromNullable(`Could not get type of ${expr.getText()}`)(
          expr.getContextualType(),
        ),
      ),
      RE.chainEitherK(propertySymOfType(`_${param}`)),
      RE.chain(typeOfSymbol),
    );

const toOpenAPISchema = (init: Expression) => (env: RouteDeclarationEnv) =>
  pipe(
    toSchema(init)(env),
    E.map((schema) => ({ type: 'schema', ...schema })),
  );

const propsToOpenAPISchema = (props: Type) => (env: RouteDeclarationEnv) =>
  parseType({ location: env.decl, type: props, memo: env.memo });

const parametersFromCodecOutputSym = (paramIn: 'query' | 'path') =>
  flow(
    typeOfSymbol,
    RE.chainEitherK((type) =>
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
    RE.chain(
      flow(
        RA.traverse(RE.Applicative)(({ description, name, codec }) =>
          pipe(
            toOpenAPISchema(codec),
            RE.chain((result) =>
              result.type === 'unrepresentable'
                ? RE.left('unrepresentable query param')
                : RE.right(result),
            ),
            RE.map(({ schema, required }) => ({
              name,
              schema,
              required,
              in: paramIn,
              description: description[description.length - 1] ?? '',
            })),
          ),
        ),
      ),
    ),
  );

const propertySymOfBaseDeclaration = (property: string) =>
  pipe(baseDeclarationType, RE.chainEitherK(propertySymOfType(property)));

const stringLiteralValueOfBaseProperty = (property: string) =>
  pipe(
    baseDeclarationType,
    RE.chainEitherK(propertySymOfType(property)),
    RE.chainEitherK((sym) =>
      E.fromNullable(`${sym.getName()} has no declaration`)(sym.getValueDeclaration()),
    ),
    RE.chainEitherK((decl) =>
      Node.isPropertyAssignment(decl)
        ? E.right(decl)
        : E.left(`${decl.getText()} is not property assignment`),
    ),
    RE.chainEitherK((decl) => {
      const init = decl.getInitializer();
      return E.fromNullable(`${decl.getText()} has no initializer`)(init);
    }),
    RE.chainEitherK((init) =>
      Node.isStringLiteral(init)
        ? E.right(init.getLiteralValue())
        : E.left(`${init.getText()} is not string literal`),
    ),
  );

const outputTypeOfDeclaredRequestCodec = pipe(
  propertySymOfBaseDeclaration('request'),
  RE.chainEitherK(initializerForPropertySymbol),
  RE.chain(typeParamOfCodec('O')),
);

const routeSummary = (init: Node) => {
  const sym = init.getSymbol();
  if (!sym) {
    return 'Unknown route';
  } else {
    return (sym.getAliasedSymbol() ?? sym).getName();
  }
};

const routeDescription = (init: Node) => {
  return pipe(
    E.fromNullable('No symbol for initializer')(init.getSymbol()),
    E.chain((sym) =>
      E.fromNullable('No value declaration')(
        (sym.getAliasedSymbol() ?? sym).getValueDeclaration(),
      ),
    ),
    E.chain((decl) => {
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
    E.getOrElse(() => ({ description: '', isPrivate: false })),
  );
};

export const schemaForRouteNode = (memo: any) => (node: Expression<ts.Expression>) =>
  pipe(
    RE.right(routeDescription(node)),
    RE.bind('summary', () => RE.right(routeSummary(node))),
    RE.bind('path', () => stringLiteralValueOfBaseProperty('path')),
    RE.bind('method', () =>
      pipe(
        stringLiteralValueOfBaseProperty('method'),
        RE.map((m) => m.toLowerCase()),
      ),
    ),
    RE.bind('query', () =>
      pipe(
        outputTypeOfDeclaredRequestCodec,
        RE.chainEitherK(propertySymOfType('query')),
        RE.chain(parametersFromCodecOutputSym('query')),
      ),
    ),
    RE.bind('params', () =>
      pipe(
        outputTypeOfDeclaredRequestCodec,
        RE.chainEitherK(propertySymOfType('params')),
        RE.chain(parametersFromCodecOutputSym('path')),
      ),
    ),
    RE.bind('body', () =>
      pipe(
        outputTypeOfDeclaredRequestCodec,
        RE.chainEitherK((typ) =>
          E.fromNullable(`No body property`)(typ.getProperty('body')),
        ),
        RE.map((sym) => sym.getTypeAtLocation(node)),
        RE.chain(propsToOpenAPISchema),
        RE.chain((body) =>
          body.type === 'unrepresentable'
            ? RE.left('unrepresentable body type')
            : RE.right(body),
        ),
        RE.orElseW(() => RE.right(undefined)),
      ),
    ),
    RE.bind('responses', () =>
      pipe(
        baseDeclarationType,
        RE.chainEitherK(propertySymOfType('response')),
        RE.chain(typeOfSymbol),
        RE.map((type) => type.getProperties()),
        RE.chain(
          RA.traverse(RE.Applicative)((sym) =>
            pipe(
              RE.fromEither(initializerForPropertySymbol(sym)),
              RE.chain(toOpenAPISchema),
              RE.chain((response) =>
                response.type === 'unrepresentable'
                  ? RE.left('unrepresentable response')
                  : RE.right(response),
              ),
              RE.bindTo('schema'),
              RE.bind('code', () => {
                const name = sym.getName();
                const statusCode = HttpResponseCodes.hasOwnProperty(name)
                  ? HttpResponseCodes[name as keyof typeof HttpResponseCodes]
                  : undefined;
                return RE.fromEither(
                  E.fromNullable(`unknown response type '${name}`)(statusCode),
                );
              }),
            ),
          ),
        ),
      ),
    ),
  )({ decl: node, memo });

export const apiSpecVersion = (sym: Symbol) =>
  pipe(
    E.fromNullable('no version tag for symbol')(
      sym.getJsDocTags().find((tag) => tag.getName() === 'version'),
    ),
    E.chain((tag) => E.fromNullable('no text for version tag')(tag.getText()[0])),
    E.map((text) => text.text),
    E.getOrElse(() => '0.1.0'),
  );

export const schemaForApiSpec = (memo: any) => (apiSpec: Node) =>
  pipe(
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
        E.chain(schemaForRouteNode(memo)),
      ),
    ),
  );
