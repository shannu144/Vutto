import { describe, it, expect } from 'vitest';
import { auctionMutex } from '../../src/utils/mutex';

describe('Auction Mutex Concurrency Lock', () => {
  it('should serialize concurrent operations on the same auction key', async () => {
    const executionOrder: number[] = [];
    const auctionId = 'test-auction-1';

    // Simulate 3 concurrent tasks launched at the exact same moment
    const task1 = auctionMutex.runExclusive(auctionId, async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      executionOrder.push(1);
    });

    const task2 = auctionMutex.runExclusive(auctionId, async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      executionOrder.push(2);
    });

    const task3 = auctionMutex.runExclusive(auctionId, async () => {
      executionOrder.push(3);
    });

    await Promise.all([task1, task2, task3]);

    // Despite task 2 and 3 having shorter wait times, mutex must enforce FIFO serialization
    expect(executionOrder).toEqual([1, 2, 3]);
  });

  it('should allow concurrent operations across different auction keys in parallel', async () => {
    const results: string[] = [];

    const taskA = auctionMutex.runExclusive('auction-A', async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      results.push('A');
    });

    const taskB = auctionMutex.runExclusive('auction-B', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      results.push('B');
    });

    await Promise.all([taskA, taskB]);

    // Different keys do not block each other, B finishes first
    expect(results).toEqual(['B', 'A']);
  });
});
