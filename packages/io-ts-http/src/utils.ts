import type * as t from 'io-ts';

type PossiblyUndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export type PossiblyUndefinedProps<T extends t.Props> = {
  [K in keyof T]: undefined extends t.TypeOf<T[K]> ? K : never;
}[keyof T];

type Optionalized<T> = Omit<T, PossiblyUndefinedKeys<T>> &
  Partial<Pick<T, PossiblyUndefinedKeys<T>>>;

export type OptionalProps<Props extends t.Props> = Pick<
  Props,
  PossiblyUndefinedProps<Props>
>;

export type RequiredProps<Props extends t.Props> = Omit<
  Props,
  PossiblyUndefinedProps<Props>
>;

export type OptionalizedC<Props extends t.Props> = t.IntersectionC<
  [t.TypeC<RequiredProps<Props>>, t.PartialC<OptionalProps<Props>>]
>;

export type OutputConstrainedProps<O> = {
  [K: string]: t.Type<any, O, unknown>;
};

export type NestedProps = {
  [K: string]: t.Props;
};

export type NestedType<Props extends NestedProps> = {
  [K in keyof Props]: Optionalized<t.TypeOfProps<Props[K]>>;
};

export type NestedOutputType<Props extends NestedProps> = {
  [K in keyof Props]: Optionalized<t.OutputOfProps<Props[K]>>;
};

export type Flattened<T> = UnionToIntersection<T[keyof T]>;

type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R,
) => any
  ? R
  : never;
