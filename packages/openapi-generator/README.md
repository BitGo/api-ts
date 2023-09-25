# @api-ts/openapi-generator

The api-ts **openapi-generator** is a command-line utility for converting an io-ts-http
API specification into an OpenAPI specification.

## Install

```
npm install --save-dev @api-ts/openapi-generator
```

## Use

The **openapi-generator** assumes the io-ts-http `apiSpec` is exported in the top level
of the Typescript file passed as an input parameter. The OpenAPI specification will be
written to stdout.

```
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

## Custom codec file

`openapi-generator` only reads files in the specified package, and stops at the module
boundary. This allows it to work even without `node_modules` installed. It has built-in
support for `io-ts`, `io-ts-types`, and `@api-ts/io-ts-http` imports. If your package
imports codecs from another external library, then you will have to define them in a
custom configuration file so that `openapi-generator` will understand them. To do so,
create a JS file with the following format:

```typescript
module.exports = (E) => {
  return {
    'io-ts-bigint': {
      BigIntFromString: () => E.right({ type: 'primitive', value: 'string' }),
      NonZeroBigInt: () => E.right({ type: 'primitive', value: 'number' }),
      NonZeroBigIntFromString: () => E.right({ type: 'primitive', value: 'string' }),
      NegativeBigIntFromString: () => E.right({ type: 'primitive', value: 'string' }),
      NonNegativeBigIntFromString: () =>
        E.right({ type: 'primitive', value: 'string' }),
      PositiveBigIntFromString: () => E.right({ type: 'primitive', value: 'string' }),
    },
    // ... and so on for other packages
  };
};
```

The input parameter `E` is the namespace import of `fp-ts/Either` (so that trying to
`require` it from the config file isn't an issue), and the return type is a `Record`
containing AST definitions for external libraries.
[Refer to KNOWN_IMPORTS here for info on the structure](./src/knownImports.ts)
