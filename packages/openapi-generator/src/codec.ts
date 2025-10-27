import * as swc from '@swc/core';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/lib/function';

import { leadingComment } from './comments';
import type { Object, Schema } from './ir';
import type { DerefFn } from './knownImports';
import type { Project } from './project';
import { findSymbolInitializer } from './resolveInit';
import type { SourceFile } from './sourceFile';

import type { KnownCodec } from './knownImports';
import { errorLeft } from './error';

type ResolvedIdentifier = Schema | { type: 'codec'; schema: KnownCodec };

function codecIdentifier(
  project: Project,
  source: SourceFile,
  id: swc.Identifier | swc.MemberExpression,
): E.Either<string, ResolvedIdentifier> {
  if (id.type === 'Identifier') {
    const declaration = source.symbols.declarations.find((s) => s.name === id.value);
    if (declaration !== undefined) {
      return E.right({ type: 'ref', name: declaration.name, location: source.path });
    }

    const imp = source.symbols.imports.find((s) => s.localName === id.value);
    if (imp === undefined) {
      return errorLeft(`Unknown identifier ${id.value}`);
    } else if (imp.type === 'star') {
      return errorLeft(`Tried to use star import as codec ${id.value}`);
    }
    const knownImport = project.resolveKnownImport(imp.from, imp.importedName);
    if (knownImport !== undefined) {
      return E.right({ type: 'codec', schema: knownImport });
    }

    if (!imp.from.startsWith('.')) {
      return E.right({ type: 'ref', name: imp.importedName, location: imp.from });
    }

    const initE = findSymbolInitializer(project, source, imp.localName);
    if (E.isLeft(initE)) {
      return initE;
    }
    const [newSourceFile] = initE.right;

    return E.right({
      type: 'ref',
      name: imp.importedName,
      location: newSourceFile.path,
    });
  } else if (id.type === 'MemberExpression') {
    const object = id.object;
    if (object.type !== 'Identifier') {
      if (object.type === 'MemberExpression') {
        // Handle double-nested member expressions
        if (
          object.object.type === 'Identifier' &&
          object.property.type === 'Identifier' &&
          object.property.value === 'keys'
        ) {
          // Handle `Type.keys.propertyName` format
          if (id.property.type === 'Identifier') {
            return E.right({
              type: 'string',
              enum: [id.property.value],
            });
          }
          // Handle `Type.keys["Property Name"]` format (computed property)
          else if (
            id.property.type === 'Computed' &&
            id.property.expression.type === 'StringLiteral'
          ) {
            return E.right({
              type: 'string',
              enum: [id.property.expression.value],
            });
          }
        }

        return errorLeft(
          `Nested member expressions are not supported (${object.object.type}.${object.property.type}.${id.property.type})`,
        );
      }

      return errorLeft(`Unimplemented object type ${object.type}`);
    }

    // Parse member expressions that come from `* as foo` imports
    const starImportSym = source.symbols.imports.find(
      (s) => s.localName === object.value && s.type === 'star',
    );
    if (starImportSym !== undefined) {
      if (id.property.type !== 'Identifier') {
        return errorLeft(`Unimplemented property type ${id.property.type}`);
      }

      const name = id.property.value;
      const knownImport = project.resolveKnownImport(starImportSym.from, name);
      if (knownImport !== undefined) {
        return E.right({ type: 'codec', schema: knownImport });
      }

      if (!starImportSym.from.startsWith('.')) {
        return E.right({ type: 'ref', name, location: starImportSym.from });
      }

      const newInitE = findSymbolInitializer(project, source, [
        starImportSym.localName,
        name,
      ]);
      if (E.isLeft(newInitE)) {
        return newInitE;
      }

      return E.right({ type: 'ref', name, location: newInitE.right[0].path });
    }

    // Parse member expressions that come from `import { foo } from 'foo'` imports
    const objectImportSym = source.symbols.imports.find(
      (s) => s.localName === object.value && s.type === 'named',
    );
    if (objectImportSym !== undefined) {
      if (id.property.type !== 'Identifier') {
        return errorLeft(`Unimplemented property type ${id.property.type}`);
      }
      const name = id.property.value;

      const newInitE = findSymbolInitializer(project, source, [
        objectImportSym.localName,
        name,
      ]);
      if (E.isLeft(newInitE)) {
        return newInitE;
      }
      const [newSourceFile, newInit] = newInitE.right;

      const objectSchemaE = parsePlainInitializer(project, newSourceFile, newInit);
      if (E.isLeft(objectSchemaE)) {
        return objectSchemaE;
      } else if (objectSchemaE.right.type !== 'object') {
        return errorLeft(`Expected object, got '${objectSchemaE.right.type}'`);
      } else if (objectSchemaE.right.properties[name] === undefined) {
        return errorLeft(
          `Unknown property '${name}' in '${objectImportSym.localName}' from '${objectImportSym.from}'`,
        );
      } else {
        return E.right(objectSchemaE.right.properties[name]!);
      }
    }

    if (id.property.type !== 'Identifier') {
      return errorLeft(`Unimplemented property type ${id.property.type}`);
    }

    // Parse locally declared member expressions
    const declarationSym = source.symbols.declarations.find(
      (s) => s.name === object.value,
    );
    if (declarationSym !== undefined) {
      const schemaE = parsePlainInitializer(project, source, declarationSym.init);
      if (E.isLeft(schemaE)) {
        return schemaE;
      } else if (schemaE.right.type !== 'object') {
        return errorLeft(
          `Expected object, got '${schemaE.right.type}' for '${declarationSym.name}'`,
        );
      } else if (schemaE.right.properties[id.property.value] === undefined) {
        return errorLeft(
          `Unknown property '${id.property.value}' in '${declarationSym.name}'`,
        );
      } else {
        return E.right(schemaE.right.properties[id.property.value]!);
      }
    }

    // Parse global expressions
    const knownImport = project.resolveKnownImport(
      'global',
      `${object.value}.${id.property.value}`,
    );
    if (knownImport !== undefined) {
      return E.right({ type: 'codec', schema: knownImport });
    }
  }

  return errorLeft(`Unimplemented identifier type ${id.type}`);
}

