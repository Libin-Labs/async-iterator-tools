export type AsyncSource<T> = AsyncIterable<T>;
async function step<T>(iterator: AsyncIterator<T>): Promise<IteratorResult<T>> {
  const result = await iterator.next();
  if (typeof result !== 'object' || result === null) throw new TypeError('Invalid iterator result');
  return result;
}
async function closeAll(iterators: AsyncIterator<unknown>[], errors: unknown[]): Promise<void> {
  for (let i = iterators.length - 1; i >= 0; i--) {
    try {
      const iterator = iterators[i];
      if (iterator?.return) {
        const result = await iterator.return();
        if (typeof result !== 'object' || result === null)
          throw new TypeError('Invalid iterator return result');
      }
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, 'Iteration and cleanup failed');
}
export async function* mapAsync<T, U>(
  source: AsyncSource<T>,
  mapper: (value: T, index: number) => U | Promise<U>,
): AsyncGenerator<U, void, unknown> {
  const iterator = source[Symbol.asyncIterator]();
  const errors: unknown[] = [];
  let done = false;
  let index = 0;
  try {
    while (true) {
      const next = await step(iterator);
      if (next.done) {
        done = true;
        return;
      }
      yield await mapper(next.value, index++);
    }
  } catch (error) {
    errors.push(error);
  } finally {
    await closeAll(done ? [] : [iterator], errors);
  }
}
export async function* filterAsync<T>(
  source: AsyncSource<T>,
  predicate: (value: T, index: number) => boolean | Promise<boolean>,
): AsyncGenerator<T, void, unknown> {
  const iterator = source[Symbol.asyncIterator]();
  const errors: unknown[] = [];
  let done = false;
  let index = 0;
  try {
    while (true) {
      const next = await step(iterator);
      if (next.done) {
        done = true;
        return;
      }
      if (await predicate(next.value, index++)) yield next.value;
    }
  } catch (error) {
    errors.push(error);
  } finally {
    await closeAll(done ? [] : [iterator], errors);
  }
}
export async function* takeAsync<T>(
  source: AsyncSource<T>,
  count: number,
): AsyncGenerator<T, void, unknown> {
  if (!Number.isSafeInteger(count) || count < 0)
    throw new RangeError('count must be a nonnegative safe integer');
  if (count === 0) return;
  const iterator = source[Symbol.asyncIterator]();
  const errors: unknown[] = [];
  let done = false;
  try {
    for (let index = 0; index < count; index++) {
      const next = await step(iterator);
      if (next.done) {
        done = true;
        return;
      }
      yield next.value;
    }
  } catch (error) {
    errors.push(error);
  } finally {
    await closeAll(done ? [] : [iterator], errors);
  }
}
export async function* zipAsync<A, B>(
  left: AsyncSource<A>,
  right: AsyncSource<B>,
): AsyncGenerator<readonly [A, B], void, unknown> {
  const iterators: AsyncIterator<unknown>[] = [];
  const errors: unknown[] = [];
  let aDone = false;
  let bDone = false;
  try {
    const a = left[Symbol.asyncIterator]();
    iterators.push(a);
    const b = right[Symbol.asyncIterator]();
    iterators.push(b);
    while (true) {
      const first = await step(a);
      if (first.done) {
        aDone = true;
        return;
      }
      const second = await step(b);
      if (second.done) {
        bDone = true;
        return;
      }
      yield [first.value, second.value] as const;
    }
  } catch (error) {
    errors.push(error);
  } finally {
    const active = iterators.filter((_, index) => (index === 0 ? !aDone : !bDone));
    await closeAll(active, errors);
  }
}
