---
sidebar_position: 4
---

# Combinators

Use these `io-ts-http` combinators with `io-ts` codecs to create more expressive types.

## optionalize

Create object types with both required and optional properties easily. This combinator
accepts the same properties as `type` and `partial` in `io-ts`, combining their
functionality. It automatically identifies properties that can be `undefined` and marks
them as optional.

### Example

```typescript
const Item = optionalize({
  necessaryProperty: t.string,
  maybeDefined: t.union([t.string, t.undefined]),
});
```

This creates a codec for:

```typescript
type Item = {
  necessaryProperty: string;
  maybeDefined?: string;
};
```

You could define this same type using a combination of `intersection`, `type`, and
`partial`, but `optionalize` is more readable, especially when combined with the
`optional` combinator.

## optional

Make any codec optional by combining it with `undefined`. This combinator works well
with `optionalize` to clearly show which parameters are optional.

### Example

```typescript
// Creates string | undefined
const Foo = optional(t.string);
```

## flattened

Define codecs that flatten properties when decoding and nest them when encoding.

### Example

```typescript
const Item = flattened({
  first: {
    second: t.string,
  },
});

// When decoded, you get:
type DecodedType = {
  second: string;
};

// When encoded, you get:
type EncodedType = {
  first: {
    second: string;
  };
};
```

You can flatten multiple top-level properties into one object:

```typescript
const Item = flattened({
  foo: {
    fizz: t.string,
  },
  bar: {
    buzz: t.number,
  },
});

// When decoded, you get:
type DecodedType = {
  fizz: string;
  buzz: number;
};

// When encoded, you get:
type EncodedType = {
  foo: {
    fizz: string;
  };
  bar: {
    buzz: number;
  };
};
```

The library tries to prevent you from defining multiple nested properties with the same
key, but it can't catch all cases. If you work around this protection, the behavior is
undefined.
