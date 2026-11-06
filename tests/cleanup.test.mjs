import { test } from 'node:test';
import assert from 'node:assert/strict';
import { zipAsync, mapAsync, takeAsync } from '../dist/esm/index.js';

test('zip attempts both return callbacks even when both throw', async () => {
  const closed = [];
  const source = (name) => ({
    [Symbol.asyncIterator]() {
      return {
        next: async () => ({ done: false, value: name }),
        return: async () => {
          closed.push(name);
          throw name;
        },
      };
    },
  });
  const iterator = zipAsync(source('left'), source('right'));
  await iterator.next();
  await assert.rejects(
    iterator.return(),
    (error) =>
      error instanceof AggregateError && error.errors[0] === 'right' && error.errors[1] === 'left',
  );
  assert.deepEqual(closed, ['right', 'left']);
});

test('consumer throw undefined is preserved while cleanup is still attempted', async () => {
  let closed = false;
  const source = {
    async *[Symbol.asyncIterator]() {
      try {
        yield 1;
      } finally {
        closed = true;
      }
    },
  };
  const iterator = mapAsync(source, (value) => value);
  await iterator.next();
  let failed = false;
  try {
    await iterator.throw(undefined);
  } catch (error) {
    failed = true;
    assert.equal(error, undefined);
  }
  assert.equal(failed, true);
  assert.equal(closed, true);
});

test('malformed next and return protocol results fail explicitly', async () => {
  const badNext = {
    [Symbol.asyncIterator]() {
      return { next: async () => 1 };
    },
  };
  await assert.rejects(mapAsync(badNext, (x) => x).next(), TypeError);
  const badReturn = {
    [Symbol.asyncIterator]() {
      return { next: async () => ({ done: false, value: 1 }), return: async () => undefined };
    },
  };
  const iterator = takeAsync(badReturn, 1);
  await iterator.next();
  await assert.rejects(iterator.next(), TypeError);
});
