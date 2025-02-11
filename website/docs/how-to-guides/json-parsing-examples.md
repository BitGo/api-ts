# How to Parse JSON Data

This guide shows common patterns for parsing and validating JSON data using api-ts.

## Basic API Route Definition

```typescript
import * as t from 'io-ts'
import { httpRequest } from '@api-ts/io-ts-http'

// Define reusable types
const Pagination = t.type({
  limit: t.number,
  offset: t.number
})

const TimeRange = t.type({
  startTime: t.string,  // ISO date string
  endTime: t.string
})

// Define an API route with query parameters
const ListTransactions = httpRequest({
  method: 'GET',
  query: t.intersection([
    Pagination,
    TimeRange,
    t.partial({
      status: t.union([
        t.literal('pending'),
        t.literal('completed'),
        t.literal('failed')
      ])
    })
  ])
})

// Usage example
const validQuery = {
  limit: 20,
  offset: 0,
  startTime: '2024-01-01T00:00:00Z',
  endTime: '2024-01-31T23:59:59Z',
  status: 'pending'
}
ListTransactions.request.decode({ query: validQuery })
// Success: Validates query parameters
```

## Complex Request Bodies

```typescript
import { Method } from '@api-ts/io-ts-http'

// Define nested structures
const Address = t.type({
  street: t.string,
  city: t.string,
  country: t.string,
  postalCode: t.string
})

const CustomerInfo = t.intersection([
  t.type({
    id: t.string,
    name: t.string,
    email: t.string,
    primaryAddress: Address
  }),
  t.partial({
    phone: t.string,
    additionalAddresses: t.array(Address)
  })
])

// Create request with complex body
const UpdateCustomer = httpRequest({
  method: Method.enum.PUT,
  params: t.type({
    customerId: t.string
  }),
  headers: t.type({
    'x-request-id': t.string
  }),
  body: CustomerInfo
})

// Example usage with validation errors
const invalidRequest = {
  params: { customerId: '123' },
  headers: { 'x-request-id': 'req-456' },
  body: {
    id: '123',
    name: 'John Doe',
    email: 'invalid-email',  // Will fail validation
    primaryAddress: {
      street: '123 Main St',
      city: 'Boston',
      // country missing - will fail validation
      postalCode: '02101'
    }
  }
}
UpdateCustomer.request.decode(invalidRequest)
// Error: Validation failures for email format and missing country
```

## Response Handling

```typescript
// Define response types with branded types for extra safety
const TransactionId = t.brand(
  t.string,
  (s): s is t.Branded<string, { readonly TransactionId: unique symbol }> =>
    /^tx-[a-f0-9]{24}$/.test(s),
  'TransactionId'
)

const Transaction = t.type({
  id: TransactionId,
  amount: t.number,
  currency: t.string,
  status: t.union([
    t.literal('pending'),
    t.literal('completed'),
    t.literal('failed')
  ]),
  metadata: t.record(t.string, t.unknown)
})

// Define success and error responses
const GetTransaction = httpRequest({
  method: 'GET',
  params: t.type({
    transactionId: TransactionId
  }),
  response: {
    200: Transaction,
    404: t.type({
      error: t.literal('TransactionNotFound'),
      message: t.string
    }),
    500: t.type({
      error: t.literal('InternalServerError'),
      code: t.number,
      message: t.string
    })
  }
})

// Example response handling
const response = {
  status: 200,
  body: {
    id: 'tx-1234567890abcdef12345678',
    amount: 100.50,
    currency: 'USD',
    status: 'completed',
    metadata: {
      source: 'web',
      customer: 'cust_123'
    }
  }
}
GetTransaction.response[response.status].decode(response.body)
// Success: Validates response body against 200 status schema
```

The library provides:
- Type-safe request and response validation
- Composable type definitions
- Branded types for custom validation
- Union types for handling multiple response types
- Partial types for optional fields
- Intersection types for combining schemas
