---
sidebar_position: 1
---

# Introduction

`api-ts` brings type safety to TypeScript HTTP servers by embracing the "[parse, don't
validate]" philosophy. In addition to validating incoming HTTP requests against your API
specification, `api-ts` also parses raw, less-structured data (like strings or JSON)
into strongly-typed domain objects using the `io-ts` library. Once parsed, you can trust
the HTTP request has passed both [type and semantic validation], ensuring your business
logic is never called with data it can't handle.

[parse, don't validate]:
  https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
[type and semantic validation]:
  https://bitgo.github.io/api-ts/docs/tutorial-basics/create-an-api-spec/#what-problem-does-io-ts-http-solve
