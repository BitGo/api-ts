import * as swc from '@swc/core';
import * as E from 'fp-ts/Either';
import type { Block } from 'comment-parser';

import { parsePlainInitializer } from './codec';
import type { Project } from './project';
import { resolveLiteralOrIdentifier } from './resolveInit';
import { RouteWithGenerate, parseRoute, type Route } from './route';
import { SourceFile } from './sourceFile';
import { OpenAPIV3 } from 'openapi-types';

export function parseApiSpec(
  project: Project,
  sourceFile: SourceFile,
  expr: swc.Expression,
): E.Either<string, Route[]> {
  if (expr.type !== 'ObjectExpression') {
    return E.left(`unimplemented route expression type ${expr.type}`);
  }

  const result: Route[] = [];
  for (const apiAction of Object.values(expr.properties)) {
    if (apiAction.type === 'SpreadElement') {
      const spreadExprE = resolveLiteralOrIdentifier(
        project,
        sourceFile,
        apiAction.arguments,
      );
      if (E.isLeft(spreadExprE)) {
        return spreadExprE;
      }
      let [spreadSourceFile, spreadExpr] = spreadExprE.right;
      // TODO: This is just assuming that a `CallExpression` here is to `h.apiSpec`
      if (spreadExpr.type === 'CallExpression') {
        const arg = spreadExpr.arguments[0];
        if (arg === undefined) {
          return E.left(`unimplemented spread argument type ${arg}`);
        }
        spreadExpr = arg.expression;
      }
      const spreadSpecE = parseApiSpec(project, spreadSourceFile, spreadExpr);
      if (E.isLeft(spreadSpecE)) {
        return spreadSpecE;
      }
      result.push(...spreadSpecE.right);
      continue;
    }

    if (apiAction.type !== 'KeyValueProperty') {
      return E.left(`unimplemented route property type ${apiAction.type}`);
    }
    const routes = apiAction.value;
    const routesInitE = resolveLiteralOrIdentifier(project, sourceFile, routes);
    if (E.isLeft(routesInitE)) {
      return routesInitE;
    }
    const [routesSource, routesInit] = routesInitE.right;
    if (routesInit.type !== 'ObjectExpression') {
      return E.left(`unimplemented routes type ${routes.type}`);
    }
    for (const route of Object.values(routesInit.properties)) {
      if (route.type !== 'KeyValueProperty') {
        return E.left(`unimplemented route type ${route.type}`);
      }
      const routeExpr = route.value;
      const routeInitE = resolveLiteralOrIdentifier(project, routesSource, routeExpr);
      if (E.isLeft(routeInitE)) {
        return routeInitE;
      }
      const [routeSource, routeInit, comment] = routeInitE.right;
      const codecE = parsePlainInitializer(project, routeSource, routeInit);
      if (E.isLeft(codecE)) {
        return codecE;
      }
      if (comment !== undefined) {
        codecE.right.comment = comment;
      }
      const routeResultE = parseRoute(project, codecE.right);
      if (E.isLeft(routeResultE)) {
        return routeResultE;
      }

      const stripRouteWithGenerate = (route: RouteWithGenerate): Route => {
        const { generate, ...rest } = route;
        return rest;
      };

      if (routeResultE.right.generate)
        result.push(stripRouteWithGenerate(routeResultE.right));
    }
  }

  return E.right(result);
}

export function parseApiSpecComment(
  comment: Block | undefined,
): OpenAPIV3.ServerObject | undefined {
  if (comment === undefined) {
    return undefined;
  }
  const description = comment.description;
  const url = comment.tags.find((tag) => tag.tag === 'url')?.name;
  return url !== undefined ? { url, description } : undefined;
}
