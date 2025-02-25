---
sidebar_position: 1
---

# Introduction

`io-ts-http` brings type safety to HTTP data handling in TypeScript by embracing the
"[parse, don't validate]" philosophy. Rather than simply checking if incoming HTTP data
is valid, it also parse raw, less-structured data (like strings or JSON) into strongly
typed, precise objects using the `io-ts` library. This parsing happens at the system
boundary, ensuring all types have use cases in your code. Once parsed, you can trust
that the data satisfies both [type and semantic analysis].

[parse, don't validate]:
  https://lexi-lambda.github.io/blog/2019/11/05/parse-don-t-validate/
[type and semantic analysis]:
  https://bitgo.github.io/api-ts/docs/tutorial-basics/create-an-api-spec/#what-problem-does-io-ts-http-solve
