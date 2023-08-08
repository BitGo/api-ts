import * as swc from '@swc/core';
import * as E from 'fp-ts/Either';

import { parsePlainInitializer } from './codec';
import type { Project } from './project';
import { resolveLiteralOrIdentifier } from './resolveInit';
import { parseRoute, type Route } from './route';
import { SourceFile } from './sourceFile';

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
      result.push(routeResultE.right);
    }
  }

  return E.right(result);
}