function parseObjectExpression(
  project: Project,
  source: SourceFile,
  spanStart: number,
  object: swc.ObjectExpression,
): E.Either<string, Schema> {
  const result: Object = {
    type: 'object',
    properties: {},
    required: [],
  };
  let commentStartIdx = spanStart;
  for (const property of object.properties) {
    if (property.type === 'Identifier') {
      const name = property.value;
      const initE = findSymbolInitializer(project, source, name);
      if (E.isLeft(initE)) {
        return initE;
      }
      const [newSourceFile, init] = initE.right;
      const valueE = parsePlainInitializer(project, newSourceFile, init);
      if (E.isLeft(valueE)) {
        return valueE;
      }
      result.properties[name] = valueE.right;
      result.required.push(name);
      continue;
    } else if (property.type === 'SpreadElement') {
      const schemaE = parsePlainInitializer(project, source, property.arguments);
      if (E.isLeft(schemaE)) {
        return schemaE;
      }
      let schema = schemaE.right;
      if (schema.type === 'ref') {
        const realInitE = findSymbolInitializer(project, source, schema.name);
        if (E.isLeft(realInitE)) {
          return realInitE;
        }
        const schemaE = parsePlainInitializer(
          project,
          realInitE.right[0],
          realInitE.right[1],
        );
        if (E.isLeft(schemaE)) {
          return schemaE;
        }
        schema = schemaE.right;
      }
      if (schema.type !== 'object') {
        return errorLeft(`Spread element must be object`);
      }
      Object.assign(result.properties, schema.properties);
      result.required.push(...schema.required);
      continue;
    } else if (property.type !== 'KeyValueProperty') {
      return errorLeft(`Unimplemented property type ${property.type}`);
    } else if (
      property.key.type !== 'Identifier' &&
      property.key.type !== 'StringLiteral' &&
      property.key.type !== 'NumericLiteral' &&
      property.key.type !== 'Computed'
    ) {
      return errorLeft(`Unimplemented property key type ${property.key.type}`);
    }
    const commentEndIdx = property.key.span.start;
    const comments = leadingComment(
      source.src,
      source.span.start,
      commentStartIdx,
      commentEndIdx,
    );
    commentStartIdx = (property.value as swc.HasSpan).span.end;

    let name: string = '';
    if (property.key.type === 'Computed') {
      const valueE = parseCodecInitializer(project, source, property.key.expression);
      if (E.isLeft(valueE)) {
        return valueE;
      }
      let schema = valueE.right;
      if (schema.type === 'ref') {
        const realInitE = findSymbolInitializer(project, source, schema.name);
        if (E.isLeft(realInitE)) {
          return realInitE;
        }
        const schemaE = parsePlainInitializer(
          project,
          realInitE.right[0],
          realInitE.right[1],
        );
        if (E.isLeft(schemaE)) {
          return schemaE;
        }
        schema = schemaE.right;
      }
      if (
        (schema.type === 'string' || schema.type === 'number') &&
        schema.enum !== undefined
      ) {
        name = String(schema.enum[0]);
      } else {
        return errorLeft('Computed property must be string or number literal');
      }
    } else {
      name = String(property.key.value);
    }

    const valueE = parsePlainInitializer(project, source, property.value);
    if (E.isLeft(valueE)) {
      return valueE;
    }
    result.properties[name] =
      comments.length > 0
        ? { ...valueE.right, comment: comments[comments.length - 1] }
        : valueE.right;
    result.required.push(String(name));
  }
  return E.right(result);
}

