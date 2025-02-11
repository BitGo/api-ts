# How to Parse JSON Data  

## Basic Request Validation

```typescript
import * as t from 'io-ts'
import { httpRequest } from '@api-ts/io-ts-http'

// Define a request with query parameters and body
const SearchRequest = httpRequest({
  query: t.type({
    limit: t.number,
    offset: t.number
  }),
  body: t.type({
    searchTerm: t.string,
    filters: t.array(t.string)
  })
})

// Validate complete request
const validRequest = {
  query: { limit: 10, offset: 0 },
  body: { 
    searchTerm: "api", 
    filters: ["active", "published"] 
  }
}
SearchRequest.request.decode(validRequest)
// Success: { query: { limit: 10, offset: 0 }, body: { searchTerm: "api", filters: ["active", "published"] } }
```

## Edge Cases and Complex Types

```typescript
import { Method } from '@api-ts/io-ts-http'

// Union types for status codes
const StatusResponse = t.union([
  t.type({ status: t.literal(200), data: t.string }),
  t.type({ status: t.literal(404), error: t.string }),
  t.type({ status: t.literal(500), code: t.number, message: t.string })
])

// Request with optional fields and specific HTTP method
const ApiRequest = httpRequest({
  method: Method.enum.POST,
  headers: t.partial({
    'x-api-version': t.string,
    'x-client-id': t.string
  }),
  query: t.partial({
    debug: t.boolean
  }),
  body: t.intersection([
    t.type({ required: t.string }),
    t.partial({ optional: t.array(t.number) })
  ])
})

// Examples of edge cases
const partialRequest = {
  headers: { 'x-api-version': '2.0' },
  body: { required: 'test' }
}
ApiRequest.request.decode(partialRequest)
// Success: Accepts partial headers and query

const invalidMethod = {
  method: 'GET',  // Wrong method
  body: { required: 'test' }
}
ApiRequest.request.decode(invalidMethod)
// Error: Invalid method, expected POST

const complexResponse = {
  status: 500,
  code: 5001,
  message: 'Internal server error'
}
StatusResponse.decode(complexResponse)
// Success: Matches 500 status union case
```
