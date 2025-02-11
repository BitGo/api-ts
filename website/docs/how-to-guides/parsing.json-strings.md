# How To Parse JSON Strings Declaratively

## Declarative JSON Parsing and Validation
```typescript
import * as t from 'io-ts'
import { JSONFromString } from 'io-ts-types'

// Define the expected structure
const UserCodec = t.type({
  name: t.string,
  age: t.number,
  email: t.string
})

const Data = '{"name": "Alice", "age": 30, "email": "alice@example.com"}'

// Combine parsing and validation declaratively
const decoded = JSONFromString(UserCodec).decode(Data)

if (decoded._tag === 'Right') {
  // Success: Valid data
  console.log(decoded.right) // Parsed and validated data
} else {
  // Error: Invalid data
  console.error(decoded.left) // Validation error details
}
```