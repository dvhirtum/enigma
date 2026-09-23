import { describe, expect, it } from 'vitest';
import { createQueue } from './queue';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('queue', () => {
  it('runs tasks one at a time in the order they were added', async () => {
    const enqueue = createQueue();
    const events: string[] = [];
    const task = (name: string, ms: number) => async () => {
      events.push(`start ${name}`);
      await delay(ms);
      events.push(`end ${name}`);
      return name;
    };

    const results = await Promise.all([enqueue(task('press', 20)), enqueue(task('release', 0))]);

    expect(results).toEqual(['press', 'release']);
    expect(events).toEqual(['start press', 'end press', 'start release', 'end release']);
  });

  it('keeps running tasks after one fails', async () => {
    const enqueue = createQueue();

    const failed = enqueue(() => Promise.reject(new Error('boom')));
    const next = enqueue(() => Promise.resolve('next'));

    await expect(failed).rejects.toThrow('boom');
    await expect(next).resolves.toBe('next');
  });
});
