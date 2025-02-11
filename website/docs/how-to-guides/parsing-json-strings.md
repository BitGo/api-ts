# Parsing JSON Strings with api-ts

Learn how to parse and validate JSON strings using api-ts codecs.

## Basic JSON String Parsing

The most basic use case is parsing a JSON string and validating its structure:

```typescript
import * as t from 'io-ts'

// Define the expected structure
const UserCodec = t.type({
  name: t.string,
  age: t.number,
  email: t.string
})

// Parse JSON string and validate structure
const jsonString = '{"name": "Alice", "age": 30, "email": "alice@example.com"}'

// First parse the JSON string
const parsed = JSON.parse(jsonString)

// Then validate the parsed data
const result = UserCodec.decode(parsed)
// Success: { name: "Alice", age: 30, email: "alice@example.com" }

// Example with invalid data
const invalidJson = '{"name": "Bob", "age": "30"}' // age should be number
const invalidParsed = JSON.parse(invalidJson)
const invalidResult = UserCodec.decode(invalidParsed)
// Error: Invalid value "30" supplied to : { name: string, age: number, email: string }/age: number
```

## Advanced Transformations

Here's how to handle more complex JSON parsing scenarios:

```typescript
import * as t from 'io-ts'
import { DateFromISOString } from 'io-ts-types'

// Define a codec that handles nested structures and dates
const EventCodec = t.type({
  id: t.string,
  timestamp: DateFromISOString,
  data: t.type({
    title: t.string,
    participants: t.array(t.type({
      id: t.string,
      role: t.union([
        t.literal('organizer'),
        t.literal('attendee')
      ])
    }))
  })
})

// Example JSON string with nested structure
const jsonString = `{
  "id": "evt_123",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "title": "Team Meeting",
    "participants": [
      {"id": "user_1", "role": "organizer"},
      {"id": "user_2", "role": "attendee"}
    ]
  }
}`

// Parse and validate in one step
const result = EventCodec.decode(JSON.parse(jsonString))
// Success: Parsed with proper Date object and validated structure
```

## Error Handling

Here's how to handle parsing and validation errors gracefully:

```typescript
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'
import { failure } from 'io-ts/lib/PathReporter'

// Helper function to safely parse and validate JSON
function parseAndValidate<T>(codec: t.Type<T>, input: string): E.Either<string[], T> {
  try {
    const parsed = JSON.parse(input)
    return pipe(
      codec.decode(parsed),
      E.mapLeft(errors => failure(errors))
    )
  } catch (e) {
    return E.left(['Invalid JSON format'])
  }
}

// Usage example
const result = parseAndValidate(UserCodec, invalidJson)
// Left(['Invalid value "30" supplied to : { name: string, age: number, email: string }/age: number'])
```

## Best Practices

1. **Separate Concerns**: Keep JSON parsing separate from business logic
2. **Type Safety**: Define explicit codecs for expected data structures
3. **Error Handling**: Always handle both JSON parsing and validation errors
4. **Transformations**: Use codec composition for complex transformations
5. **Validation**: Include detailed validation messages for debugging
