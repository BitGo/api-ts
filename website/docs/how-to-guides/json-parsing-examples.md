# JSON Parsing with Codecs

This guide demonstrates how to parse and validate JSON data using api-ts codecs.

## Basic JSON Parsing

Here's how to parse and validate JSON data using codecs:

```typescript
import * as t from 'io-ts'
import { httpRequest } from '@api-ts/io-ts-http'

// Define a codec for the expected structure
const UserCodec = t.type({
  name: t.string,
  age: t.number
})

// Create an HTTP request codec that parses JSON
const UserRequest = httpRequest({
  body: UserCodec
})

// Usage examples
const validJson = '{"name": "Alice", "age": 30}'
const invalidJson = '{"name": "Bob"}' // Missing age field

// Decode and validate
UserRequest.request.decode(validJson)
// Right({ name: "Alice", age: 30 })

UserRequest.request.decode(invalidJson)
// Left([{ value: { name: "Bob" }, message: "required property 'age'" }])
```

## Date Transformations

For handling dates in JSON:

```typescript
import { DateFromISOString } from 'io-ts-types'

const UserWithDateCodec = t.type({
  name: t.string,
  birthDate: DateFromISOString
})

const input = '{"name": "Alice", "birthDate": "1990-01-01T00:00:00.000Z"}'
UserWithDateCodec.decode(JSON.parse(input))
// Right({ name: "Alice", birthDate: Date(1990-01-01) })
```
