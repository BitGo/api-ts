import * as fs from 'fs';
import * as path from 'path';

import test from 'ava';

const basenameNoExtension = (file: string) => path.basename(file).split('.')[0];

test('every file in the corpus has a corresponding test file', async (t) => {
  const testDefinitionFiles = await fs.readdirSync(
    path.resolve(__dirname, '..', '..', '..', 'corpus'),
  );
  const definitionSet = new Set(testDefinitionFiles.map(basenameNoExtension));

  const testRunnerFiles = await fs.readdirSync(path.resolve(__dirname));
  const runnerSet = new Set(
    testRunnerFiles
      .map(basenameNoExtension)
      .filter((file) => file !== basenameNoExtension(__filename)),
  );

  t.deepEqual(
    runnerSet,
    definitionSet,
    'Corpus definition files should match test runner files 1:1',
  );
});
