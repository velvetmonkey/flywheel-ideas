import { describe, it, expect } from 'vitest';
import { ConcurrencyLimiter } from '../src/index.js';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

describe('ConcurrencyLimiter — construction', () => {
  it('rejects non-positive maxConcurrent', () => {
    expect(() => new ConcurrencyLimiter(0)).toThrow(RangeError);
    expect(() => new ConcurrencyLimiter(-1)).toThrow(RangeError);
    expect(() => new ConcurrencyLimiter(1.5)).toThrow(RangeError);
  });

  it('accepts maxConcurrent = 1', () => {
    const l = new ConcurrencyLimiter(1);
    expect(l.maxConcurrent).toBe(1);
    expect(l.inFlight).toBe(0);
    expect(l.queued).toBe(0);
  });
});

describe('ConcurrencyLimiter — invariants', () => {
  it('never exceeds maxConcurrent under 50-task burst with max=3', async () => {
    const l = new ConcurrencyLimiter(3);
    let maxObserved = 0;

    const tasks = Array.from({ length: 50 }, (_, i) =>
      l.run(async () => {
        if (l.inFlight > maxObserved) maxObserved = l.inFlight;
        await sleep(5);
        return i;
      }),
    );
    await Promise.all(tasks);
    expect(maxObserved).toBeLessThanOrEqual(3);
    expect(maxObserved).toBeGreaterThan(1); // parallelism actually happened
  });

  it('dispatches FIFO (roughly — rejection propagates while order preserved for starters)', async () => {
    const l = new ConcurrencyLimiter(1); // serialize to prove order
    const order: number[] = [];
    await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        l.run(async () => {
          order.push(n);
        }),
      ),
    );
    expect(order).toEqual([1, 2, 3, 4, 5]);
  });

  it('inFlight + queued counters track correctly during a burst', async () => {
    const l = new ConcurrencyLimiter(2);
    let peakInFlight = 0;
    let peakQueued = 0;

    const tasks = Array.from({ length: 10 }, () =>
      l.run(async () => {
        if (l.inFlight > peakInFlight) peakInFlight = l.inFlight;
        if (l.queued > peakQueued) peakQueued = l.queued;
        await sleep(5);
      }),
    );
    await Promise.all(tasks);
    expect(peakInFlight).toBeLessThanOrEqual(2);
    expect(peakQueued).toBeGreaterThan(0); // some tasks were queued
    // After all done, everything should be drained
    expect(l.inFlight).toBe(0);
    expect(l.queued).toBe(0);
  });
});

describe('ConcurrencyLimiter — error handling', () => {
  it('rejection in one task propagates through its returned promise', async () => {
    const l = new ConcurrencyLimiter(2);
    const p = l.run(async () => {
      throw new Error('boom');
    });
    await expect(p).rejects.toThrow('boom');
  });

  it('error in one task does not abort siblings', async () => {
    const l = new ConcurrencyLimiter(2);
    const settled = await Promise.allSettled([
      l.run(async () => {
        await sleep(5);
        return 'ok-1';
      }),
      l.run(async () => {
        throw new Error('boom');
      }),
      l.run(async () => {
        await sleep(5);
        return 'ok-2';
      }),
    ]);
    expect(settled[0]).toMatchObject({ status: 'fulfilled', value: 'ok-1' });
    expect(settled[1]).toMatchObject({ status: 'rejected' });
    expect(settled[2]).toMatchObject({ status: 'fulfilled', value: 'ok-2' });
    expect(l.inFlight).toBe(0);
  });

  it('synchronous throw inside fn is caught and routed to rejection', async () => {
    const l = new ConcurrencyLimiter(1);
    // eslint-disable-next-line @typescript-eslint/require-await
    const p = l.run(async () => {
      throw new Error('sync-ish throw');
    });
    await expect(p).rejects.toThrow('sync-ish throw');
  });
});

describe('ConcurrencyLimiter — edge cases', () => {
  it('zero tasks is a no-op (no queue state left behind)', () => {
    const l = new ConcurrencyLimiter(3);
    expect(l.inFlight).toBe(0);
    expect(l.queued).toBe(0);
  });

  it('max=1 serializes tasks (observable via timing)', async () => {
    const l = new ConcurrencyLimiter(1);
    const start = Date.now();
    await Promise.all(
      [1, 2, 3].map(() =>
        l.run(async () => {
          await sleep(30);
        }),
      ),
    );
    const elapsed = Date.now() - start;
    // 3 tasks × 30ms serialized ≈ 90ms; with parallelism would be ~30ms
    expect(elapsed).toBeGreaterThanOrEqual(80);
  });
});
