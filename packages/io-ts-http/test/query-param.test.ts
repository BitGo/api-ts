import { assert } from 'chai';
import { flow } from 'fp-ts/lib/function';
import * as E from 'fp-ts/Either';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { arrayFromQueryParam, nonEmptyArrayFromQueryParam } from '../src/query-params';
import { NumberFromString } from 'io-ts-types';

describe('nonEmptyArrayFromQueryParam combinations', () => {
  const TestType = t.exact(
    t.partial({
      fruit: nonEmptyArrayFromQueryParam(t.string),
      veggies: nonEmptyArrayFromQueryParam(t.string),
    }),
  );
  type TestType = t.TypeOf<typeof TestType>;

  const convertParams = flow(
    TestType.decode,
    E.getOrElseW((e) => {
      throw new Error(`failed to parse bliss ${PathReporter.report(E.left(e))}`);
    }),
  );

  it('nonEmptyArrayFromQueryParam - no values', () => {
    assert.deepEqual(
      convertParams({
        bogus: 'ignore this',
      }),
      {},
      'should be empty',
    );
  });

  it('nonEmptyArrayFromQueryParam - single value', () => {
    assert.deepEqual(
      convertParams({
        fruit: 'raspberry',
      }),
      {
        fruit: ['raspberry'],
      },
      'should match single value',
    );
  });

  it('nonEmptyArrayFromQueryParam - single comma-delimited value', () => {
    assert.deepEqual(
      convertParams({
        fruit: 'raspberry,strawberry',
      }),
      {
        fruit: ['raspberry', 'strawberry'],
      },
      'should match comma delimited values',
    );
  });

  it('nonEmptyArrayFromQueryParam - multiple values', () => {
    assert.deepEqual(
      convertParams({
        fruit: ['raspberry', 'strawberry'],
      }),
      {
        fruit: ['raspberry', 'strawberry'],
      },
      'should match multiple values',
    );
  });

  it('nonEmptyArrayFromQueryParam - fruits and veggies', () => {
    assert.deepEqual(
      convertParams({
        fruit: ['raspberry', 'strawberry'],
        veggies: 'carrots,potatoes',
      }),
      {
        fruit: ['raspberry', 'strawberry'],
        veggies: ['carrots', 'potatoes'],
      },
      'should match fruits and veggies',
    );
  });
});

describe('nonEmptyArrayFromQueryParam parsed combinations', () => {
  const TestType = t.exact(
    t.partial({
      num: nonEmptyArrayFromQueryParam(NumberFromString),
    }),
  );
  type TestType = t.TypeOf<typeof TestType>;

  const convertParams = flow(
    TestType.decode,
    E.getOrElseW((e) => {
      throw new Error(PathReporter.report(E.left(e)).join('\n'));
    }),
  );

  it('nonEmptyArrayFromQueryParam - no values', () => {
    assert.deepEqual(
      convertParams({
        bogus: 'ignore this',
      }),
      {},
      'should be empty',
    );
  });

  it('nonEmptyArrayFromQueryParam - single value', () => {
    assert.deepEqual(
      convertParams({
        num: '1',
      }),
      {
        num: [1],
      },
      'should be single item array',
    );
  });

  it('nonEmptyArrayFromQueryParam - comma-delimited string', () => {
    assert.deepEqual(
      convertParams({
        num: '1,2',
      }),
      {
        num: [1, 2],
      },
      'should be array',
    );
  });

  it('nonEmptyArrayFromQueryParam - array', () => {
    assert.deepEqual(
      convertParams({
        num: ['1', '2'],
      }),
      {
        num: [1, 2],
      },
      'should be array',
    );
  });
});

describe('arrayFromQueryParam combinations', () => {
  const TestType = t.exact(
    t.partial({
      fruit: arrayFromQueryParam(t.string),
      veggies: arrayFromQueryParam(t.string),
    }),
  );
  type TestType = t.TypeOf<typeof TestType>;

  const convertParams = flow(
    TestType.decode,
    E.getOrElseW((e) => {
      throw new Error(PathReporter.report(E.left(e)).join('\n'));
    }),
  );

  it('arrayFromQueryParam - no values', () => {
    assert.deepEqual(
      convertParams({
        bogus: 'ignore this',
      }),
      {
        fruit: [],
        veggies: [],
      },
      'should be empty',
    );
  });

  it('arrayFromQueryParam - empty array', () => {
    assert.deepEqual(
      convertParams({
        fruit: [],
      }),
      {
        fruit: [],
        veggies: [],
      },
      'should match empty array',
    );
  });

  it('arrayFromQueryParam - single value', () => {
    assert.deepEqual(
      convertParams({
        fruit: 'raspberry',
      }),
      {
        fruit: ['raspberry'],
        veggies: [],
      },
      'should match single value',
    );
  });

  it('arrayFromQueryParam - single comma-delimited value', () => {
    assert.deepEqual(
      convertParams({
        fruit: 'raspberry,strawberry',
      }),
      {
        fruit: ['raspberry', 'strawberry'],
        veggies: [],
      },
      'should match comma delimited values',
    );
  });

  it('arrayFromQueryParam - multiple values', () => {
    assert.deepEqual(
      convertParams({
        fruit: ['raspberry', 'strawberry'],
      }),
      {
        fruit: ['raspberry', 'strawberry'],
        veggies: [],
      },
      'should match multiple values',
    );
  });

  it('arrayFromQueryParam - fruits and veggies', () => {
    assert.deepEqual(
      convertParams({
        fruit: ['raspberry', 'strawberry'],
        veggies: 'carrots,potatoes',
      }),
      {
        fruit: ['raspberry', 'strawberry'],
        veggies: ['carrots', 'potatoes'],
      },
      'should match fruits and veggies',
    );
  });
});
