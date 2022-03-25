# `httpRequest`

Helper function for defining HTTP request codecs. These codecs have the property that
the decoded type is a flattened combination of the query params, path params, headers,
and body. It accepts an object containing codecs for query, path, header, and body
params. The result is a codec where these parameters are all flattened into the result
when decoded, and placed into their appropriate positions when encoded. All parameters
are optional and default to the empty object `{}`

## Usage

Request with a single query parameter

```typescript
const Request = httpRequest({
  query: {
    message: t.string,
  },
});

// Decoded type
type DecodedRequest = {
  message: string;
};
```

Request with both query and path parameters

```typescript
const Request = httpRequest({
  query: {
    message: t.string,
  },
  params: {
    id: NumberFromString,
  },
});

// Decoded type
type DecodedRequest = {
  message: string;
  id: number;
};
```

Request with a body

```typescript
const Request = httpRequest({
  params: {
    id: NumberFromString,
  },
  body: {
    content: t.string,
    timestamp: DateFromISOString,
  },
});

// Decoded type
type DecodedRequest = {
  id: number;
  content: string;
  timestamp: Date;
};
```

## Limitations

`httpRequest` currently assumes that a request body, if present, is an object type. A
workaround for this is outlined in the [httpRoute](./httpRoute.md#Advanced%20Usage) doc.
