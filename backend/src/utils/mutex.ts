/**
 * In-memory concurrency lock manager per auction key.
 * Guarantees that concurrent bids for the same auction are strictly serialized,
 * preventing race conditions and double-bidding edge cases.
 */
class AuctionMutexManager {
  private queues: Map<string, Promise<void>> = new Map();

  async runExclusive<T>(key: string, task: () => Promise<T>): Promise<T> {
    const currentQueue = this.queues.get(key) || Promise.resolve();

    let releaseLock: () => void = () => {};
    const nextQueue = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Chain the current queue
    this.queues.set(key, currentQueue.then(() => nextQueue));

    try {
      await currentQueue;
      return await task();
    } finally {
      releaseLock();
      if (this.queues.get(key) === nextQueue) {
        this.queues.delete(key);
      }
    }
  }
}

export const auctionMutex = new AuctionMutexManager();
