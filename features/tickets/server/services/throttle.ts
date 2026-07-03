import "server-only";

/**
 * Fixed-concurrency worker pool — imitates a bounded connection pool rather than firing every item at
 * once. Shared by the sync bulk path and the async job runner so both process items the same way.
 */
export async function runPool<T, R>(
  items: ReadonlyArray<T>,
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<Array<R>> {
  const results: Array<R> = new Array(items.length);
  const queue = items.map((item, index) => ({ index, item }));

  async function runWorker(): Promise<void> {
    let next = queue.shift();
    while (next) {
      results[next.index] = await worker(next.item, next.index);
      next = queue.shift();
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: workerCount }, runWorker));
  return results;
}
