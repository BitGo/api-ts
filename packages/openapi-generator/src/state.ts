import type { OpenAPIV3_1 } from 'openapi-types';
import { Symbol } from 'ts-morph';

export class State {
  private knownRefs: Set<string> = new Set();
  private refQueue: Symbol[] = [];

  visitRef = (ref: Symbol): OpenAPIV3_1.ReferenceObject => {
    const unaliasedName = ref.getFullyQualifiedName();
    if (!this.knownRefs.has(unaliasedName)) {
      this.knownRefs.add(unaliasedName);
      this.refQueue.push(ref);
    }
    return {
      $ref: `#/components/schemas/${ref.getName()}`,
    };
  };

  dequeueRef = (): Symbol | undefined => {
    return this.refQueue.shift();
  };
}
