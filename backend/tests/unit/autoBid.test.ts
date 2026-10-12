import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bidService } from '../../src/services/bidService';
import { initializeDatabase, prisma } from '../../src/utils/prisma';

describe('Proxy Auto-Bidding Engine', () => {
  let liveAuctionId: string;
  let buyerMarcusId: string;

  beforeAll(async () => {
    await initializeDatabase();
    const auction = await prisma.auction.findFirst({
      where: { status: 'LIVE' },
    });
    const marcus = await prisma.user.findUnique({
      where: { email: 'marcus@vutto.com' },
    });

    if (!auction || !marcus) {
      throw new Error('Seed data required for autoBid unit tests.');
    }

    liveAuctionId = auction.id;
    buyerMarcusId = marcus.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should reject setting auto-bid lower than next required bid', async () => {
    const auction = await prisma.auction.findUnique({ where: { id: liveAuctionId } });
    const insufficientAmount = (auction?.currentBid || 1000) - 100;

    await expect(
      bidService.setAutoBid({
        auctionId: liveAuctionId,
        bidderId: buyerMarcusId,
        maxAmount: insufficientAmount,
      })
    ).rejects.toThrow(/Max auto-bid must be at least/i);
  });

  it('should successfully configure an auto-bid budget within user balance', async () => {
    const auction = await prisma.auction.findUnique({ where: { id: liveAuctionId } });
    const validMaxBudget = (auction?.currentBid || 1000) + 5000;

    const autoBid = await bidService.setAutoBid({
      auctionId: liveAuctionId,
      bidderId: buyerMarcusId,
      maxAmount: validMaxBudget,
    });

    expect(autoBid).toBeDefined();
    expect(autoBid.maxAmount).toBe(validMaxBudget);
    expect(autoBid.bidderId).toBe(buyerMarcusId);
  });
});
