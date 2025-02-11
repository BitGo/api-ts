# How To Parse JSON Strings 

## Basic JSON String Parsing
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

## Nested JSON String Parsing

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