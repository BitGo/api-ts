import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import * as R from 'fp-ts/Record';
import * as t from 'io-ts';
import {
  Flattened,
  NestedType,
  NestedOutputType,
  NestedProps,
  OptionalizedC,
  OptionalProps,
  RequiredProps,
  Simplify,
} from './utils';

export const optional = <C extends t.Mixed>(codec: C): t.UnionC<[C, t.UndefinedC]> =>
  t.union([codec, t.undefined]);

export const optionalized = <P extends t.Props>(props: P): OptionalizedC<P> => {
  const requiredProps: t.Props = {};
  const optionalProps: t.Props = {};
  for (const key of Object.keys(props)) {
    const codec = props[key]!;
    const isOptional = codec.is(undefined);
    if (isOptional) {
      optionalProps[key] = codec;
    } else {
      requiredProps[key] = codec;
    }
  }
  return t.intersection([
    t.type(requiredProps) as t.TypeC<RequiredProps<P>>,
    t.partial(optionalProps) as t.PartialC<OptionalProps<P>>,
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