function parseArrayExpression(
  project: Project,
  source: SourceFile,
  array: swc.ArrayExpression,
): E.Either<string, Schema> {
  const result: Schema[] = [];
  for (const element of array.elements) {
    if (element === undefined) {
      return errorLeft('Undefined array element');
    }
    const valueE = parsePlainInitializer(project, source, element.expression);
    if (E.isLeft(valueE)) {
      return valueE;
    }
    // swc sometimes sets this to `null` even though it is supposed to be `undefined`
    if (element.spread) {
      let init = valueE.right;
      if (init.type === 'ref') {
        const realInitE = findSymbolInitializer(project, source, init.name);
        if (E.isLeft(realInitE)) {
          return realInitE;
        }
        const schemaE = parsePlainInitializer(
          project,
          realInitE.right[0],
          realInitE.right[1],
        );
        if (E.isLeft(schemaE)) {
          return schemaE;
        }
        init = schemaE.right;
      }
      if (init.type !== 'tuple') {
        return errorLeft('Spread element must be array literal');
      }
      result.push(...init.schemas);
    } else {
      result.push(valueE.right);
    }
  }
  return E.right({ type: 'tuple', schemas: result });
}

function parseTemplateLiteral(
  project: Project,
  source: SourceFile,
  template: swc.TemplateLiteral,
): E.Either<string, Schema> {
  const expressions: E.Either<string, string>[] = template.expressions.map((expr) => {
    const schemaE = parsePlainInitializer(project, source, expr);
    if (E.isLeft(schemaE)) {
      return schemaE;
    }
    const schema = schemaE.right;
    if (
      schema.type === 'string' &&
      schema.enum !== undefined &&
      schema.enum.length === 1
    ) {
      return E.right(String(schema.enum[0]));
    } else if (schema.type === 'ref') {
      const realInitE = findSymbolInitializer(project, source, schema.name);
      if (E.isLeft(realInitE)) {
        return realInitE;
      }
      const schemaE = parsePlainInitializer(
        project,
        realInitE.right[0],
        realInitE.right[1],
      );
      if (E.isLeft(schemaE)) {
        return schemaE;
      }
      if (schemaE.right.type !== 'string' || schemaE.right.enum === undefined) {
        return errorLeft('Template element must be string literal');
      }
      return E.right(String(schemaE.right.enum[0]));
    } else {
      return errorLeft('Template element must be string literal');
    }
  });

  return pipe(
    expressions,
    E.sequenceArray,
    E.flatMap((literals) => {
      const quasis = template.quasis.map((quasi) => quasi.cooked);
      const result = quasis.reduce(
        (acc, quasi, index) => {
          if (index < literals.length) {
            acc.push(quasi ?? '', literals[index]!);
          } else {
            acc.push(quasi ?? '');
          }
          return acc;
        },
        [] as (string | Schema)[],
      );

      return E.right({
        type: 'string',
        enum: [result.join('')],
      });
    }),
  );
}

export function parsePlainInitializer(
  project: Project,
  source: SourceFile,
  init: swc.Expression,
): E.Either<string, Schema> {
  if (init.type === 'ObjectExpression') {
    return parseObjectExpression(project, source, init.span.start, init);
  } else if (init.type === 'ArrayExpression') {
    return parseArrayExpression(project, source, init);
  } else if (init.type === 'StringLiteral') {
    return E.right({ type: 'string', enum: [init.value] });
  } else if (init.type === 'NumericLiteral') {
    return E.right({ type: 'number', enum: [init.value] });
  } else if (init.type === 'BooleanLiteral') {
    return E.right({ type: 'boolean', enum: [init.value] });
  } else if (init.type === 'NullLiteral') {
    return E.right({ type: 'null', enum: [null] });
  } else if (init.type === 'Identifier' && init.value === 'undefined') {
    return E.right({ type: 'undefined' });
  } else if (init.type === 'TsConstAssertion' || init.type === 'TsAsExpression') {
    return parsePlainInitializer(project, source, init.expression);
  } else if (init.type === 'TemplateLiteral') {
    return parseTemplateLiteral(project, source, init);
  } else if (
    init.type === 'Identifier' ||
    init.type === 'MemberExpression' ||
    init.type === 'CallExpression'
  ) {
    return parseCodecInitializer(project, source, init);
  } else {
    return E.right({ type: 'any' });
  }
}

