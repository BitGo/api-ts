import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { isMainThread, Worker, workerData } from 'node:worker_threads';

import { runTest } from './test-corpus';

const CORPUS_DIRECTORY = path.resolve(__dirname, '..', 'corpus');

async function sleep_ms(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  /**
   * Implement a basic, implicit thread pool for running tests.
   *
   * First, some quick terminology:
   * - corpus: the set of declarative test cases
   * - test: a test case derived from the input and output declared in
   *         one file in the corpus
   *
   * Each file in the corpus defines an api-ts `apiSpec` and the expected
   * OpenAPI specification it should produce. This is a synchronous proces, but
   * the implementation of the test harness that verifies each corpus file makes
   * this a compute-bound process. Consequently, we want some parallelization,
   * which in this implementation is provided by a basic thread pool.
   *
   * This thread pool has at most one worker per CPU core. Because the work is
   * CPU bound, scheduling more software workers than physical workers will just
   * add overhead in scheduling thrashing.
   *
   * This implementation is called an implicit thread pool because there is no
   * formal implementation of the limit of concurrent workers; instead, each
   * worker tries to create a replacement worker when it completes its singular
   * assigned task. This is less optimal than having a long-lived worker per CPU
   * core, but with the small number of test cases in our corpus it shouldn't
   * matter much.
   *
   * While the workers are handling each test, the main thread spin-loops until
   * all children to report success or failure.
   */
  const testQueue = fs.readdirSync(CORPUS_DIRECTORY);
  const numTests = testQueue.length;
  let completedTests = 0;

  function handleTestCompletion(): void {
    completedTests += 1;
    startTest(testQueue.pop());
  }

  function startTest(testFilename: string | undefined): void {
    if (testFilename === undefined) {
      // base case: do nothing
      return;
    }

    new Promise<void>((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: testFilename,
      });
      worker.on('error', () => {
        handleTestCompletion();
        reject();
      });
      worker.on('exit', (code) => {
        handleTestCompletion();
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        } else {
          resolve();
        }
      });
    });
  }

  const numCores = os.cpus();
  for (const _ of numCores) {
    startTest(testQueue.pop());
  }

  // A synchronization barrier that waits for all tests to complete
  while (completedTests < numTests) {
    await sleep_ms(10);
  }
}

function workerMain() {
  const testFilename = workerData;
  runTest(testFilename);
}

if (isMainThread) {
  main();
} else {
  workerMain();
}
