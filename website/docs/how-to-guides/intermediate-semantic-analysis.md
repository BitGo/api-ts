---
sidebar_position: 1
---

# How to Parse a number from a Query Parameter

import { Spotlight } from '@site/src/components/CodeHike';

Query parameters are represented as the type
`Record<string, string | string[] | undefined>`, so using a codec that doesn't decode
from a `string | string[] | undefined` will produce a type error.

<Spotlight />

In general, the solution to decoding a query parameter into a non-string type is to use
a codec that decodes and encodes from a `string` into your desired type.
