import { prisma } from '../utils/prisma';
import { bidService } from './bidService';
import { logger } from '../utils/logger';

class BotSimulationService {
  private isRunning: boolean = false;
  private timer: NodeJS.Timeout | null = null;

  getStatus() {
    return { isRunning: this.isRunning };
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info('Bot bidding simulation started.');
    this.scheduleNextBid();
  }

  stop() {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    logger.info('Bot bidding simulation stopped.');
  }

  private scheduleNextBid() {
    if (!this.isRunning) return;
    // Random delay between 4 to 9 seconds
    const delay = Math.floor(Math.random() * 5000) + 4000;
    this.timer = setTimeout(async () => {
      try {
        await this.simulateSingleBid();
      } catch (err: any) {
        logger.debug(`Simulated bid attempt failed: ${err.message}`);
      } finally {
        if (this.isRunning) {
          this.scheduleNextBid();
        }
      }
    }, delay);
  }

  private async simulateSingleBid() {
    // 1. Find an active LIVE auction
    const liveAuctions = await prisma.auction.findMany({
      where: { status: 'LIVE' },
      take: 5,
    });

    if (liveAuctions.length === 0) return;

    // Pick a random live auction
    const auction = liveAuctions[Math.floor(Math.random() * liveAuctions.length)];

    // 2. Find eligible buyers (exclude current winner)
    const buyers = await prisma.user.findMany({
      where: {
        role: 'BUYER',
        id: { not: auction.currentWinnerId || '' },
      },
    });

    if (buyers.length === 0) return;

    const chosenBuyer = buyers[Math.floor(Math.random() * buyers.length)];
    const nextBidAmount = auction.currentBid + auction.minIncrement;

    if (chosenBuyer.balance >= nextBidAmount) {
      logger.info(`Simulated bot bid: ${chosenBuyer.name} placing $${nextBidAmount} on ${auction.title}`);
      await bidService.placeBid({
        auctionId: auction.id,
        bidderId: chosenBuyer.id,
        amount: nextBidAmount,
        ipAddress: '127.0.0.1 (BotSimulator)',
      });
    }
  }
}

export const botSimulationService = new BotSimulationService();
