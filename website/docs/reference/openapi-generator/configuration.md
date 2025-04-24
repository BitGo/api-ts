---
sidebar_position: 3
---

# Configuration

## Overview

You need to configure the generator to:

- Correctly interpret `io-ts` types from external packages.
- Define OpenAPI schemas for custom `io-ts` codecs that can't be automatically derived
  from the Abstract Syntax Tree (AST).

## Preparing External Types Packages

To process `io-ts` types imported from other npm packages, ensure the following in the
external package's `package.json`:

1. Include source code in the published npm bundle by adding the source directory to the
   `files` array:

   ```json
   // package.json of the external types package
   {
     "name": "my-external-types",
     "version": "1.0.0",
     "files": [
       "dist/",
       "src/" // Include source code
     ],
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "source": "src/index.ts" // Add this field
     // ... rest of package.json
   }
   ```

2. Specify the source entry point using the `source` field (for example,
   `"source": "src/index.ts"`).

## Defining Custom Codec Schemas

For custom `io-ts` codecs (such as those using `new t.Type(...)` or complex types not
directly supported), you must define schemas manually using one of these methods:

### Method 1: Via `openapi-gen.config.js` (Recommended For Type Authors)

You can define schemas directly within the package that declares the custom codecs:

1. Create a file named `openapi-gen.config.js` in the root of the types package.

2. Update the package's `package.json` to include:

- The `customCodecFile` field pointing to this file.
- The config file in the `files` array.

  ```json
  // package.json of the types package defining custom codecs
  {
    "name": "my-custom-codec-package",
    // ...
    "files": [
      "dist/",
      "src/",
      "openapi-gen.config.js" // Include the config file
    ],
    "customCodecFile": "openapi-gen.config.js" // Point to the file
    // ...
  }
  ```

3. Structure the `openapi-gen.config.js` file as follows:

   ```javascript
   // openapi-gen.config.js
   module.exports = (E) => {
     return {
       // Key matches the exported codec name (e.g., export const MyCustomString = ...)
       MyCustomString: () =>
         E.right({
           type: 'string',
           format: 'custom-format',
           description: 'A custom string type definition',
         }),
       AnotherCustomType: () =>
         E.right({
           type: 'object',
           properties: {
             /* ... */
           },
         }),
       // ... other custom codec definitions
     };
   };
   ```

The exported function receives the `fp-ts/Either` namespace (`E`) as an argument. You
should return an object where:

- Keys are the exported names of your custom codecs.
- Values are functions that return `E.right()` with an OpenAPI schema object.

### Method 2: Via `--codec-file` Option (For Consumers)

You can define schemas in a configuration file within your project and pass the file
path via the `--codec-file` option:

1. Create a JavaScript file (for example, `custom-codecs.js`).

2. Structure the file similarly to Method 1, but group definitions by package:

   ```javascript
   // custom-codecs.js
   module.exports = (E) => {
     return {
       'io-ts-bigint': {
         // Package name
         BigIntFromString: () => E.right({ type: 'string', format: 'bigint' }),
         NonZeroBigIntFromString: () =>
           E.right({ type: 'string', format: 'bigint' /* constraints */ }),
         // ... other codecs from 'io-ts-bigint'
       },
       'my-other-custom-package': {
         // Another package
         SomeType: () => E.right({ type: 'number', format: 'float' }),
       },
       // ... other packages
     };
   };
   ```

In this structure:

- Keys of the top-level object are package names.
- Values are objects that map codec names to their schema definitions.

3. Run the generator with the `--codec-file` option:

   ```shell
   npx openapi-generator --codec-file ./custom-codecs.js src/index.ts
   ```
