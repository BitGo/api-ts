# io-ts-openapi

Command-line utility for converting a collection of io-ts-http routes into an OpenAPI
specification.

# Usage

This utility is intended to be run on packages that export a collection of `io-ts-http`
routes and related codecs. The default assumption is that the routes are exported in the
top level `index.ts` file, however it should work if the routes are specified elsewhere
by using the `--input` option.

# Parameters

io-ts-openapi accepts several command-line arguments, all of which are optional.

```
OPTIONS:
  --input, -i <str>    - API route definition file (default: './src/index.ts') [optional]
  --output, -o <str>   - OpenAPI output file (default: './api.json') [optional]
  --tsconfig, -t <str> - path to tsconfig.json in project root (default: './tsconfig.json') [optional]
  --name, -n <str>     - API name [optional]

FLAGS:
  --internal, -i - include routes marked private
  --help, -h     - show help
```
