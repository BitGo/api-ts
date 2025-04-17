# `optionalize`

### Overview

`optionalize` creates a codec for an object type where properties whose codecs can
resolve to `undefined` (typically created using `optional` or
`t.union([..., t.undefined])`) are marked as optional (`?`) in the resulting TypeScript
type.

### Specification

Accepts one argument:

- `props`: (`object`) An object that maps property names to `io-ts` codecs, similar to
  `t.type` or `t.partial`.

Returns a new object codec. The codec effectively combines `t.type` (for required
properties) and `t.partial` (for properties whose codecs include `t.undefined`).

### Usage Example

```typescript
import * as t from 'io-ts';
import { optional, optionalize } from '@api-ts/io-ts-http';

const ItemCodec = optionalize({
  requiredId: t.string,
  optionalValue: optional(t.number), // Uses optional combinator
  maybeDefined: t.union([t.string, t.undefined]), // Also becomes optional
});

// Resulting type:
// type Item = {
//   requiredId: string;
//   optionalValue?: number;
//   maybeDefined?: string;
// }
```
