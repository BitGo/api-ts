import * as E from 'fp-ts/lib/Either';
import { type NestedDirectoryJSON } from 'memfs';
import assert from 'node:assert';
import test from 'node:test';

import { TestProject } from './testProject';
import { parseCodecInitializer, Project, type Schema } from '../src';

async function testCase(
  description: string,
  files: NestedDirectoryJSON,
  entryPoint: string,
  expected: Record<string, Schema>,
  expectedErrors: string[] = [],
) {
  test(description, async () => {
    let project: Project = new TestProject(files);
    const projectE = await project.parseEntryPoint(entryPoint);
    if (E.isLeft(projectE)) {
      throw new Error(projectE.left);
    }
    project = projectE.right;

    const sourceFile = project.get(entryPoint);
    if (sourceFile === undefined) {
      throw new Error(`Could not find source file ${entryPoint}`);
    }

    const actual: Record<string, Schema> = {};
    const errors: string[] = [];
    for (const symbol of sourceFile.symbols.declarations) {
      if (symbol.init !== undefined) {
        const result = parseCodecInitializer(project, sourceFile, symbol.init);
        if (E.isLeft(result)) {
          errors.push(result.left);
        } else {
          if (symbol.comment !== undefined) {
            result.right.comment = symbol.comment;
          }
          actual[symbol.name] = result.right;
        }
      }
    }

    assert.deepStrictEqual(errors, expectedErrors);
    assert.deepStrictEqual(actual, expected);
  });
}

const OBJECT_CONST = `
import * as t from 'io-ts';
const fooProps = { foo: t.string };
export const FOO = t.type(fooProps);
`;

testCase(
  'const props initializer is parsed',
  { '/index.ts': OBJECT_CONST },
  '/index.ts',
  {
    FOO: {
      type: 'object',
      properties: { foo: { type: 'string' } },
      required: ['foo'],
    },
  },
  ['Unimplemented initializer type ObjectExpression'],
);

const ARRAY_CONST = `
import * as t from 'io-ts';
const fooUnion = [t.string, t.number];
export const FOO = t.union(fooUnion);
`;

testCase(
  'const array initializer is parsed',
  { '/index.ts': ARRAY_CONST },
  '/index.ts',
  {
    FOO: {
      type: 'union',
      schemas: [{ type: 'string' }, { type: 'number' }],
    },
  },
  ['Unimplemented initializer type ArrayExpression'],
);

const KEYOF_CONST = `
import * as t from 'io-ts';
const fooKeys = {
  foo: 1,
  bar: 1,
};
export const FOO = t.keyof(fooKeys);
`;

testCase(
  'const keyof initializer is parsed',
  { '/index.ts': KEYOF_CONST },
  '/index.ts',
  {
    FOO: {
      type: 'union',
      schemas: [
        { type: 'string', enum: ['foo'] },
        { type: 'string', enum: ['bar'] },
      ],
    },
  },
  ['Unimplemented initializer type ObjectExpression'],
);

const LITERAL_CONST = `
import * as t from 'io-ts';
const foo = 42;
export const FOO = t.literal(foo);
`;

testCase(
  'const literal initializer is parsed',
  { '/index.ts': LITERAL_CONST },
  '/index.ts',
  {
    FOO: { type: 'number', enum: [42] },
  },
  ['Unimplemented initializer type NumericLiteral'],
);

const CROSS_FILE_IMPORT = {
  '/foo.ts': `
    import * as t from 'io-ts';
    export const Foo = t.type({ foo: t.string });
  `,
  '/index.ts': `
    import * as t from 'io-ts';
    import { Foo } from './foo';
    export const FOO = t.type({ foo: Foo });
  `,
};

testCase('cross-file import is parsed', CROSS_FILE_IMPORT, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      foo: {
        type: 'ref',
        name: 'Foo',
        location: '/foo.ts',
      },
    },
    required: ['foo'],
  },
});

