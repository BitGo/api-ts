# @api-ts/openapi-generator

The api-ts **openapi-generator** is a command-line utility for converting an io-ts-http
API specification into an OpenAPI specification.

## Contents

1. [Installation](#1-install)
2. [Usage](#2-use)
3. [Preparing a types package for reusable codecs](#3-preparing-a-types-package-for-reusable-codecs)
4. [Defining schemas for custom codecs](#4-defining-custom-codecs)
5. [List of supported io-ts primitives](#5-list-of-supported-io-ts-primitives)
6. [Generator Reference](#6-generator-reference)
   1. [Endpoint documentation](#61-endpoint-documentation)
   2. [Schema documentation](#62-schema-documentation)

## 1. Install

```shell
npm install --save-dev @api-ts/openapi-generator
```

## 2. Use

The **openapi-generator** assumes the io-ts-http `apiSpec` is exported in the top level
of the Typescript file passed as an input parameter. The OpenAPI specification will be
written to stdout.

```shell
ARGUMENTS:
  <file> - API route definition file

OPTIONS:
  --name, -n <str>       - API name [optional]
  --version, -v <str>    - API version [optional]
  --codec-file, -c <str> - Custom codec definition file [optional]

FLAGS:
  --internal, -i - include routes marked private
  --help, -h     - show help
```

For example:

```shell
npx openapi-generator src/index.ts
```

## 3. Preparing a types package for reusable codecs

In order to use types from external `io-ts` types packages, you must ensure two things
are done.

1. The package source code must be included in the bundle, as the generator is built to
   generate specs based from the Typescript AST. It is not set up to work with
   transpiled js code. You can do this by modifying your `package.json` to include your
   source code in the bundle. For example, if the source code is present in the `src/`
   directory, then add `src/` to the files array in the `package.json` of your project.
2. After Step 1, change the `types` field in the `package.json` to be the entry point of
   the types in the source code. For example, if the entrypoint is `src/index.ts`, then
   set `"types": "src/index.ts"` in the `package.json`

## 4. Defining Custom Codecs

When working with `openapi-generator`, you may encounter challenges with handling custom
codecs that require JavaScript interpretation or aren't natively supported by the
generator. These issues typically arise with codecs such as `new t.Type(...)` and other
primitives that aren't directly supported. However, there are two solutions to address
these challenges effectively. Click [here](#5-list-of-supported-io-ts-primitives) for
the list of supported primitives.

### Solution 1: Defining Custom Codec Schemas in the Types Package (recommended)

`openapi-generator` now offers the ability to define the schema of custom codecs
directly within the types package that defines them, rather than the downstream package
that uses them. This approach is particularly useful for codecs that are used in many
different types packages. Here’s how you can define schemas for your custom codecs in
the upstream repository:

1. Create a file named `openapi-gen.config.js` in the root of your repository.

2. Add the following line to the `package.json` of the types package:

   ```json
   "customCodecFile": "openapi-gen.config.js"
   ```

   You must also add `"openapi-gen.config.js"` to the files field in the package.json,
   so that it is included in the final bundle.

3. In the `openapi-gen.config.js` file, define your custom codecs:

   ```javascript
   module.exports = (E) => {
     return {
       SampleCodecDefinition: () =>
         E.right({
           type: 'string',
           default: 'defaultString',
           minLength: 1,
         }),
       // ... rest of your custom codec definitions
     };
   };
   ```

By following these steps, the schemas for your custom codecs will be included in the
generated API docs for any endpoints that use the respective codecs. The input parameter
`E` is the namespace import of `fp-ts/Either`, and the return type should be a `Record`
containing AST definitions for external libraries. For more details, see
[KNOWN_IMPORTS](./src/knownImports.ts).

### Solution 2: Using a Custom Codec Configuration File

`openapi-generator` supports importing codecs from other packages in `node_modules`, but
it struggles with `io-ts` primitives that need JavaScript interpretation, such as
`new t.Type(...)`. To work around this, you can define schemas for these codecs in a
configuration file within your downstream types package (where you generate the API
docs). This allows the generator to understand and use these schemas where necessary.
Follow these steps to create and use a custom codec configuration file:

1. Create a JavaScript file with the following format:

   ```javascript
   module.exports = (E) => {
     return {
       'io-ts-bigint': {
         BigIntFromString: () => E.right({ type: 'string' }),
         NonZeroBigInt: () => E.right({ type: 'number' }),
         NonZeroBigIntFromString: () => E.right({ type: 'string' }),
         NegativeBigIntFromString: () => E.right({ type: 'string' }),
         NonNegativeBigIntFromString: () => E.right({ type: 'string' }),
         PositiveBigIntFromString: () => E.right({ type: 'string' }),
       },
       // ... and so on for other packages
     };
   };
   ```

2. The input parameter `E` is the namespace import of `fp-ts/Either`, which avoids
   issues with `require`. The return type should be a `Record` containing AST
   definitions for external libraries. For more information on the structure, refer to
   [KNOWN_IMPORTS](./src/knownImports.ts).

## 5. List of supported io-ts primitives

- `string`
- `number`
- `bigint`
- `boolean`
- `null`
- `nullType`
- `undefined`
- `unknown`
- `any`
- `array`
- `readonlyArray`
- `object`
- `type`
- `partial`
- `exact`
- `strict`
- `record`
- `union`
- `intersection`
- `literal`
- `keyof`
- `brand`
- `UnknownRecord`
- `void`

## 6. Generator Reference

This section will highlight all the features that this generator supports, with examples
to help you add meaningful documentation to your code that will allow clients to use our
APIs with ease.

### 6.1. Endpoint documentation

Given an endpoint defined using `h.httpRoute`, you can add documentation and metadata to
this endpoint through the use of JSDocs. Here are the following list of attributes that
are supported.

#### 6.1.1 Summary

The summary is the first line of the JSDoc. This will be added to the OpenAPI
specification as the endpoints' summary

```typescript
/**
 * This is the summary
 */
const route = h.httpRoute({ ... })
```

#### 6.1.2 Description

The description is the next `x` untagged lines of the JSDoc. This will be added to the
OpenAPI specification as the endpoints' description

```typescript
/**
 * This is the summary
 * This is description line 1
 * This is description line 2
 */
const route = h.httpRoute({ ... })
```

#### 6.1.3 Operation IDs

All endpoints must have an `operationId` to be identifiable. You can add an operation ID
to the specification using the `@operationId` tag in JSDocs. This will add it to the
OpenAPI specification for this route.

```typescript
/**
 * This is the summary
 * This is description line 1
 * This is description line 2
 *
 * @operationId v2.sample.route
 */
const route = h.httpRoute({ ... })
```

#### 6.1.4 Tags

Tags are how we organize endpoints into different groups on `dev-portal`. There are many
different tags and tag groups, such as `Wallet`, `Address`, etc.
[Click here](https://github.com/BitGo/dev-portal/blob/master/app/lib/apiDocs/apiNavGroups.ts)
for a full list of tags. You can add a tag to your endpoint using the `@tag` JSDoc tag.

```typescript
/**
 * This is the summary
 * This is description line 1
 * This is description line 2
 *
 * @operationId v2.sample.route
 * @tag Wallet
 */
const route = h.httpRoute({ ... })
```

#### 6.1.5 Private Routes

There are many instances where you'd want an endpoint to be private, such as `admin` or
`internal` routes. You can make an endpoint private in documentation by simply adding a
`@private` tag to the JSDoc. In the specification, this will add an `x-internal: true`
field, which marks the field to be stripped out in a preprocessing
[step](https://github.com/BitGo/dev-portal/blob/master/scripts/filterSpec.js) on
dev-portal.

```typescript
/**
 * This is the summary
 * This is description line 1
 * This is description line 2
 *
 * @private
 * @operationId v2.sample.route
 * @tag Wallet
 */
const route = h.httpRoute({ ... })
```

#### 6.1.6 Unstable Routes

If you are working on an endpoint that is unstable, or not completely implemented yet,
you can add the `@unstable` tag to ensure that consumers know it is still in development
and may not work as expected.

```typescript
/**
 * This is the summary
 * This is description line 1
 * This is description line 2
 *
 * @unstable
 * @operationId v2.sample.route
 * @tag Wallet
 */
const route = h.httpRoute({ ... })
```

#### 6.1.7 Examples

You can also add example responses to the top level JSDocs of your endpoint, but as
you'll see in later sections, there are other ways to do this.

```typescript
/**
 * This is the summary
 * This is description line 1
 * This is description line 2
 *
 * @unstable
 * @operationId v2.sample.route
 * @tag Wallet
 * @example { example: { object: { key: value }}}
 */
const route = h.httpRoute({ ... })
```

#### 6.1.8 Unknown tags

Any other tags that are added to this top-level will be classified as an uknown tag, and
will be placed inside the `x-unknown-tags` field in the OpenAPI specification. You can
use this feature to write custom workflows and filtering logic for you full
specification. For example, you could add a `@version` tag and have a workflow that
filters endpoints based on the version field in the `x-unknown-tags` field.

```typescript
/**
 * This is the summary
 * This is description line 1
 * This is description line 2
 *
 * @unstable
 * @operationId v2.sample.route
 * @tag Wallet
 * @example { example: { object: { key: value }}}
 * @version 3
 */
const route = h.httpRoute({ ... })
```

#### 6.1.9 Sample output

This is what the OpenAPI specification will look like for the route we have built.

```javascript
{
  "openapi": 3.03,
  "paths": {
    "/api/v2/sample/route": {
      "get": {
        "summary": "This is the summary",
        "description": "This is description line 1\nThis is description line 2",
        "operationId": "v2.sample.route",
        "example": {
          "object": {
            "key": "value"
          }
        },
        "tag": "Wallet",
        "x-internal": true, // @private
        "x-unstable": true, // @unstable
        "x-unknown-tags": {
          "version": 3
        }
        ...parameters,
        ...requestBody,
        ...responses
      }
    }
  }
}
```

### 6.2. Schema Documentation

In addition to adding JSDocs for top-level routes, you can also add JSDocs to
paremeters, request bodies, and response body schemas.

#### 6.2.1 Descriptions

You can add a description to any schema or field just by adding a JSDoc on top, with a
description.

```typescript
import * as t from 'io-ts';

/**
 * This is a description that will be included in the OpenAPI specification.
 */
const schema = t.type({
  field: t.number,
});
```

#### 6.2.2 Supported OpenAPI Tags

These are the list of OpenAPI tags that you can put in JSDocs, and they will be included
in the generated OpenAPI spec.

- `@default[value: any]`
- `@example [example: any]`
- `@minLength [length: number]`
- `@maxLength [length: number]`
- `@pattern [pattern: regex]`
- `@minimum [min: number]`
- `@maximum [max: number]`
- `@minItems [minItems: number]`
- `@maxItems [maxItems: number]`
- `@minProperties [min: number]`
- `@maxProperties [max: number]`
- `@exclusiveMinimum`
- `@exclusiveMaximum`
- `@multipleOf [num: number]`
- `@uniqueItems`
- `@readOnly`
- `@writeOnly`
- `@format [format: format]`
- `@title [title: string]`

Here is an example schema with all these tags in use. Don't worry about the fields, just
notice the different JSDocs and JSDocs tags for each field. You can also add as many
tags to one field as you want (provided that the tags don't conflict). You may also add
[descriptions](#621-descriptions)

```typescript
include * as t from 'io-ts';

/** @title Sample Schema Title */
const SampleSchema = t.type({
  /** @default defaultValueForField1 */
  field1: t.string,
  /** @example exampleForField2 */
  field2: t.string,
  /** @minLength 4 */
  field3: t.string,
  /** @maxLength 6 */
  field4: t.string,
  /** @pattern ^[0-9a-f]{32}$ */
  fieldWithId: t.string,
  /** @minimum 10 */
  minField: t.number,
  /** @maximum 40 */
  maxField: t.number,
  /** @minItems 10 */
  minItemsArray: t.array(t.string),
  /** @maxItems 50 */
  maxItemsArray: t.array(t.string),
  /** @minProperties 3 */,
  minPropRecord: t.record(t.string, t.string),
  /** @maxProperties 10 */
  maxPropRecord: t.record(t.string, t.string),
  nestedObject: t.partial({
    /**
     * @minimum 2
     * @exclusiveMinimum
     */
    exclMin: t.number,
    /**
     * @maximum 50
     * @exclusiveMaximum
     */
    exclMax: t.number,
    /** @multipleOf 5*/
    multOf: t.number,
    /** @uniqueItems */
    arr: t.array(t.string),
    /** @readOnly */
    readOnlyField: t.unknown,
    /** @writeOnly */
    writeOnlyField: t.unknown,
    /** @format uuid */
    uuidField: t.string,
    /** @title Hello */
    titleField: t.string
  })
})
```

#### 6.2.3 Custom Tags

These are some tags that you can use in your schema JSDocs are custom to this generator.

- `@private` allows you to mark any field as in any schema as private. The final spec
  will have `x-internal: true` for schemas with the `@private` tag.
- `@deprecated` allows to mark any field in any schema as deprecated. The final spec
  will include `deprecated: true` in the final specificaiton.

```typescript
import * as t from 'io-ts';

const Schema = t.type({
  /** @private */
  privateField: t.string,
  /** @deprecated */
  deprecatedField: t.string,
  publicNonDeprecatedField: t.string,
});
```
