# `flattened`

### Overview

The `flattened` combinator creates a codec that decodes a nested structure into a flat
object back into a nested structure.

### Specification

Accepts two arguments:

- `name`: (`string`) A name for the codec, used in error messages.
- `nestedProps`: (`object`) An object that defines the encoded nested structure. Each
  key represents a top-level property in the encoded form, and its value is an object
  that maps the nested keys to their `io-ts` codecs.

Returns a new codec.

### Behavior

- Decoding: Takes the nested input (matching the `nestedProps` structure) and outputs a
  flat object that contains all the inner properties.
- Encoding: Takes the flat object (containing keys from the inner structures) and
  outputs the nested structure defined by `nestedProps`.

### Caveats

- Defining multiple nested properties with the same name across different top-level keys
  can lead to undefined behavior. The library tries to prevent this where statically.

### Usage Example

```typescript
import * as t from 'io-ts';
import { flattened } from '@api-ts/io-ts-http';

const FlatCodec = flattened('FlatCodec', {
  metadata: {
    // Top-level key in encoded form
    id: t.string,
    createdAt: t.string, // Assume DateFromString etc. if needed
  },
  payload: {
    // Another top-level key in encoded form
    value: t.number,
  },
});

// Decoded type:
// type Decoded = {
//   id: string;
//   createdAt: string;
//   value: number;
// };

// Encoded type (Input for decode, Output for encode):
// type Encoded = {
//   metadata: {
//     id: string;
//     createdAt: string;
//   };
//   payload: {
//     value: number;
//   };
// };
```
