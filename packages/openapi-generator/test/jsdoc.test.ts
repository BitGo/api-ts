import { parse as parseComment } from 'comment-parser';
import assert from 'node:assert/strict';
import test from 'node:test';

import { parseCommentBlock, type JSDoc } from '../src';

function parseJSDoc(comment: string): JSDoc {
  const block = parseComment(comment)[0];
  if (block === undefined) {
    throw new Error('Expected comment block');
  }
  return parseCommentBlock(block);
}

test('comment with description only', () => {
  const comment = `
    /**
     * A simple route
     */
  `;

  const expected: JSDoc = {
    summary: 'A simple route',
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('comment with description and summary', () => {
  const comment = `
    /**
     * A simple route
     *
     * This is a description
     */
  `;

  const expected: JSDoc = {
    summary: 'A simple route',
    description: 'This is a description',
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('comment with description and summary with empty tags', () => {
  const comment = `
    /**
     * A simple route
     *
     * This is a description
     *
     * @tag1
     * @tag2
     */
  `;

  const expected: JSDoc = {
    summary: 'A simple route',
    description: 'This is a description',
    tags: {
      tag1: '',
      tag2: '',
    },
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('comment with description and summary with tags', () => {
  const comment = `
    /**
     * A simple route
     *
     * This is a description
     *
     * @tag1 This is a tag
     */
  `;

  const expected: JSDoc = {
    summary: 'A simple route',
    description: 'This is a description',
    tags: {
      tag1: 'This is a tag',
    },
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('comment with description and multi-line markdown summary', () => {
  const comment = `
    /**
     * A simple route
     *
     * This is a description
     *
     * \`\`\`
     * This is a code block
     * \`\`\`
     */
  `;

  const expected: JSDoc = {
    summary: 'A simple route',
    description: 'This is a description\n\n```\nThis is a code block\n```',
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('comment with a summary and tags', () => {
  const comment = `
    /**
     * A simple route
     *
     * @tag1 This is a tag
     */
  `;

  const expected: JSDoc = {
    summary: 'A simple route',
    tags: {
      tag1: 'This is a tag',
    },
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('comment with a summary, description, and a tag in the middle of the description', () => {
  const comment = `
    /**
     * A simple route
     *
     * This is a description
     *
     * @tag1 This is a tag
     *
     * This is still the description
     */
  `;

  const expected: JSDoc = {
    summary: 'A simple route',
    description: 'This is a description\n\n\nThis is still the description',
    tags: {
      tag1: 'This is a tag',
    },
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('parameter with a comment and an example string', () => {
  const comment = `
    /**
     * A variable with example
     * 
     * @example foo
     */
  `;

  const expected: JSDoc = {
    summary: 'A variable with example',
    tags: {
      example: 'foo',
    },
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('parameter with a comment and an example object', () => {
  const comment = `
    /**
     * A variable with example
     * 
     * @example { "test": "foo" }
     */
  `;

  const expected: JSDoc = {
    summary: 'A variable with example',
    // @ts-expect-error parser doesn't properly infer type
    tags: {
      example: { test: 'foo' },
    },
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('parameter with a comment and an example object (multi-line)', () => {
  const comment = `
    /**
     * A variable with example
     * 
     * @example {
     *   "test": "foo"
     * }
     */
  `;

  const expected: JSDoc = {
    summary: 'A variable with example',
    // @ts-expect-error parser doesn't properly infer type
    tags: {
      example: { test: 'foo' },
    },
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('parameter with a comment and an example array', () => {
  const comment = `
    /**
     * A variable with example
     * 
     * @example ["foo", "bar", "baz"]
     */
  `;

  const expected: JSDoc = {
    summary: 'A variable with example',
    // @ts-expect-error parser doesn't properly infer type
    tags: {
      example: ['foo', 'bar', 'baz'],
    },
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('parameter with a comment and an invalid example object', () => {
  const comment = `
    /**
     * A variable with example
     * 
     * @example { "test": "foo"
     */
  `;

  assert.throws(() => parseJSDoc(comment), {
    message: '@example contains invalid JSON',
  });
});

test('parameter with a comment and an invalid example object (multi-line)', () => {
  const comment = `
    /**
     * A variable with example
     * 
     * @example {
     *   "test": "foo"
     */
  `;

  assert.throws(() => parseJSDoc(comment), {
    message: '@example contains invalid JSON',
  });
});

test('parameter with a comment and an invalid example array', () => {
  const comment = `
    /**
     * A variable with example
     * 
     * @example ["foo", "bar", "baz"
     */
  `;

  assert.throws(() => parseJSDoc(comment), {
    message: '@example contains invalid JSON',
  });
});

test('parameter with a comment, an example object and a tag', () => {
  const comment = `
    /**
     * A variable with example
     * 
     * @example { "test": "foo" }
     * @tag api.example.test
     */
  `;

  const expected: JSDoc = {
    summary: 'A variable with example',
    // @ts-expect-error parser doesn't properly infer type
    tags: {
      example: { test: 'foo' },
      tag: 'api.example.test',
    },
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});

test('parameter with a comment, an example object (multi-line) and a tag', () => {
  const comment = `
    /**
     * A variable with example
     * 
     * @example {
     *   "test": "foo"
     * }
     * @tag api.example.test
     */
  `;

  const expected: JSDoc = {
    summary: 'A variable with example',
    // @ts-expect-error parser doesn't properly infer type
    tags: {
      example: { test: 'foo' },
      tag: 'api.example.test',
    },
  };

  assert.deepEqual(parseJSDoc(comment), expected);
});
