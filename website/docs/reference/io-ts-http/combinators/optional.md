# `optional`

### Overview

`optional` creates a codec that represents a value of a specified type or `undefined`.
This is useful for marking properties as optional when used with `optionalize`.

### Specification

Accepts one argument:

- `codec`: (`io-ts` Codec) The base codec for the type.

Returns a new codec that represents `t.union([codec, t.undefined])`.

### Usage Example

```typescript
import * as t from 'io-ts';
import { optional } from '@api-ts/io-ts-http';

// Represents: string | undefined
const MaybeString = optional(t.string);
```
