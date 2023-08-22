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
OPTIONS:
  --name, -n <str>     - API name [optional]
  --version, -v <str>  - API version [optional]

FLAGS:
  --internal, -i - include routes marked private
  --help, -h     - show help
```

For example:

```shell
npx openapi-generator src/index.ts
```