const CROSS_FILE_MULTI_EXPORT = {
  '/foo.ts': `
    import * as t from 'io-ts';
    export const Foo = t.type({ foo: t.string });
    export const Bar = t.type({ bar: t.number });
  `,
  '/index.ts': `
    import * as t from 'io-ts';
    import { Bar } from './foo';
    export const FOO = t.type({ bar: Bar });
  `,
};

testCase('correct export is parsed', CROSS_FILE_MULTI_EXPORT, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      bar: {
        type: 'ref',
        name: 'Bar',
        location: '/foo.ts',
      },
    },
    required: ['bar'],
  },
});

const SPLIT_IMPORT = {
  '/foo.ts': `
    import * as t from 'io-ts';
    const Foo = t.type({ foo: t.string });
    export { Foo };
  `,
  '/index.ts': `
    import * as t from 'io-ts';
    import { Foo } from './foo';
    export const FOO = t.type({ foo: Foo });
  `,
};

testCase('cross-file split import is parsed', SPLIT_IMPORT, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      foo: {
        type: 'ref',
        name: 'Foo',
        location: '/foo.ts',
      },
    },
    required: ['foo'],
  },
});

const STAR_IMPORT = {
  '/foo.ts': `
    import * as t from 'io-ts';
    export const Foo = t.type({ foo: t.string });
  `,
  '/index.ts': `
    import * as t from 'io-ts';
    import * as f from './foo';
    export const FOO = t.type({ foo: f.Foo });
  `,
};

testCase('cross-file star import is parsed', STAR_IMPORT, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      foo: {
        type: 'ref',
        name: 'Foo',
        location: '/foo.ts',
      },
    },
    required: ['foo'],
  },
});

const DIR_IMPORT = {
  '/foo': {
    '/bar.ts': `
      import * as t from 'io-ts';
      export const Foo = t.type({ foo: t.string });
  `,
  },
  '/index.ts': `
    import * as t from 'io-ts';
    import { Foo } from './foo/bar';
    export const FOO = t.type({ foo: Foo });
  `,
};

testCase('cross-file import in another directory is parsed', DIR_IMPORT, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      foo: {
        type: 'ref',
        name: 'Foo',
        location: '/foo/bar.ts',
      },
    },
    required: ['foo'],
  },
});

const DIR_DEFAULT_IMPORT = {
  '/foo': {
    '/index.ts': `
      import * as t from 'io-ts';
      export const Foo = t.type({ foo: t.string });
  `,
  },
  '/index.ts': `
    import * as t from 'io-ts';
    import { Foo } from './foo';
    export const FOO = t.type({ foo: Foo });
  `,
};

testCase(
  'cross-file default import in another directory is parsed',
  DIR_DEFAULT_IMPORT,
  '/index.ts',
  {
    FOO: {
      type: 'object',
      properties: {
        foo: {
          type: 'ref',
          name: 'Foo',
          location: '/foo/index.ts',
        },
      },
      required: ['foo'],
    },
  },
);

const EXPORT_ALIAS = {
  '/foo.ts': `
    import * as t from 'io-ts';
    const Foo = t.type({ foo: t.string });
    export { Foo as Bar };
  `,
  '/index.ts': `
    import * as t from 'io-ts';
    import { Bar } from './foo';
    export const FOO = t.type({ bar: Bar });
  `,
};

testCase('cross-file aliased export is parsed', EXPORT_ALIAS, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      bar: {
        type: 'ref',
        name: 'Bar',
        location: '/foo.ts',
      },
    },
    required: ['bar'],
  },
});

const EXPORT_FROM = {
  '/foo': {
    '/index.ts': `
      export { Foo } from './bar';
    `,
    '/bar.ts': `
      import * as t from 'io-ts';
      export const Foo = t.type({ foo: t.string });
  `,
  },
  '/index.ts': `
    import * as t from 'io-ts';
    import { Foo } from './foo';
    export const FOO = t.type({ foo: Foo });
  `,
};

testCase('cross-file export from is parsed', EXPORT_FROM, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      foo: {
        type: 'ref',
        name: 'Foo',
        location: '/foo/bar.ts',
      },
    },
    required: ['foo'],
  },
});

