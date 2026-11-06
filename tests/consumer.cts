import { mapAsync, zipAsync } from '@lp-labs/async-iterator-tools';
async function* numbers() {
  yield 1;
}
const strings: AsyncIterable<string> = mapAsync(numbers(), (n) => String(n));
const pairs: AsyncIterable<readonly [number, number]> = zipAsync(numbers(), numbers());
void strings;
void pairs;
// @ts-expect-error async iterable required
mapAsync([1, 2], (n) => n);
// @ts-expect-error mapper retains type
const invalid: AsyncIterable<number> = mapAsync(numbers(), (n) => String(n));
void invalid;
