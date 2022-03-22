import * as E from 'fp-ts/Either';
import * as R from 'fp-ts/Record';
import * as t from 'io-ts';
import { Flattened, FlattenedC, NestedC, PossiblyUndefinedKeys } from './utils';

export const optional = <C extends t.Mixed>(subCodec: C) =>
  t.union([subCodec, t.undefined]);

export const optionalized = <P extends t.Props>(props: P) => {
  const requiredProps: t.Props = {};
  const optionalProps: t.Props = {};
  for (const key in props) {
    if (!props.hasOwnProperty(key)) {
      continue;
    }
    const codec = props[key];
    const isOptional = codec.is(undefined);
    if (isOptional) {
      optionalProps[key] = codec;
    } else {
      requiredProps[key] = codec;
    }
  }
  return t.intersection([
    t.type(requiredProps as Omit<P, PossiblyUndefinedKeys<P>>),
    t.partial(optionalProps as Pick<P, PossiblyUndefinedKeys<P>>),
  ]);
};

export const flattened = <Props extends Record<string, t.Props>>(
  name: string,
  props: Props,
) => {
  let flatProps: Partial<Flattened<Props>> & t.Props = {};
  for (const key in props) {
    if (!props.hasOwnProperty(key)) {
      continue;
    }
    const innerProps = props[key];
    flatProps = { ...flatProps, ...innerProps };
  }
  const flatCodec = t.exact(optionalized(flatProps)) as unknown as FlattenedC<Props>;

  const nestedProps = R.map((innerProps: t.Props) => t.exact(optionalized(innerProps)))(
    props,
  );
  const nestedCodec = t.strict(nestedProps) as unknown as NestedC<Props>;

  return new t.Type<t.TypeOf<FlattenedC<Props>>, t.OutputOf<NestedC<Props>>>(
    name,
    flatCodec.is,
    (input, context) =>
      E.map((nested: t.TypeOf<NestedC<Props>>) => {
        let flattened: Partial<t.TypeOf<FlattenedC<Props>>> = {};
        for (const key in nested) {
          if (!nested.hasOwnProperty(key)) {
            continue;
          }
          flattened = { ...flattened, ...nested[key] };
        }
        return flattened as t.TypeOf<FlattenedC<Props>>;
      })(nestedCodec.validate(input, context)),
    (input) => {
      const nested: Record<string, Record<string, unknown>> = {};
      for (const o in props) {
        if (!props.hasOwnProperty(o)) {
          continue;
        }
        nested[o] = {};
        for (const i in props[o]) {
          if ((input as {}).hasOwnProperty(i)) {
            const codec = props[o][i];
            nested[o][i] = codec.encode((input as any)[i as any]);
          }
        }
      }
      return nested as unknown as t.OutputOf<NestedC<Props>>;
    },
  );
};

export interface LowerBoundedNumberBrand<Lower extends number> {
  readonly LowerBoundedNumber: unique symbol;
  readonly lowerInclusive: Lower;
}

/**
 * Decodes numbers greater than or equal to the lower bound. Rejects values less than the lower bound.
 */
export const LowerBoundedNumber = <Lower extends number>(lowerInclusive: Lower) =>
  t.brand(
    t.number,
    (n): n is t.Branded<number, LowerBoundedNumberBrand<Lower>> => n >= lowerInclusive,
    'LowerBoundedNumber',
  );

export interface UpperBoundedNumberBrand<Upper extends number> {
  readonly UpperBoundedNumber: unique symbol;
  readonly upperInclusive: Upper;
}

/**
 * Decodes numbers less than or equal to the upper bound. Rejects values greater than the upper bound.
 */
export const UpperBoundedNumber = <Upper extends number>(upperInclusive: Upper) =>
  t.brand(
    t.number,
    (n): n is t.Branded<number, UpperBoundedNumberBrand<Upper>> => n <= upperInclusive,
    'UpperBoundedNumber',
  );

/**
 * Decodes numbers between the lower and upper bounds (inclusive). Rejects values outside of the bounds.
 */
export const BoundedNumber = <Lower extends number, Upper extends number>(
  lowerInclusive: Lower,
  upperInclusive: Upper,
) =>
  t.intersection(
    [LowerBoundedNumber(lowerInclusive), UpperBoundedNumber(upperInclusive)],
    'BoundedNumber',
  );
