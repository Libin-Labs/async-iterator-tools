# @lp-labs/async-iterator-tools

Demand-driven sequential async map, filter, take, and zip with explicit cleanup.

## Install

```sh
npm install @lp-labs/async-iterator-tools
```

Zero runtime, peer, or sibling dependencies. Node 18+; strict TypeScript declarations and independent ESM/CommonJS builds. Version 0.1.0, MIT.

## Quickstart

```js
import { mapAsync, filterAsync, takeAsync, zipAsync } from '@lp-labs/async-iterator-tools';
async function* numbers() {
  yield 1;
  yield 2;
  yield 3;
}
for await (const value of takeAsync(
  filterAsync(
    mapAsync(numbers(), (n) => n * 2),
    (n) => n > 2,
  ),
  1,
)) {
  console.log(value); // 4
}
for await (const pair of zipAsync(numbers(), numbers())) console.log(pair);
```

## API and contracts

AsyncSource accepts only AsyncIterable; no sync iterable coercion. mapAsync and filterAsync await callbacks sequentially with zero-based input indexes; takeAsync validates count on first next and never opens a zero-count source. zipAsync pulls left then right, stops at shortest, and may consume one unmatched left item when right ends. No prefetch, parallel mapping, or merge scheduler. Natural exhaustion does not call return; early termination/failure closes all opened nonexhausted iterators in reverse order. A sole thrown value (including undefined) is preserved; multiple primary/cleanup failures produce AggregateError.errors in primary-then-cleanup order. A pending next cannot be forcibly interrupted; filtering may consume unbounded input for one match. O(1) internal buffered items; caller must close abandoned iterators.

Malformed next/return results raise TypeError instead of silently accepting a broken iteration protocol.

## Full declarations

The complete public declarations below are generated from the package's strict source. All runtime exports, interfaces, options, return types and readonly state are listed here.

<!-- declarations -->

```ts
export type AsyncSource<T> = AsyncIterable<T>;
export declare function mapAsync<T, U>(
  source: AsyncSource<T>,
  mapper: (value: T, index: number) => U | Promise<U>,
): AsyncGenerator<U, void, unknown>;
export declare function filterAsync<T>(
  source: AsyncSource<T>,
  predicate: (value: T, index: number) => boolean | Promise<boolean>,
): AsyncGenerator<T, void, unknown>;
export declare function takeAsync<T>(
  source: AsyncSource<T>,
  count: number,
): AsyncGenerator<T, void, unknown>;
export declare function zipAsync<A, B>(
  left: AsyncSource<A>,
  right: AsyncSource<B>,
): AsyncGenerator<readonly [A, B], void, unknown>;
```

<!-- end declarations -->

## Development

```sh
npm ci --offline
npm run build
npm run typecheck
npm test
npm run format:check
```

All tests use deterministic clocks, immediate injected sleeps, or explicit promise gates rather than timing guesses. Package exports select ESM for import and CommonJS for require, with separate declaration trees. No runtime configuration files or global hooks.

## Support

If this library is useful to you, consider supporting its maintenance with a [donation via PayPal](https://www.paypal.me/LibinPrasanth).

## Author

Created by [Libin Prasanth](https://www.linkedin.com/in/libinprasanth/). Connect on LinkedIn for updates and discussion.
