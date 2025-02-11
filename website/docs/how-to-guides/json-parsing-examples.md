# JSON Parsing with api-ts

Learn how to parse and validate JSON data using api-ts codecs.

## Basic Example

Here's how to parse and validate JSON using api-ts:

```typescript
import * as t from 'io-ts'
import { httpRequest } from '@api-ts/io-ts-http'

// Define the request structure
const UserRequest = httpRequest({
  body: t.type({
    name: t.string,
    age: t.number
  })
})

// Parse and validate JSON
const validJson = '{"name": "Alice", "age": 30}'
const result = UserRequest.request.decode(validJson)
// Success: { name: "Alice", age: 30 }

const invalidJson = '{"name": "Bob"}' // Missing age
UserRequest.request.decode(invalidJson)
// Error: required property 'age'
```

## Working with Dates

For handling dates in JSON:

```typescript
import { DateFromISOString } from 'io-ts-types'

const UserWithDate = httpRequest({
  body: t.type({
    name: t.string,
    birthDate: DateFromISOString
  })
})

const input = '{"name": "Alice", "birthDate": "1990-01-01T00:00:00.000Z"}'
UserWithDate.request.decode(input)
// Success: { name: "Alice", birthDate: Date(1990-01-01) }
```

The library handles JSON parsing and validation in one step, providing type-safe results.
