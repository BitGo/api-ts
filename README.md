# API-TS

![Build Status](https://github.com/BitGo/api-ts/actions/workflows/ci.yml/badge.svg?branch=master)

**Disclaimer: This project is currently in beta state. Documentation is actively being
worked on.**

A collection of packages for defining and using type-checked apis with TypeScript.

TypeScript is a very powerful type system layered on top of JavaScript, but lacks type
information available at runtime. This is not likely to change because it is
[an explicit non-goal](https://github.com/Microsoft/TypeScript/wiki/TypeScript-Design-Goals#non-goals)
of TypeScript. [io-ts](https://github.com/gcanti/io-ts) fills in this functionality gap.
[io-ts-http](packages/io-ts-http/README.md) builds on top of `io-ts` to make it possible
to define codecs that translate between HTTP requests and plain JS objects.
Additionally, it provides a way to group these codecs into route definitions, and then
collect the route definitions into an api. The resulting api definitions may then be
used on the [client](packages/superagent-wrapper/README.md) and
[server](packages/express-wrapper/README.md) to have type-checked and runtime-validated
HTTP calls in a standardized manner.

## Getting started

```sh
npm install
npm run build
npm test
```

## License

This work is published under the Apache 2.0 license.

`SPDX-License-Identifier: Apache-2.0`
