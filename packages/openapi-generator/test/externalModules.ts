const IO_TS_CONTENTS = `
export const type = (props: any) => ({ type: 'object', ...props });
export const string = { type: 'string' };
export const number = { type: 'number' };
export const union = (schemas: any[]) => ({ type: 'union', schemas });
export const keyof = (keys: any) => ({ type: 'union', schemas: Object.keys(keys).map((key) => ({ type: 'string', enum: [key] })) });
export const literal = (value: any) => ({ type: typeof value, enum: [value] });
`;

const IO_TS_PACKAGE_JSON = `{
  "name": "io-ts",
  "version": "1.0.0",
  "main": "dist/src/index.js",
  "types": "dist/src/index.d.ts"
}`;

const IO_TS_HTTP_PACKAGE_JSON = `{
  "name": "@api-ts/io-ts-http",
  "version": "1.0.0",
  "main": "dist/src/index.js",
  "types": "dist/src/index.d.ts"
}`;

export const MOCK_NODE_MODULES_DIR = {
  '/node_modules': {
    '/@api-ts': {
      '/io-ts-http': {
        '/dist': {
          '/src': {
            '/index.js': ``,
          },
        },
        '/package.json': IO_TS_HTTP_PACKAGE_JSON,
      },
    },
    '/io-ts': {
      '/dist': {
        '/src': {
          '/index.js': IO_TS_CONTENTS,
        },
      },
      '/package.json': IO_TS_PACKAGE_JSON,
    },
  },
};