function parseFunctionBody(
  project: Project,
  source: SourceFile,
  func: swc.ArrowFunctionExpression,
): E.Either<string, Schema> {
  if (func.body === undefined) {
    return errorLeft('Function body is undefined');
  }
  if (func.body.type === 'BlockStatement') {
    const returnStmt = func.body.stmts.find((s) => s.type === 'ReturnStatement');
    if (!returnStmt || returnStmt.type !== 'ReturnStatement') {
      return errorLeft('BlockStatement must contain a return statement');
    }
    if (!returnStmt.argument) {
      return errorLeft('Return statement must have an argument');
    }
    return parseCodecInitializer(project, source, returnStmt.argument);
  }
  return parseCodecInitializer(project, source, func.body);
}

export function parseCodecInitializer(
  project: Project,
  source: SourceFile,
  init: swc.Expression,
): E.Either<string, Schema> {
  if (init.type === 'Identifier' || init.type === 'MemberExpression') {
    const identifierE = codecIdentifier(project, source, init);
    if (E.isLeft(identifierE)) {
      return identifierE;
    }
    const identifier = identifierE.right;

    if (identifier.type !== 'codec') {
      return E.right(identifier);
    }

    const deref: DerefFn = () => E.left('Unimplemented deref');
    return identifier.schema(deref);
  } else if (init.type === 'CallExpression') {
    const callee = init.callee;
    if (callee.type !== 'Identifier' && callee.type !== 'MemberExpression') {
      return errorLeft(`Unimplemented callee type ${callee.type}`);
    }

    let calleeName: string | [string, string] | undefined;
    if (callee.type === 'Identifier') {
      calleeName = callee.value;
    } else if (
      callee.object.type === 'Identifier' &&
      callee.property.type === 'Identifier'
    ) {
      calleeName = [callee.object.value, callee.property.value];
    }

    if (calleeName !== undefined) {
      const calleeInitE = findSymbolInitializer(project, source, calleeName);
      if (E.isRight(calleeInitE)) {
        const [calleeSourceFile, calleeInit] = calleeInitE.right;
        if (calleeInit !== null && calleeInit.type === 'ArrowFunctionExpression') {
          return parseFunctionBody(project, calleeSourceFile, calleeInit);
        }
      }
    }

    const identifierE = codecIdentifier(project, source, callee);
    if (E.isLeft(identifierE)) {
      return identifierE;
    }
    const identifier = identifierE.right;

    if (identifier.type !== 'codec') {
      return E.right(identifier);
    }

    function deref(schema: Schema): E.Either<string, Schema> {
      if (schema.type !== 'ref') {
        return E.right(schema);
      } else {
        let refSource = project.get(schema.location);

        if (refSource === undefined) {
          // schema.location might be a package name -> need to resolve the path from the project types
          const path = project.getTypes()[schema.name];
          if (path === undefined)
            return errorLeft(
              `Cannot find external codec '${schema.name}' from module '${schema.location}'. ` +
                `To fix this, add the codec definition to your codec config file. ` +
                `See: https://github.com/BitGo/api-ts/tree/master/packages/openapi-generator#4-defining-custom-codecs`,
            );
          refSource = project.get(path);
          if (refSource === undefined) {
            return errorLeft(`Cannot find '${schema.name}' from '${schema.location}'`);
          }
        }
        const initE = findSymbolInitializer(project, refSource, schema.name);
        if (E.isLeft(initE)) {
          return initE;
        }
        const [newSourceFile, init, comment] = initE.right;
        const plainInitE = parsePlainInitializer(project, newSourceFile, init);

        if (E.isLeft(plainInitE)) return plainInitE;
        if (comment !== undefined) plainInitE.right.comment = comment;

        return plainInitE;
      }
    }
    const args = init.arguments.map<E.Either<string, Schema>>(({ expression }) => {
      return parsePlainInitializer(project, source, expression);
    });

    return pipe(
      args,
      E.sequenceArray,
      E.chain((args) => pipe(args.map(deref), E.sequenceArray)),
      E.chain((args) => identifier.schema(deref, ...args)),
    );
  } else {
    return errorLeft(`Unimplemented initializer type ${init.type}`);
  }
}
