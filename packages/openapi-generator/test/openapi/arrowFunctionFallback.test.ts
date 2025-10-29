import { testCase } from './testHarness';

// SUCCESS CASE: Parameter-less arrow function should be parsed
testCase(
  'parameter-less arrow function is parsed and inlined',
  `
    import * as t from 'io-ts';
    
    const StringFactory = () => t.string;
    
    export const MyCodec = t.type({
      field: StringFactory(),
    });
  `,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {},
    components: {
      schemas: {
        MyCodec: {
          title: 'MyCodec',
          type: 'object',
          properties: {
            field: {
              type: 'string',
            },
          },
          required: ['field'],
        },
        StringFactory: {
          title: 'StringFactory',
        },
      },
    },
  },
);

// SUCCESS CASE: Parameter-less with BlockStatement
testCase(
  'parameter-less arrow function with BlockStatement is parsed',
  `
    import * as t from 'io-ts';
    
    const ComplexFactory = () => {
      return t.union([t.literal('true'), t.literal('false')]);
    };
    
    export const MyCodec = t.type({
      field: ComplexFactory(),
    });
  `,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {},
    components: {
      schemas: {
        MyCodec: {
          title: 'MyCodec',
          type: 'object',
          properties: {
            field: {
              type: 'string',
              enum: ['true', 'false'],
            },
          },
          required: ['field'],
        },
        ComplexFactory: {
          title: 'ComplexFactory',
        },
      },
    },
  },
);

// FALLBACK CASE: Arrow function with parameters should fallback to ref (not error)
testCase(
  'arrow function with parameters falls back to ref without error',
  `
    import * as t from 'io-ts';
    
    const optional = (codec) => t.union([codec, t.undefined]);
    
    export const MyCodec = t.type({
      field: optional(t.string),
    });
  `,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {},
    components: {
      schemas: {
        MyCodec: {
          title: 'MyCodec',
          type: 'object',
          properties: {
            field: {
              $ref: '#/components/schemas/optional',
            },
          },
          required: ['field'],
        },
        optional: {
          title: 'optional',
        },
      },
    },
  },
);

// FALLBACK CASE: Parameter-less calling function with parameters
testCase(
  'parameter-less function calling function with parameters falls back gracefully',
  `
    import * as t from 'io-ts';
    
    const optional = (codec) => t.union([codec, t.undefined]);
    const makeOptionalString = () => optional(t.string);
    
    export const MyCodec = t.type({
      field: makeOptionalString(),
    });
  `,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {},
    components: {
      schemas: {
        MyCodec: {
          title: 'MyCodec',
          type: 'object',
          properties: {
            field: {
              $ref: '#/components/schemas/optional',
            },
          },
          required: ['field'],
        },
        makeOptionalString: {
          title: 'makeOptionalString',
        },
        optional: {
          title: 'optional',
        },
      },
    },
  },
);

// FALLBACK CASE: BlockStatement without return should fallback (not error)
testCase(
  'BlockStatement without return falls back to ref without error',
  `
    import * as t from 'io-ts';
    
    const NoReturnFactory = () => {
      const x = t.string;
    };
    
    export const MyCodec = t.type({
      field: NoReturnFactory(),
    });
  `,
  {
    openapi: '3.0.3',
    info: {
      title: 'Test',
      version: '1.0.0',
    },
    paths: {},
    components: {
      schemas: {
        MyCodec: {
          title: 'MyCodec',
          type: 'object',
          properties: {
            field: {
              $ref: '#/components/schemas/NoReturnFactory',
            },
          },
          required: ['field'],
        },
        NoReturnFactory: {
          title: 'NoReturnFactory',
        },
      },
    },
  },
);
