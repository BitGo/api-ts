import type * as t from 'io-ts';

export type OutputConstrainedProps<O> = {
  [K: string]: t.Type<any, O, unknown>;
};

export type HasProp<Key extends string> = { [K in Key]: any };
export type DerefProp<T, Key extends string, Fallback = never> = T extends HasProp<Key>
  ? T[Key]
  : Fallback;

export type PossiblyUndefinedKeys<T extends t.Props> = {
  [K in keyof T]: undefined extends t.TypeOf<T[K]> ? K : never;
}[keyof T];

export type NestedObject<Self extends NestedObject<Self>> = {
  [O in keyof Self]: Omit<Self[O], keyof Flattened<Omit<Self, O>>>;
};

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R,
) => any
  ? R
  : never;

export type Flattened<N> = UnionToIntersection<N[keyof N]>;

export type OptionalizedC<Props extends t.Props> = t.IntersectionC<
  [
    t.TypeC<Omit<Props, PossiblyUndefinedKeys<Props>>>,
    t.PartialC<Pick<Props, PossiblyUndefinedKeys<Props>>>,
  ]
>;

export type NestedC<Self extends Record<string, t.Props>> = t.TypeC<{
  [O in keyof Self]: OptionalizedC<Self[O]>;
}>;

export type FlattenedC<Self extends Record<string, t.Props>> =
  Flattened<Self> extends t.Props ? OptionalizedC<Flattened<Self>> : never;

/**
 * Returns the power set of type T, where fields in the type are considered set items. The power set of a
 * set S is the set of all subsets of S. Translating that here, it gives a union of every field combination
 * of the input type, including the empty object {}.
 *
 * Example:
 *
 * FieldPowerSet<{ a: number, b: string }> = {} | { a: number } | { b: string } | { a: number, b: string }
 */
export type FieldPowerSet<T> = keyof T extends never
  ? {}
  : {
      [K in keyof T]: {
        with: Pick<T, K> & FieldPowerSet<Omit<T, K>>;
        without: FieldPowerSet<Omit<T, K>>;
      };
    }[keyof T]['with' | 'without'];
