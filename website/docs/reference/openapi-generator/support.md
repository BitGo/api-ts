# Supported `io-ts` Primitives

When you use the OpenAPI generator, it automatically derives schemas from the following
`io-ts` primitives and combinators:

- `string`
- `number`
- `bigint`
- `boolean`
- `null`
- `nullType`
- `undefined`
- `unknown`
- `any`
- `array`
- `readonlyArray`
- `object`
- `type`
- `partial`
- `exact`
- `strict`
- `record`
- `union`
- `intersection`
- `literal`
- `keyof`
- `brand`
- `UnknownRecord`
- `void`

For codecs not built using these primitives, you may need to define schemas manually.
You can see
[Defining custom codec schemas](./configuration#defining-custom-codec-schemas) for
instructions.
