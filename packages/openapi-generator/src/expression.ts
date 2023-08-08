import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';
import { OpenAPIV3_1 } from 'openapi-types';
import { Expression, Node, Symbol } from 'ts-morph';

import { parseType as parseFromType } from './type';
import type { State } from './state';

export type ParseUnrepresentable = {
  type: 'unrepresentable';
  meaning: 'undefined' | 'symbol';
};

export type ParseSchema = {
  type: 'schema';
  schema: OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject;
  required: boolean;
};

export type Result = ParseSchema | ParseUnrepresentable;

function parseFail<A>(err: string): E.Either<string, A> {
  return E.left(err);
}

function unalias(sym: Symbol): Symbol {
  return (sym.getAliasedSymbol() ?? sym).getExportSymbol();
}

function baseSymbol(expr: Expression): E.Either<string, Symbol> {
  const parseResult = E.fromNullable(`No symbol for ${expr.getText()}`);
  if (Node.isIdentifier(expr)) {
    return parseResult(expr.getSymbol());
  } else if (Node.isPropertyAccessExpression(expr)) {
    return parseResult(expr.getNameNode().getSymbol());
  } else if (Node.isCallExpression(expr)) {
    return parseResult(expr.getExpression().getSymbol());
  } else {
    return parseFail(`Could not handle expression ${expr.getText}`);
  }
}

function getJSDoc(baseSym: Symbol): OpenAPIV3_1.SchemaObject {
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
}

function mergeJSDoc(baseSym: Symbol) {
  // Use special cases for adding descriptions to external library types
  return function (result: Result): Result {
    if (result.type === 'unrepresentable') {
      return result;
    }
    return baseSym.getFullyQualifiedName().includes('node_modules')
      ? result
      : {
          type: 'schema',
          required: result.required,
          schema: {
            ...result.schema,
            ...getJSDoc(baseSym),
          },
        };
  };
}

function isIOTSExport(sym: Symbol): boolean {
  return sym.getFullyQualifiedName().includes('io-ts/lib/index');
}

function parseMemo(state: State, baseSym: Symbol): E.Either<string, Result> {
  if (isIOTSExport(baseSym)) {
    // Don't memo any of these
    return E.left(`io-ts codec`);
  }
  const ref = state.visitRef(baseSym);
  return E.right({ type: 'schema', schema: ref, required: true });
}

function parseUnknownCodec(state: State, location: Node): E.Either<string, Result> {
  return pipe(
    E.right(location.getType()),
    E.chain((type) =>
      E.fromNullable(`Not codec ${type.getText()}`)(type.getProperty('_O')),
    ),
    E.map((prop) => prop.getTypeAtLocation(location)),
    E.chain((type) =>
      parseFromType({
        location,
        type,
        parseExpression: (expr) => toOpenAPISchema(state, expr),
      }),
    ),
    E.chain((result) =>
      result.type === 'unrepresentable'
        ? E.left(`unrepresentable codec type`)
        : E.right(result),
    ),
  );
}

function getArguments(location: Expression): E.Either<string, Node[]> {
  return Node.isCallExpression(location)
    ? E.right(location.getArguments())
    : E.left(`Not call expression ${location.getText()}`);
}

function getFirstArgument(location: Expression): E.Either<string, Expression> {
  return pipe(
    getArguments(location),
    E.chain((args) => (args.length > 0 ? E.right(args[0]!) : E.left('No args'))),
    E.filterOrElse(Node.isExpression, (node) => `Node not expression ${node?.getText}`),
  );
}

export function filterUnrepresentable(result: Result): E.Either<string, ParseSchema> {
  return result.type === 'unrepresentable'
    ? E.left(`Unrepresentable ${result.meaning}`)
    : E.right(result);
}

type SpecialCaseMap = {
  [File: string]: {
    [Export: string]: (state: State, location: Expression) => E.Either<string, Result>;
  };
};

const SPECIAL_CASES: SpecialCaseMap = {
  'io-ts/lib/index': {
    array: (state, location) =>
      pipe(
        getFirstArgument(location),
        E.chain((loc) => toOpenAPISchema(state, loc)),
        E.chain(filterUnrepresentable),
        E.map(({ schema }) => {
          return {
            type: 'schema',
            schema: { type: 'array', items: schema },
            required: true,
          };
        }),
      ),
  },
  'io-ts-types/lib/nonEmptyArray': {
    nonEmptyArray: (state, location) =>
      pipe(
        getFirstArgument(location),
        E.chain((loc) => toOpenAPISchema(state, loc)),
        E.chain(filterUnrepresentable),
        E.map(({ schema }) => {
          return {
            type: 'schema',
            schema: { title: 'NonEmptyArray', type: 'array', items: schema },
            required: true,
          };
        }),
      ),
  },
  'io-ts-types/lib/DateFromISOString': {
    DateFromISOString: () =>
      E.right({
        type: 'schema',
        schema: {
          type: 'string',
          format: 'date',
        },
        required: true,
      }),
  },
  'io-ts-http/dist/src/combinators': {
    optional: (state, location) =>
      pipe(
        getFirstArgument(location),
        E.chain((loc) => toOpenAPISchema(state, loc)),
        E.chain(filterUnrepresentable),
        E.map(({ schema }) => {
          return {
            type: 'schema',
            schema: { type: 'array', items: schema },
            required: false,
          };
        }),
      ),
  },
};

function parseSpecialCases(
  state: State,
  baseSym: Symbol,
  location: Expression,
): E.Either<string, Result> {
  const fullName = baseSym.getFullyQualifiedName();
  for (const [file, codecs] of Object.entries(SPECIAL_CASES)) {
    if (fullName.includes(file)) {
      const codecName = baseSym.getExportSymbol().getName();
      for (const [codec, parse] of Object.entries(codecs)) {
        if (codec === codecName) {
          return parse(state, location);
        }
      }
    }
  }
  return parseFail('Not special case');
}

export function toOpenAPISchema(
  state: State,
  expr: Expression,
  noMemo: boolean = false,
): E.Either<string, Result> {
  return pipe(
    baseSymbol(expr),
    E.map(unalias),
    E.chain((sym) =>
      pipe(
        parseSpecialCases(state, sym, expr),
        E.orElse(() => {
          return noMemo ? E.left('noMemo set') : parseMemo(state, sym);
        }),
        E.orElse(() => parseUnknownCodec(state, expr)),
        E.map(mergeJSDoc(sym)),
      ),
    ),
  );
}
