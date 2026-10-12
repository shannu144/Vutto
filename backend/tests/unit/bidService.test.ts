import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bidService } from '../../src/services/bidService';
import { initializeDatabase, prisma } from '../../src/utils/prisma';

describe('BidService Logic & Anti-Sniping', () => {
  let liveAuctionId: string;
  let buyerElenaId: string;
  let buyerMarcusId: string;

  beforeAll(async () => {
    await initializeDatabase();
    const auction = await prisma.auction.findFirst({
      where: { status: 'LIVE' },
    });
    const elena = await prisma.user.findUnique({
      where: { email: 'elena@vutto.com' },
    });
    const marcus = await prisma.user.findUnique({
      where: { email: 'marcus@vutto.com' },
    });

    if (!auction || !elena || !marcus) {
      throw new Error('Seed data required for bidService unit tests.');
    }

    liveAuctionId = auction.id;
    buyerElenaId = elena.id;
    buyerMarcusId = marcus.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should reject a bid lower than currentBid + minIncrement', async () => {
    const auction = await prisma.auction.findUnique({ where: { id: liveAuctionId } });
    const insufficientAmount = (auction?.currentBid || 1000) - 100;

    await expect(
      bidService.placeBid({
        auctionId: liveAuctionId,
        bidderId: buyerMarcusId,
        amount: insufficientAmount,
      })
    ).rejects.toThrow(/insufficient/i);
  });

  it('should reject a bid if the user bids on an invalid or non-existent auction ID', async () => {
    await expect(
      bidService.placeBid({
        auctionId: 'invalid-auction-id-999',
        bidderId: buyerElenaId,
        amount: 999999,
      })
    ).rejects.toThrow(/not found/i);
  });

  it('should reject a bid if user has insufficient balance', async () => {
    // User Marcus has $120,000 balance in seed
    await expect(
      bidService.placeBid({
        auctionId: liveAuctionId,
        bidderId: buyerMarcusId,
        amount: 999999999, // Exceeds balance
      })
    ).rejects.toThrow(/Insufficient available bidding balance/i);
  });
});
