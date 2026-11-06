import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as library from '../dist/esm/index.js';
const { mapAsync, filterAsync, takeAsync, zipAsync } = library;

async function collect(source) {
  const out = [];
  for await (const value of source) out.push(value);
  return out;
}
function source(values, stats = {}) {
  return {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        async next() {
          stats.next = (stats.next ?? 0) + 1;
          return i < values.length ? { value: values[i++], done: false } : { done: true };
        },
        async return() {
          stats.closed = (stats.closed ?? 0) + 1;
          return { done: true };
        },
      };
    },
  };
}
test('map is ordered and demand driven', async () => {
  const stats = {};
  const mapped = mapAsync(source([2, 4], stats), (v, i) => v + i);
  assert.equal(stats.next, undefined);
  assert.equal((await mapped.next()).value, 2);
  assert.equal(stats.next, 1);
  await mapped.return();
  assert.equal(stats.closed, 1);
});
test('filter indexes all input and preserves values', async () => {
  assert.deepEqual(
    await collect(filterAsync(source([2, 3, 4]), (v, i) => v === i + 2 && i !== 1)),
    [2, 4],
  );
});
test('take closes early and zero never opens source', async () => {
  const stats = {};
  assert.deepEqual(await collect(takeAsync(source([1, 2, 3], stats), 2)), [1, 2]);
  assert.equal(stats.next, 2);
  assert.equal(stats.closed, 1);
  assert.deepEqual(
    await collect(
      takeAsync(
        {
          [Symbol.asyncIterator]() {
            throw 1;
          },
        },
        0,
      ),
    ),
    [],
  );
});
test('zip stops at shortest and closes active side', async () => {
  const a = {},
    b = {};
  assert.deepEqual(await collect(zipAsync(source([1], a), source(['a', 'b'], b))), [[1, 'a']]);
  assert.equal(a.next, 2);
  assert.equal(b.next, 1);
  assert.equal(b.closed, 1);
});
test('mapper thrown undefined is preserved and source closed', async () => {
  const stats = {};
  let caught = false;
  try {
    await collect(
      mapAsync(source([1], stats), () => {
        throw undefined;
      }),
    );
  } catch (e) {
    caught = true;
    assert.equal(e, undefined);
  }
  assert.equal(caught, true);
  assert.equal(stats.closed, 1);
});
test('cleanup failures aggregate primary undefined and all closes', async () => {
  const fail = {
    [Symbol.asyncIterator]() {
      return {
        async next() {
          return { value: 1, done: false };
        },
        async return() {
          throw 'close';
        },
      };
    },
  };
  await assert.rejects(
    collect(
      mapAsync(fail, () => {
        throw undefined;
      }),
    ),
    (e) =>
      e instanceof AggregateError &&
      e.errors.length === 2 &&
      e.errors[0] === undefined &&
      e.errors[1] === 'close',
  );
  await assert.rejects(collect(takeAsync(source([]), -1)), RangeError);
  let closed = 0;
  const left = {
    [Symbol.asyncIterator]() {
      return {
        next: async () => ({ value: 1, done: false }),
        return: async () => {
          closed++;
          return { done: true };
        },
      };
    },
  };
  await assert.rejects(
    collect(
      zipAsync(left, {
        [Symbol.asyncIterator]() {
          throw 'open';
        },
      }),
    ),
    (e) => e === 'open',
  );
  assert.equal(closed, 1);
});
