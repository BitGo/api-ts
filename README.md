# api-ts

[![Build Status]](https://github.com/BitGo/api-ts/actions/workflows/release.yaml)

[build status]:
  https://github.com/BitGo/api-ts/actions/workflows/release.yaml/badge.svg?event=push

A collection of packages for defining and using type-checked APIs with TypeScript.

TypeScript is a powerful type system layered on top of JavaScript, but lacks type
information about values received at runtime. This is [an explicit non-goal] of the
TypeScript language, so we use [io-ts] to statically type this runtime data.
[io-ts-http] builds on top of io-ts to define codecs that translate between HTTP
requests and plain old JavaScript objects. Additionally, it provides a way to group
these codecs into route definitions, and then collect the route definitions into an API.
The resulting API definitions may then be used on the [client] and [server] to provide
type-checked and runtime-validated HTTP calls in a standardized manner.

[an explicit non-goal]:
  https://github.com/Microsoft/TypeScript/wiki/TypeScript-Design-Goals#non-goals
[io-ts]: https://github.com/gcanti/io-ts
[io-ts-http]: packages/io-ts-http/README.md
[client]: packages/superagent-wrapper/README.md
[server]: packages/express-wrapper/README.md

## io-ts Compatibility

**api-ts** is built and tested against the stable channel of io-ts (v2.1). **api-ts** is
not currently compatible with the experimental channel of io-ts (v2.2).

## Developing

```sh
npm install
npm run build
npm test
```

## License

This work is published under the Apache 2.0 license.

`SPDX-License-Identifier: Apache-2.0`
