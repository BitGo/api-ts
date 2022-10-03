# API-TS

![Build Status](https://github.com/BitGo/api-ts/actions/workflows/release.yml/badge.svg?branch=master&event=push)

A collection of packages for defining and using type-checked apis with TypeScript.

TypeScript is a powerful type system layered on top of JavaScript, but lacks type
information about values received at runtime. This is [an explicit non-goal] of the
TypeScript language, so we use [io-ts] to statically type this runtime data.
[io-ts-http] builds on top of io-ts to define codecs that translate between HTTP
requests and plain old JavaScript objects. Additionally, it provides a way to group
these codecs into route definitions, and then collect the route definitions into an api.
The resulting api definitions may then be used on the [client] and [server] to have
type-checked and runtime-validated HTTP calls in a standardized manner.

[an explicit non-goal]:
  https://github.com/Microsoft/TypeScript/wiki/TypeScript-Design-Goals#non-goals
[io-ts]: https://github.com/gcanti/io-ts
[io-ts-http]: packages/io-ts-http/README.md
[client]: packages/superagent-wrapper/README.md
[server]: packages/express-wrapper/README.md

## Getting started

```sh
npm install
npm run build
npm test
```

## License

This work is published under the Apache 2.0 license.

`SPDX-License-Identifier: Apache-2.0`
