---
sidebar_position: 2
---

# Command-line Interface

## Overview

The `openapi-generator` CLI tool converts your `@api-ts/io-ts-http` `apiSpec` definition
into an OpenAPI 3.0 specification. When you run this tool, it reads a TypeScript file
containing your API definition and outputs the OpenAPI specification to stdout.

## Usage Syntax

```shell
openapi-generator [OPTIONS] [FLAGS] <file>
```

## Arguments

- `<file>`: (Required) Path to the TypeScript file containing the exported `apiSpec`
  definition.

## Options

- `--name`, `-n <string>`: Specifies the API name in the generated specification.
- `--version`, `-v <string>`: Specifies the API version in the generated OpenAPI
  specification. If an `@version` JSDoc tag is present on the `apiSpec` export, that
  value takes precedence.
- `--codec-file`, `-c <string>`: Path to a JavaScript configuration file defining
  schemas for custom or external io-ts codecs. See
  [Defining custom codec schemas](./configuration#defining-custom-codec-schemas) for
  details.

## Flags

- `--internal`, `-i`: Includes routes marked with the `@private` JSDoc tag in the
  generated output. By default, private routes are excluded.
- `--help`, `-h`: Displays the help message describing arguments, options, and flags.

## Examples

You can generate an OpenAPI specification and save it to a file:

```shell
npx openapi-generator src/index.ts > openapi-spec.json
```

You can specify API name, version, and custom codec definitions:

```shell
npx openapi-generator --name "My Service API" --version "2.1.0" --codec-file ./custom-codecs.js src/api.ts
```
