import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import * as RE from 'fp-ts/ReaderEither';
import { OpenAPIV3_1 } from 'openapi-types';
import { Expression, Node, Symbol } from 'ts-morph';

import { parseType as parseFromType } from './type';

type Env = {
  memo: { [K: string]: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject };
};

type Result = {
  schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
  required: boolean;
};

type ParseStep<A = Result> = RE.ReaderEither<Env, string, A>;

const parseFail = (err: string): ParseStep<never> => RE.left(err);

// Why is this not in RE?
const parseUndefined =
  (onUndefined: string) =>
  <T>(result: T | undefined): ParseStep<T> =>
    RE.fromEither(E.fromNullable(onUndefined)(result));

const unalias = (sym: Symbol) => (sym.getAliasedSymbol() ?? sym).getExportSymbol();

const baseSymbol = (expr: Expression): ParseStep<Symbol> => {
  const parseResult = parseUndefined(`No symbol for ${expr.getText()}`);
  if (Node.isIdentifier(expr)) {
    return parseResult(expr.getSymbol());
  } else if (Node.isPropertyAccessExpression(expr)) {
    return parseResult(expr.getNameNode().getSymbol());
  } else if (Node.isCallExpression(expr)) {
    return parseResult(expr.getExpression().getSymbol());
  } else {
    return parseFail(`Could not handle expression ${expr.getText}`);
  }
};

const getJSDoc = (baseSym: Symbol): OpenAPIV3_1.SchemaObject => {
  const result: OpenAPIV3_1.SchemaObject = {};
  baseSym.getJsDocTags().forEach((tag) => {
    switch (tag.getName()) {
      case 'example':
        {
          const text = tag.getText();
          result.example = text[text.length - 1]?.text;
        }
        break;
      case 'summary': {
        // TODO: regular tag
        const text = tag.getText();
        result.description = text[text.length - 1]?.text;
      }
    }
  });
  return result;
};

const mergeJSDoc =
  (baseSym: Symbol) =>
  // Use special cases for adding descriptions to external library types
  (result: Result): Result =>
    baseSym.getFullyQualifiedName().includes('node_modules')
      ? result
      : {
          required: result.required,
          schema: {
            ...result.schema,
            ...getJSDoc(baseSym),
          },
        };

const isIOTSExport = (sym: Symbol) =>
  sym.getFullyQualifiedName().includes('io-ts/lib/index');

const parseMemo =
  (baseSym: Symbol): ParseStep =>
  (env: Env) => {
    if (isIOTSExport(baseSym)) {
      // Don't memo any of these
      return E.left(`io-ts codec`);
    }
    const name = baseSym.getName();
    return pipe(
      E.fromNullable(`No declaration for ${baseSym.getName()}`)(
        baseSym.getValueDeclaration(),
      ),
      E.chain((decl) => parseUnknownCodec(decl)(env)),
      E.map(({ schema, required }) => {
        if (!env.memo[name]) {
          env.memo[name] = {
            title: name,
            ...schema,
          };
        }
        return { schema: { $ref: `#/components/schemas/${name}` }, required };
      }),
      E.mapLeft((err) => {
        if (!env.memo[name]) {
          env.memo[name] = {
            title: name,
            description: `Error: ${err}`,
          };
        }
        return err;
      }),
    );
  };

const parseUnknownCodec = (location: Node): ParseStep =>
  pipe(
    RE.right(location.getType()),
    RE.chainEitherK((type) =>
      E.fromNullable(`Not codec ${type.getText()}`)(type.getProperty('_O')),
    ),
    RE.map((prop) => prop.getTypeAtLocation(location)),
    RE.chain(
      (type) =>
        ({ memo }: Env) =>
          parseFromType({ location, type, memo }),
    ),
    RE.chain((result) =>
      result.type === 'unrepresentable'
        ? RE.left(`unrepresentable codec type`)
        : RE.right(result),
    ),
  );

const getArguments = (location: Expression): ParseStep<Node[]> =>
  Node.isCallExpression(location)
    ? RE.right(location.getArguments())
    : RE.left(`Not call expression ${location.getText()}`);

const getFirstArgument = (location: Expression): ParseStep<Expression> =>
  pipe(
    getArguments(location),
    RE.chain((args) => (args.length > 0 ? RE.right(args[0]!) : RE.left('No args'))),
    RE.filterOrElse(
      Node.isExpression,
      (node) => `Node not expression ${node?.getText}`,
    ),
  );

type SpecialCaseMap = {
  [File: string]: {
    [Export: string]: (location: Expression) => ParseStep;
  };
};

const SPECIAL_CASES: SpecialCaseMap = {
  'io-ts/lib/index': {
    array: (location) =>
      pipe(
        getFirstArgument(location),
        RE.chain(toOpenAPISchema),
        RE.map(({ schema }) => ({
          schema: { type: 'array', items: schema },
          required: true,
        })),
      ),
  },
  'io-ts-types/lib/nonEmptyArray': {
    nonEmptyArray: (location) =>
      pipe(
        getFirstArgument(location),
        RE.chain(toOpenAPISchema),
        RE.map(({ schema }) => ({
          schema: { title: 'NonEmptyArray', type: 'array', items: schema },
          required: true,
        })),
      ),
  },
  'query-param-types/dist/src/index': {
    nonEmptyArrayFromQueryParam: (location) =>
      pipe(
        getFirstArgument(location),
        RE.chain(toOpenAPISchema),
        RE.map(({ schema }) => ({
          schema: {
            title: 'NonEmptyArrayFromQueryParam',
            type: 'array',
            items: schema,
          },
          required: true,
        })),
      ),
  },
  'io-ts-types/lib/DateFromISOString': {
    DateFromISOString: () =>
      RE.right({
        schema: {
          type: 'string',
          format: 'date',
        },
        required: true,
      }),
  },
  'io-ts-http/dist/src/combinators': {
    optional: (location) =>
      pipe(
        getFirstArgument(location),
        RE.chain(toOpenAPISchema),
        RE.map(({ schema }) => ({
          schema,
          required: false,
        })),
      ),
  },
};

const parseSpecialCases = (baseSym: Symbol, location: Expression): ParseStep => {
  // TODO: actually parse this instead of blind match
  const fullName = baseSym.getFullyQualifiedName();
  for (const [file, codecs] of Object.entries(SPECIAL_CASES)) {
    if (fullName.includes(file)) {
      const codecName = baseSym.getExportSymbol().getName();
      for (const [codec, parse] of Object.entries(codecs)) {
        if (codec === codecName) {
          return parse(location);
        }
      }
    }
  }
  return parseFail('Not special case');
};

export const toOpenAPISchema = (expr: Expression): ParseStep =>
  pipe(
    baseSymbol(expr),
    RE.map(unalias),
    RE.chain((sym) =>
      pipe(
        parseSpecialCases(sym, expr),
        RE.orElse(() => parseMemo(sym)),
        RE.orElse(() => parseUnknownCodec(expr)),
        RE.map(mergeJSDoc(sym)),
      ),
    ),
  );
