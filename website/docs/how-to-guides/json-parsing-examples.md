# JSON Parsing with api-ts

Learn how to define and validate API endpoints using api-ts codecs. These examples are based on real-world usage patterns from the compliance-tx-monitoring project.

## Parsing Raw JSON Strings

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

## Common Patterns

### Basic Route Definition
Similar patterns found in `src/routes/list-transactions.ts` and `src/routes/search-addresses.ts`:

```typescript
import * as t from 'io-ts'
import { httpRequest } from '@api-ts/io-ts-http'

// Define common types
const PaginationQuery = t.type({
  page: t.number,
  pageSize: t.number
})

const DateRangeQuery = t.type({
  startDate: t.string,  // ISO date string
  endDate: t.string
})

// Define a GET endpoint with query parameters
const ListTransactions = httpRequest({
  method: 'GET',
  query: t.intersection([
    PaginationQuery,
    DateRangeQuery,
    t.partial({
      status: t.union([
        t.literal('PENDING'),
        t.literal('COMPLETED'),
        t.literal('FAILED')
      ])
    })
  ])
})

// Example usage
const validQuery = {
  page: 1,
  pageSize: 50,
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:59Z',
  status: 'PENDING'
}
ListTransactions.request.decode({ query: validQuery })
```

### Request Body Validation
Similar patterns found in `src/types/common.ts` and `src/routes/create-transaction.ts`:

```typescript
// Define reusable types
const MoneyAmount = t.type({
  amount: t.number,
  currency: t.string
})

const TransactionDetails = t.intersection([
  t.type({
    id: t.string,
    type: t.union([
      t.literal('DEPOSIT'),
      t.literal('WITHDRAWAL')
    ]),
    amount: MoneyAmount
  }),
  t.partial({
    description: t.string,
    metadata: t.record(t.string, t.unknown)
  })
])

// POST endpoint with body validation
const CreateTransaction = httpRequest({
  method: 'POST',
  headers: t.type({
    'x-idempotency-key': t.string
  }),
  body: TransactionDetails
})

// Example usage
const validBody = {
  id: 'tx_123',
  type: 'DEPOSIT',
  amount: {
    amount: 100.50,
    currency: 'USD'
  },
  metadata: {
    source: 'web',
    user_agent: 'Mozilla/5.0'
  }
}
CreateTransaction.request.decode({
  headers: { 'x-idempotency-key': 'key_123' },
  body: validBody
})
```

### Response Handling
Similar patterns found in `src/types/errors.ts` and `src/routes/get-transaction.ts`:

```typescript
// Define error responses
const ErrorResponse = t.type({
  code: t.string,
  message: t.string,
  details: t.array(t.string)
})

// Define success response
const TransactionResponse = t.intersection([
  TransactionDetails,
  t.type({
    status: t.union([
      t.literal('PENDING'),
      t.literal('COMPLETED'),
      t.literal('FAILED')
    ]),
    createdAt: t.string,
    updatedAt: t.string
  })
])

// Complete endpoint definition with responses
const GetTransaction = httpRequest({
  method: 'GET',
  params: t.type({
    transactionId: t.string
  }),
  response: {
    200: TransactionResponse,
    404: ErrorResponse,
    500: ErrorResponse
  }
})

// Example response handling
const response = {
  status: 200,
  body: {
    id: 'tx_123',
    type: 'DEPOSIT',
    amount: {
      amount: 100.50,
      currency: 'USD'
    },
    status: 'COMPLETED',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:31:00Z'
  }
}
GetTransaction.response[response.status].decode(response.body)
```

## Best Practices
Found throughout the codebase in `src/types/common.ts`, `src/routes/*`, and `src/middleware/*`:

1. **Reusable Types**: Define common structures like pagination, date ranges, and money amounts as reusable types
2. **Required vs Optional**: Use `t.intersection` with `t.partial` to clearly separate required and optional fields
3. **Error Handling**: Define consistent error response structures across endpoints
4. **Idempotency**: Include idempotency keys in headers for state-changing operations
5. **Timestamps**: Use ISO date strings for timestamps
6. **Enums**: Use literal unions for enumerated values
7. **Metadata**: Allow flexible metadata using `t.record(t.string, t.unknown)`
