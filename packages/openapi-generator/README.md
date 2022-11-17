# @api-ts/openapi-generator

The api-ts **openapi-generator** is a command-line utility for converting an io-ts-http
API specification into an OpenAPI specification.

## Install

```
npm install --save-dev @api-ts/openapi-generator
```

## Use

The **openapi-generator** assumes the io-ts-http `apiSpec` is exported in the top level
`index.ts` file. If your spec lives elsewhere, use the `--input` option.

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

For example:

```shell
npx openapi-generator --input src/index.ts --output api.json
```