// TODO: Support this case
/*const EXPORT_FROM_ALIAS = {
  '/foo': {
    '/index.ts': `
      export { Foo as Fuzz } from './bar';
    `,
    '/bar.ts': `
      import * as t from 'io-ts';
      export const Foo = t.type({ foo: t.string });
  `,
  },
  '/index.ts': `
    import * as t from 'io-ts';
    import { Fuzz } from './foo';
    export const FOO = t.type({ foo: Fuzz });
  `,
};

testCase('cross-file aliased export from is parsed', EXPORT_FROM_ALIAS, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      foo: {
        type: 'ref',
        name: 'Foo',
        location: '/foo/bar.ts',
      },
    },
    required: ['foo'],
  },
});*/

const STAR_EXPORT = {
  '/foo.ts': `
    export * from './bar';
  `,
  '/bar.ts': `
    import * as t from 'io-ts';
    export const Foo = t.type({ foo: t.string });
  `,
  '/index.ts': `
    import * as t from 'io-ts';
    import { Foo } from './foo';
    export const FOO = t.type({ foo: Foo });
  `,
};

testCase('cross-file star export is parsed', STAR_EXPORT, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      foo: {
        type: 'ref',
        name: 'Foo',
        location: '/bar.ts',
      },
    },
    required: ['foo'],
  },
});

const DEFAULT_EXPORT = {
  '/foo': {
    '/bar.ts': `
      import * as t from 'io-ts';
      const Foo = t.type({ foo: t.string });
      export default Foo;
  `,
  },
  '/index.ts': `
    import * as t from 'io-ts';
    import Foo from './foo/bar';
    export const FOO = t.type({ foo: Foo });
  `,
};

testCase('cross-file default export is parsed', DEFAULT_EXPORT, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      foo: {
        type: 'ref',
        // TODO: Use the local declaration name in this case
        name: 'default',
        location: '/foo/bar.ts',
      },
    },
    required: ['foo'],
  },
});

const STAR_EXPORT_STAR_IMPORT = {
  '/foo': {
    '/index.ts': `
      export * from './bar';
    `,
    '/bar.ts': `
      import * as t from 'io-ts';
      export const Foo = t.type({ foo: t.string });
  `,
  },
  '/index.ts': `
    import * as t from 'io-ts';
    import * as f from './foo';
    export const FOO = t.type({ foo: f.Foo });
  `,
};

testCase(
  'cross-file star export and star import is parsed',
  STAR_EXPORT_STAR_IMPORT,
  '/index.ts',
  {
    FOO: {
      type: 'object',
      properties: {
        foo: {
          type: 'ref',
          name: 'Foo',
          location: '/foo/bar.ts',
        },
      },
      required: ['foo'],
    },
  },
);

const STAR_MULTI_EXPORT = {
  '/foo.ts': `
    export * from './bar';
    export * from './baz';
  `,
  '/bar.ts': `
    import * as t from 'io-ts';
    export const Foo = t.type({ foo: t.string });
  `,
  '/baz.ts': `
    import * as t from 'io-ts';
    export const Baz = t.type({ baz: t.string });
  `,
  '/index.ts': `
    import * as t from 'io-ts';
    import { Baz } from './foo';
    export const FOO = t.type({ baz: Baz });
  `,
};

testCase('cross-file star multi export is parsed', STAR_MULTI_EXPORT, '/index.ts', {
  FOO: {
    type: 'object',
    properties: {
      baz: {
        type: 'ref',
        name: 'Baz',
        location: '/baz.ts',
      },
    },
    required: ['baz'],
  },
});

const IMPORT_MEMBER_EXPRESSION = {
  '/foo.ts': `
    import * as t from 'io-ts';
    export const Foos = {
      foo: t.number,
    }
  `,
  '/index.ts': `
    import * as t from 'io-ts';
    import { Foos } from './foo';
    export const FOO = t.type({ foo: Foos.foo });
  `,
};

testCase(
  'cross-file import member expression is parsed',
  IMPORT_MEMBER_EXPRESSION,
  '/index.ts',
  {
    FOO: {
      type: 'object',
      properties: {
        foo: { type: 'number' },
      },
      required: ['foo'],
    },
  },
);
