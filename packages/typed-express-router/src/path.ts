// Converts an io-ts-http path to an express one
// assumes that only simple path parameters are present and the wildcard features in express
// arent used.

const PATH_PARAM = /{(\w+)}/g;

export const apiTsPathToExpress = (inputPath: string) =>
  inputPath.replace(PATH_PARAM, ':$1');
