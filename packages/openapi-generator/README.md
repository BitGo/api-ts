# @api-ts/openapi-generator

The api-ts **openapi-generator** is a command-line utility for converting an io-ts-http
API specification into an OpenAPI specification.

## Install

```shell
npm install --save-dev @api-ts/openapi-generator
```

## Use

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

## Preparing a types package for reusable codecs

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

## Defining Custom Codecs

When working with `openapi-generator`, you may encounter challenges with handling custom
codecs that require JavaScript interpretation or aren't natively supported by the
generator. These issues typically arise with codecs such as `new t.Type(...)` and other
primitives that aren't directly supported. However, there are two solutions to address
these challenges effectively. Click [here](#list-of-supported-io-ts-primitives) for the
list of supported primitives.

### Solution 1: Using a Custom Codec Configuration File

`openapi-generator` supports importing codecs from other packages in `node_modules`, but
it struggles with primitives that need JavaScript interpretation, such as
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

### Solution 2: Defining Custom Codec Schemas in the Types Package (recommended)

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

## List of supported io-ts primitives

- string
- number
- bigint
- boolean
- null
- nullType
- undefined
- unknown
- any
- array
- readonlyArray
- object
- type
- partial
- exact
- strict
- record
- union
- intersection
- literal
- keyof
- brand
- UnknownRecord
- void
