# Reference: @api-ts/typed-express-router

This section provides detailed technical descriptions of the functions, objects, types,
and configuration options available in the `@api-ts/typed-express-router` package. Use
this reference to understand the specific parameters, return values, and behavior of its
components when integrating `@api-ts/io-ts-http` specifications with Express.

## Components

- [**`createRouter`**](./create-router): Creates a new, typed Express Router instance
  linked to an API specification.
- [**`wrapRouter`**](./wrap-router): Wraps an existing Express Router instance, linking
  it to an API specification.
- [**`TypedRouter` Object**](./typed-router): Describes the router object returned by
  `createRouter` and `wrapRouter`, detailing its route definition methods (`.get`,
  `.post`, `.getUnchecked`, etc.) and middleware usage (`.use`).
- [**Augmented Request & Response**](./request-response): Explains the properties and
  methods added to the standard Express `req` (`req.decoded`) and `res`
  (`res.sendEncoded`) objects within typed route handlers.
- [**Configuration Options**](./configuration): Details the configurable options for
  error handling (`onDecodeError`, `onEncodeError`), post-response actions
  (`afterEncodedResponseSent`), and route aliasing (`routeAliases`).
- [**`TypedRequestHandler` Type**](./typed-request-handler): Describes the TypeScript
  helper type for defining route handlers with correctly inferred augmented request and
  response types.
