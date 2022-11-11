import type * as t from 'io-ts';

type Defined<T> = T extends undefined ? never : T;

export type DefinedValues<T> = {
  [K in keyof T]: Defined<T[K]>;
};

type DefinedProps<Props extends t.Props> = {
  [K in keyof Props]: Props[K] extends t.Type<infer A, infer O, infer I>
    ? t.Type<Defined<A>, O, I>
    : never;
};

type PossiblyUndefinedKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export type PossiblyUndefinedProps<T extends t.Props> = {
  [K in keyof T]: undefined extends t.TypeOf<T[K]> ? K : never;
}[keyof T];

type Optionalized<T> = Simplify<
  Omit<T, PossiblyUndefinedKeys<T>> &
    Partial<DefinedValues<Pick<T, PossiblyUndefinedKeys<T>>>>
>;

export type OptionalProps<Props extends t.Props> = DefinedProps<
  Pick<Props, PossiblyUndefinedProps<Props>>
>;

export type RequiredProps<Props extends t.Props> = Omit<
  Props,
  PossiblyUndefinedProps<Props>
>;

export type OptionalizedC<Props extends t.Props> = t.IntersectionC<
  [t.TypeC<RequiredProps<Props>>, t.PartialC<OptionalProps<Props>>]
>;

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

export type Simplify<T> = T extends unknown ? { [K in keyof T]: T[K] } : never;
