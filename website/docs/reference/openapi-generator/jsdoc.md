# JSDoc Annotations

You can use JSDoc comments to enrich the generated OpenAPI specification. This reference
describes the supported annotations for both endpoint definitions and schema
definitions.

## Endpoint Annotations

You can add JSDoc comments to variables holding `h.httpRoute` definitions to provide
metadata for the corresponding OpenAPI operation object.

### Summary

When you add a JSDoc comment, the first line becomes the `summary` field:

```typescript
/**
 * Retrieve a user by their ID.
 */
const GetUserRoute = h.httpRoute({
  /* ... */
});
```

### Description

Any subsequent untagged lines following the summary become the `description` field
(newlines preserved):

```typescript
/**
 * Retrieve a user by their ID.
 * Provides detailed information about the user,
 * including profile and settings.
 */
const GetUserRoute = h.httpRoute({
  /* ... */
});
```

### @operationId

This tag specifies the `operationId` field. It is required for unique identification:

```typescript
/**
 * @operationId getUserById
 */
const GetUserRoute = h.httpRoute({
  /* ... */
});
```

### @tag

This tag assigns the endpoint to a specific tag group. It populates the `tags` array
field. You can use multiple `@tag` lines:

```typescript
/**
 * @tag User
 * @tag Profile
 */
const GetUserRoute = h.httpRoute({
  /* ... */
});
```

### @private

This tag marks the endpoint as internal. It adds `x-internal: true` to the operation
object. These routes are omitted by default unless you use the `--internal` flag:

```typescript
/**
 * Admin-only route.
 * @private
 * @operationId adminGetUser
 * @tag Admin
 */
const AdminGetUserRoute = h.httpRoute({
  /* ... */
});
```

### @unstable

This tag marks the endpoint as unstable or under development. It adds `x-unstable: true`
to the operation object:

```typescript
/**
 * New feature, API may change.
 * @unstable
 * @operationId betaFeature
 * @tag Beta
 */
const BetaRoute = h.httpRoute({
  /* ... */
});
```

### @example

This tag provides an example payload. It adds the JSON object to the `example` field:

```typescript
/**
 * @example { "userId": "user-123", "name": "Example User" }
 */
const GetUserRoute = h.httpRoute({
  /* ... */
});
```

### Unknown Tags

The generator treats any JSDoc tag not listed above as an "unknown tag". It collects
these tags into the `x-unknown-tags` object:

```typescript
/**
 * @version 2
 * @department Billing
 */
const GetUserRoute = h.httpRoute({
  /* ... */
});
```

In this example, `@version 2` becomes `{ "version": "2" }` and `@department Billing`
becomes `{ "department": "Billing" }` in the `x-unknown-tags` object.

## Schema Annotations

When you add JSDoc comments to `io-ts` type definitions or fields within `t.type`,
`t.partial`, etc., they add detail to the corresponding OpenAPI schema object or
property.

### Description

When you add JSDoc text directly above a type definition or field, it becomes the
`description` field in the schema:

```typescript
import * as t from 'io-ts';

/**
 * Unique identifier for the resource.
 */
const id = t.string;

/** Represents a user profile. */
const UserProfile = t.type({
  /** User's primary email address. */
  email: t.string,
  id: id,
});
```

### Supported OpenAPI Tags

You can use the following JSDoc tags, which map directly to standard OpenAPI schema
keywords:

| JSDoc Tag                 | OpenAPI Property   | Description                        |
| ------------------------- | ------------------ | ---------------------------------- |
| `@default <value>`        | `default`          | Default value                      |
| `@example <value>`        | `example`          | Example value                      |
| `@minLength <number>`     | `minLength`        | Minimum string length              |
| `@maxLength <number>`     | `maxLength`        | Maximum string length              |
| `@pattern <regex>`        | `pattern`          | Regex pattern string               |
| `@minimum <number>`       | `minimum`          | Minimum numeric value              |
| `@maximum <number>`       | `maximum`          | Maximum numeric value              |
| `@minItems <number>`      | `minItems`         | Minimum array items                |
| `@maxItems <number>`      | `maxItems`         | Maximum array items                |
| `@minProperties <number>` | `minProperties`    | Minimum object properties          |
| `@maxProperties <number>` | `maxProperties`    | Maximum object properties          |
| `@exclusiveMinimum`       | `exclusiveMinimum` | Exclusive minimum flag             |
| `@exclusiveMaximum`       | `exclusiveMaximum` | Exclusive maximum flag             |
| `@multipleOf <number>`    | `multipleOf`       | Multiple of value                  |
| `@uniqueItems`            | `uniqueItems`      | Unique array items flag            |
| `@readOnly`               | `readOnly`         | Read-only flag                     |
| `@writeOnly`              | `writeOnly`        | Write-only flag                    |
| `@format <format>`        | `format`           | Format (e.g., `uuid`, `date-time`) |
| `@title <title>`          | `title`            | Schema title                       |

### Custom Tags

| JSDoc Tag     | OpenAPI Property   | Description                      |
| ------------- | ------------------ | -------------------------------- |
| `@private`    | `x-internal: true` | Marks schema/field as internal   |
| `@deprecated` | `deprecated: true` | Marks schema/field as deprecated |

## Example Schema With Annotations

```typescript
import * as t from 'io-ts';

/**
 * @title Detailed Item Schema
 * Describes an item with various constraints.
 */
const ItemSchema = t.type({
  /**
   * The unique identifier for the item.
   * @format uuid
   * @readOnly
   * @example "f47ac10b-58cc-4372-a567-0e02b2c3d479"
   */
  id: t.string,

  /**
   * Name of the item.
   * @minLength 1
   * @maxLength 100
   * @default "Unnamed Item"
   */
  name: t.string,

  /**
   * Item quantity in stock.
   * @minimum 0
   * @example 25
   */
  quantity: t.number,

  /**
   * Tags associated with the item. Must contain unique tags.
   * @minItems 1
   * @maxItems 10
   * @uniqueItems
   */
  tags: t.array(t.string),

  /** @deprecated Use 'tags' instead. */
  legacyCategory: t.string,

  /**
   * Internal tracking code.
   * @private
   * @pattern ^[A-Z]{3}-[0-9]{4}$
   */
  internalCode: t.string,

  /**
   * Price of the item. Must be greater than 0.
   * @minimum 0
   * @exclusiveMinimum
   */
  price: t.number,
});
```
