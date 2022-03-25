# Combinators

`io-ts-http` currently exports a handful of combinators for `io-ts` codecs.

## `optionalize`

Provides an easy way to define object types with some required and some optional
properties. It accepts the same props that `type` and `partial` do in `io-ts`, and
behaves like a combination of the two. It works by figuring out which properties are
capable of being `undefined`, and marking them as optional. For example:

```typescript
const Item = optionalize({
  necessaryProperty: t.string,
  maybeDefined: t.union([t.string, t.undefined]),
});
```

defines a codec for the following type:

```typescript
type Item = {
  necessaryProperty: string;
  maybeDefined?: string;
};
```

This same type could be defined with a combination of `intersection`, `type`, and
`partial`, however it is much easier to read, especially when combined with the next
combinator.

## `optional`

Designed to be paired with `optionalize` for readability. It accepts a codec and unions
it with undefined. Thus:

```typescript
// typeof Foo = string | undefined
const Foo = optional(t.string);
```

When used with `optionalize` it becomes easy to see which parameters are optional.

## `flattened`

Allows codecs to be defined where properties are flattened on decode and nested on
encode. To illustrate:

```typescript
const Item = flattened({
  first: {
    second: t.string,
  },
});

type DecodedType = {
  second: string;
};

type EncodedType = {
  first: {
    second: string;
  };
};
```

You can have multiple top-level properties flattened into one object.

```typescript
const Item = flattened({
  foo: {
    fizz: t.string,
  },
  bar: {
    buzz: t.number,
  },
});

type DecodedType = {
  fizz: string;
  buzz: number;
};

type EncodedType = {
  foo: {
    fizz: string;
  };
  bar: {
    buzz: number;
  };
};
```

The library tries to statically prevent defining multiple nested properties with the
same key, but can't in all cases. If this is worked around, then it is undefined
behavior.
