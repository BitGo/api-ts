# `GenericHttpRequest`

### Overview

An internal interface that represents the expected input structure for codecs generated
by `httpRequest` during the decoding process. It represents a minimally parsed HTTP
request before type-specific validation and parsing occur.

### Specification

```typescript
interface GenericHttpRequest {
  params: {
    [K: string]: string; // Raw path parameters
  };
  query: {
    // Minimally parsed query params (split, urlDecoded)
    [K: string]: string | string[];
  };
  headers: {
    [K: string]: string; // Raw headers (typically lowercase keys)
  };
  body?: unknown; // Raw request body, type unknown before parsing
}
```
