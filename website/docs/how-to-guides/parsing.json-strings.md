# How To Parse JSON Strings Declaratively

## Declarative JSON Parsing and Validation

```typescript
import * as t from 'io-ts';
import { JsonFromString } from 'io-ts-types';

// Define the expected structure
const UserCodec = t.type({
  name: t.string,
  age: t.number,
  email: t.string,
});

const Data = '{"name": "Alice", "age": 30, "email": "alice@example.com"}';

// Combine parsing and validation declaratively
const decoded = JsonFromString.decode(Data);

// Check if the decoding was successful
if (decoded._tag === 'Right') {
  // Validate the decoded data using the UserCodec
  const validated = UserCodec.decode(decoded.right);
  console.log(validated); // Right { name: 'Alice', age: 30, email: '
} else {
  console.error('Decoding failed:', decoded.left);
}

```
