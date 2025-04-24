# Augmented Request & Response

When you use route handlers registered via a [`TypedRouter`](./typed-router) object
(using methods like `.get`, `.post`, `.getUnchecked`, etc.), the standard Express
`request` and `response` objects are augmented with additional properties and methods
related to the API specification.

## Augmented Request (`req`)

The Express `request` object (`req`) passed to typed route handlers includes an
additional property:

### `req.decoded`

- **Type (Checked Routes):** `DecodedRequest`
  - In handlers attached using the "checked" methods (such as `typedRouter.get(...)`),
    `req.decoded` holds the successfully decoded and validated request data. Its
    TypeScript type is inferred directly from the `request` codec defined in the
    corresponding `httpRoute` of the `ApiSpec`. This object contains the flattened
    combination of path parameters, query parameters, headers, and body properties as
    defined by the `httpRequest` codec used in the spec.
- **Type (Unchecked Routes & Middleware):** `Either<t.Errors, DecodedRequest>`
  - In handlers attached using the "unchecked" methods (such as
    `typedRouter.getUnchecked(...)`) or in middleware added via `typedRouter.use(...)`,
    `req.decoded` holds the raw result of the decoding attempt from `io-ts`. This is an
    `Either` type from the `fp-ts` library.
  - Use `E.isRight(req.decoded)` to check if decoding was successful. If true,
    `req.decoded.right` contains the `DecodedRequest`.
  - Use `E.isLeft(req.decoded)` to check if decoding failed. If true, `req.decoded.left`
    contains the `t.Errors` object detailing the validation failures.

## Augmented Response (`res`)

The Express `response` object (`res`) passed to typed route handlers includes an
additional method:

### `res.sendEncoded(status, payload)`

Use this method instead of `res.json()` or `res.send()` when sending responses that
should conform to the API specification.

**Parameters:**

- `status` (`number`): The HTTP status code for the response. This status code **must**
  be a key defined in the `response` object of the `httpRoute` associated with the
  current route in the `ApiSpec`.
- `payload` (`any`): The data to be sent as the response body.

**Behavior:**

1.  **Type Checking:** Validates that the provided `payload` conforms to the `io-ts`
    codec associated with the given `status` in the `httpRoute`'s `response` definition.
2.  **Encoding:** Encodes the `payload` using the same `io-ts` codec. This handles
    necessary transformations (such as converting a `Date` object to an ISO string if
    using `DateFromISOString`, or a `bigint` to a string if using `BigIntFromString`).
3.  **Sending Response:** Sets the response status code to `status`, sets the
    `Content-Type` header to `application/json`, and sends the JSON-stringified encoded
    payload as the response body.
4.  **Error Handling:** If the `payload` fails validation against the codec for the
    specified `status`, calls the `onEncodeError` hook (route-specific or global).
5.  **Post-Response Hook:** After the response has been successfully sent, calls the
    `afterEncodedResponseSent` hook (route-specific or global).

**Example:**

```typescript
import { TypedRequestHandler } from '@api-ts/typed-express-router';
import { MyApi } from 'my-api-package';

// Assuming 'api.v1.getUser' route expects a { user: UserType } payload for status 200
const getUserHandler: TypedRequestHandler<MyApi['api.v1.getUser']['get']> = (
  req,
  res,
) => {
  const userId = req.decoded.userId; // Access decoded request data
  const user = findUserById(userId);

  if (!user) {
    // Assuming 404 is defined in the spec with an error object payload
    res.sendEncoded(404, { error: 'User not found' });
    return;
  }

  // Send status 200 with the UserType payload
  // 'sendEncoded' ensures 'user' matches the spec for status 200
  res.sendEncoded(200, { user: user });
};
```
