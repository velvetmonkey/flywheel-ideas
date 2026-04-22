/**
 * Inline concurrency limiter (M9).
 *
 * Semaphore-backed queue with FIFO dispatch. Runs up to `maxConcurrent`
 * async tasks simultaneously; queues the rest and dispatches them in order
 * as slots free. Rejection in a task propagates through the returned
 * promise — it doesn't abort other in-flight or queued tasks.
 *
 * Zero external deps. No p-limit. ~50 LOC.
 *
 * Usage:
 *   const limiter = new ConcurrencyLimiter(3);
 *   const results = await Promise.allSettled(
 *     tasks.map(t => limiter.run(() => doWork(t)))
 *   );
 */

interface QueuedTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}

export class ConcurrencyLimiter {
  private _inFlight = 0;
  private readonly _queue: QueuedTask<unknown>[] = [];
  private readonly _maxConcurrent: number;

  constructor(maxConcurrent: number) {
    if (!Number.isInteger(maxConcurrent) || maxConcurrent < 1) {
      throw new RangeError(
        `ConcurrencyLimiter: maxConcurrent must be a positive integer, got ${maxConcurrent}`,
      );
    }
    this._maxConcurrent = maxConcurrent;
  }

  get maxConcurrent(): number {
    return this._maxConcurrent;
  }

  get inFlight(): number {
    return this._inFlight;
  }

  get queued(): number {
    return this._queue.length;
  }

  run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const task: QueuedTask<T> = { fn, resolve, reject };
      this._queue.push(task as QueuedTask<unknown>);
      this._drain();
    });
  }

  private _drain(): void {
    while (this._inFlight < this._maxConcurrent && this._queue.length > 0) {
      const task = this._queue.shift()!;
      this._inFlight++;
      // Use an IIFE so the caught error + settled branch both decrement
      // inFlight and re-drain. Task.fn can throw synchronously OR return a
      // rejected promise; both paths land in .catch().
      void (async () => {
        try {
          const value = await task.fn();
          task.resolve(value);
        } catch (err) {
          task.reject(err);
        } finally {
          this._inFlight--;
          this._drain();
        }
      })();
    }
  }
}
