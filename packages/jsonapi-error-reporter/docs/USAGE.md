# JSON API Error Reporter for api-ts

This package provides a custom error reporter for io-ts validation errors that formats
them according to the
[JSON API error specification](https://jsonapi.org/format/#errors).

## Understanding JSON API Error Format

The JSON API specification defines a standard format for error responses. The error
objects should have the following structure:

```typescript
{
  "errors": [
    {
      "id": "optional unique identifier",
      "links": {
        "about": "optional link to more information"
      },
      "status": "optional HTTP status code",
      "code": "optional application-specific error code",
      "title": "optional short summary",
      "detail": "optional detailed explanation",
      "source": {
        "pointer": "optional JSON pointer to the error location",
        "parameter": "optional query parameter that caused the error"
      },
      "meta": {
        // optional object with additional information
      }
    }
    // ... additional errors
  ]
}
```

## Integration with typed-express-router

This package provides custom error handlers that can be used with the
`typed-express-router` package:

```typescript
import { createRouter } from '@api-ts/typed-express-router';
import {
  jsonApiOnDecodeError,
  jsonApiOnEncodeError,
} from '@api-ts/jsonapi-error-reporter';

const router = createRouter(MyAPI, {
  onDecodeError: jsonApiOnDecodeError,
  onEncodeError: jsonApiOnEncodeError,
});
```

## How it Works

1. When io-ts validation fails in the `typed-express-router`, it collects the validation
   errors.
2. These errors are passed to the `onDecodeError` handler, which is customized to use
   the `jsonApiOnDecodeError` function from this package.
3. The `jsonApiOnDecodeError` function formats each validation error according to the
   JSON API specification.
4. The formatted errors are returned as part of the HTTP response.

## Error Mapping Details

- Each io-ts validation error is mapped to a JSON API error object.
- The error location (path) is mapped to a JSON pointer in the `source.pointer` field.
- The error type and value information are included in the `detail` field.
- Additional context information is preserved in the `meta` field.

## Custom Error Formatting

You can customize the error formatting by creating your own error handler function based
on the provided `formatError` function. For example:

```typescript
import { formatError } from '@api-ts/jsonapi-error-reporter';
import * as t from 'io-ts';

const myCustomFormatError = (error: t.ValidationError): JSONAPIError => {
  const baseError = formatError(error);

  // Add custom fields or modify existing ones
  return {
    ...baseError,
    code: 'VAL_ERR_001',
    title: 'Custom Validation Error',
  };
};
```

## Handling Non-Validation Errors

This package primarily focuses on formatting io-ts validation errors. For other types of
errors (like runtime errors), you may need to create custom error handlers that format
those errors according to the JSON API specification.
