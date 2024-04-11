import { pipe } from 'fp-ts/pipeable';
import * as E from 'fp-ts/Either';
import * as R from 'fp-ts/Record';
import * as t from 'io-ts';
import {
  DefinedValues,
  Flattened,
  NestedType,
  NestedOutputType,
  NestedProps,
  OptionalizedC,
  OptionalProps,
  RequiredProps,
  Simplify,
} from './utils';

const partialWithoutUndefined = <P extends t.Props>(
  props: P,
  name?: string,
): t.PartialType<
  P,
  DefinedValues<t.TypeOfPartialProps<P>>,
  DefinedValues<t.OutputOfPartialProps<P>>,
  unknown
> => {
  const partialCodec = t.partial(props, name);
  return new t.PartialType(
    partialCodec.name,
    (i): i is DefinedValues<t.TypeOfPartialProps<P>> =>
      partialCodec.is(i) && !Object.values(i).includes(void 0),
    (i, ctx) => {
      return pipe(
        partialCodec.validate(i, ctx),
        E.map((result) => {
          for (const key of Object.keys(result)) {
            if (result[key] === void 0) {
              delete result[key];
            }
          }
          return result as DefinedValues<t.TypeOfPartialProps<P>>;
        }),
      );
    },
    (a) => {
      const result = partialCodec.encode(a);
      if (result === undefined) {
        // `t.partial` will return this when passed `undefined` even though it is not in the type
        return result;
      }
      for (const key of Object.keys(result)) {
        if (result[key] === void 0) {
          delete result[key];
        }
      }
      return result as DefinedValues<t.OutputOfPartialProps<P>>;
    },
    props,
  );
};

export const optional = <C extends t.Mixed>(codec: C): t.UnionC<[C, t.UndefinedC]> =>
  t.union([codec, t.undefined]);

export const optionalized = <P extends t.Props>(
  props: P,
  name?: string,
): OptionalizedC<P> => {
  const requiredProps: t.Props = {};
  const optionalProps: t.Props = {};
  for (const key of Object.keys(props)) {
    const codec = props[key]!;
    const isOptional = codec.is(void 0);
    if (isOptional) {
      optionalProps[key] = codec;
    } else {
      requiredProps[key] = codec;
    }
  }
  return t.intersection([
    t.type(requiredProps, name ? `required_${name}` : undefined) as t.TypeC<
      RequiredProps<P>
    >,
    t.partial(optionalProps, name ? `optional_${name}` : undefined) as t.PartialC<
      OptionalProps<P>
    >,
  ]);
};

export const exactOptionalized = <P extends t.Props>(
  props: P,
  name?: string,
): OptionalizedC<P> => {
  const requiredProps: t.Props = {};
  const optionalProps: t.Props = {};
  for (const key of Object.keys(props)) {
    const codec = props[key]!;
    const isOptional = codec.is(void 0);
    if (isOptional) {
      optionalProps[key] = codec;
    } else {
      requiredProps[key] = codec;
    }
  }
  return t.intersection([
    t.type(requiredProps, name ? `required_${name}` : undefined) as t.TypeC<
      RequiredProps<P>
    >,
    partialWithoutUndefined(
      optionalProps,
      name ? `optional_${name}` : undefined,
    ) as t.PartialC<OptionalProps<P>>,
  ]);
};

export const flattened = <Props extends NestedProps>(
  name: string,
  props: Props,
): t.Type<
  Simplify<Flattened<NestedType<Props>>>,
  Simplify<NestedOutputType<Props>>
> => {
  let flatProps: t.Props = {};
  for (const key in props) {
    if (!props.hasOwnProperty(key)) {
      continue;
    }
    const innerProps = props[key];
    flatProps = { ...flatProps, ...innerProps };
  }
  const flatCodec = t.exact(optionalized(flatProps));

  const nestedProps = R.map((innerProps: t.Props) => t.exact(optionalized(innerProps)))(
    props,
  );
  const nestedCodec = t.strict(nestedProps);

  return new t.Type(
    name,
    flatCodec.is as any,
    (input, context) =>
      pipe(
        nestedCodec.validate(input, context),
        E.map((nested) => {
          let flattened = {};
          for (const key in nested) {
            if (!nested.hasOwnProperty(key)) {
              continue;
            }
            flattened = { ...flattened, ...nested[key] };
          }
          return flattened as Simplify<Flattened<NestedType<Props>>>;
        }),
      ),
    (input: any) => {
      const nested: Record<string, any> = {};
      for (const o in props) {
        if (!props.hasOwnProperty(o)) {
          continue;
        }
        nested[o] = {};
        for (const i in props[o]) {
          if ((input as {}).hasOwnProperty(i)) {
            const codec = props[o]![i]!;
            nested[o]![i] = codec.encode(input[i]);
          }
        }
      }
      return nested as Simplify<NestedOutputType<Props>>;
    },
  );
};
