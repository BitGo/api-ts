import { testCase } from './testHarness';

const NO_DESCRIPTIONS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

// Define an enum with no descriptions
const Status = t.keyof({
  active: 1,
  pending: 1,
  disabled: 1,
});

// Field using enum has no description
export const route = h.httpRoute({
  path: '/status',
  method: 'GET',
  request: h.httpRequest({
    query: {
      status: Status,
    },
  }),
  response: {
    200: t.string
  },
});
`;

testCase('enum with no descriptions', NO_DESCRIPTIONS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/status': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'status',
            required: true,
            schema: {
              $ref: '#/components/schemas/Status',
            },
          },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Status: {
        title: 'Status',
        type: 'string',
        enum: ['active', 'pending', 'disabled'],
      },
    },
  },
});

const ENUM_WITH_DESCRIPTION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * Status of a user account
 */
const Status = t.keyof({
  /** Account is active and can perform all operations */
  active: 1,
  /** Account is created but awaiting verification */
  pending: 1,
  /** Account has been disabled */
  disabled: 1,
});

// Field using enum has no description
export const route = h.httpRoute({
  path: '/status',
  method: 'GET',
  request: h.httpRequest({
    query: {
      status: Status,
    },
  }),
  response: {
    200: t.string
  },
});
`;

testCase('enum with descriptions, field without description', ENUM_WITH_DESCRIPTION, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/status': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'status',
            required: true,
            schema: {
              $ref: '#/components/schemas/Status',
            },
          },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Status: {
        title: 'Status',
        type: 'string',
        enum: ['active', 'pending', 'disabled'],
        description: 'Status of a user account',
        'x-enumDescriptions': {
          active: 'Account is active and can perform all operations',
          pending: 'Account is created but awaiting verification',
          disabled: 'Account has been disabled',
        },
      },
    },
  },
});

const FIELD_WITH_DESCRIPTION = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

// Enum has no description
const Status = t.keyof({
  active: 1,
  pending: 1,
  disabled: 1,
});

export const route = h.httpRoute({
  path: '/status',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /**
       * Status of the user account
       */
      status: Status,
    },
  }),
  response: {
    200: t.string
  },
});
`;

// In this case, where the field has a description but the enum does not, the parameter
// inherits the field description.
testCase('enum without description, field with description', FIELD_WITH_DESCRIPTION, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/status': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'status',
            description: 'Status of the user account',
            required: true,
            schema: {
              $ref: '#/components/schemas/Status',
            },
          },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Status: {
        title: 'Status',
        type: 'string',
        enum: ['active', 'pending', 'disabled'],
      },
    },
  },
});

const BOTH_WITH_DESCRIPTIONS = `
import * as t from 'io-ts';
import * as h from '@api-ts/io-ts-http';

/**
 * Status of a user account
 * @example pending
 */
const Status = t.keyof({
  /** Account is active and can perform all operations */
  active: 1,
  /** Account is created but awaiting verification */
  pending: 1,
  /**
   * Account has been disabled
   * @example This tag is ignored
   */
  disabled: 1,
});

export const route = h.httpRoute({
  path: '/status',
  method: 'GET',
  request: h.httpRequest({
    query: {
      /**
       * Current status filter for listing user accounts
       * @example active
       */
      status: Status,
    },
  }),
  response: {
    200: t.string
  },
});
`;

// In this case, where both the enum and the field have a description, the field description
// takes priority, but the enum variant descriptions are preserved.
testCase('enum with descriptions and field with description', BOTH_WITH_DESCRIPTIONS, {
  openapi: '3.0.3',
  info: {
    title: 'Test',
    version: '1.0.0',
  },
  paths: {
    '/status': {
      get: {
        parameters: [
          {
            in: 'query',
            name: 'status',
            description: 'Current status filter for listing user accounts',
            required: true,
            schema: {
              $ref: '#/components/schemas/Status',
            },
            example: 'active',
          },
        ],
        responses: {
          200: {
            description: 'OK',
            content: {
              'application/json': {
                schema: {
                  type: 'string',
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Status: {
        title: 'Status',
        type: 'string',
        enum: ['active', 'pending', 'disabled'],
        example: 'pending',
        description: 'Status of a user account',
        'x-enumDescriptions': {
          active: 'Account is active and can perform all operations',
          pending: 'Account is created but awaiting verification',
          disabled: 'Account has been disabled',
        },
      },
    },
  },
});
