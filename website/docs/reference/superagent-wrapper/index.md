---
sidebar_position: 3
---

# Superagent-Wrapper

This reference describes the functions and client structure in the
`@api-ts/superagent-wrapper` package. You can use this documentation to understand the
parameters, return values, and behavior of each component.

## Components

- [**superagentRequestFactory**](./superagent-request-factory): This function creates a
  request factory using `superagent` for making HTTP requests.
- [**supertestRequestFactory**](./supertest-request-factory): This function creates a
  request factory using `supertest` for testing HTTP servers.
- [**buildApiClient**](./build-api-client): This function builds a type-safe API client
  from a request factory and API specification.
- [**API Client Usage**](./api-client): This page describes the structure and methods of
  the client object returned by `buildApiClient`.

## Getting Started

```typescript
// Example: Creating an API client with superagent
import * as superagent from 'superagent';
import { superagentRequestFactory, buildApiClient } from '@api-ts/superagent-wrapper';
import { myApiSpec } from './my-api-spec';

// 1. Create a request factory
const requestFactory = superagentRequestFactory(
  superagent,
  'https://api.example.com/v1',
);

// 2. Build the API client
const apiClient = buildApiClient(requestFactory, myApiSpec);

// 3. Make API calls
const response = await apiClient.users.get({ id: 123 }).decode();
```
