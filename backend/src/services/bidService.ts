import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { auctionMutex } from '../utils/mutex';
import { AppError } from '../middlewares/errorHandler';
import {
  emitBidPlaced,
  emitAuctionExtended,
  emitOutbidAlert,
} from '../sockets/socketHandler';
import {
  bidsTotal,
  bidProcessingDurationMs,
  antiSnipingExtensionsTotal,
} from '../utils/metrics';

export interface PlaceBidInput {
  auctionId: string;
  bidderId: string;
  amount: number;
  ipAddress?: string;
}

export class BidService {
  /**
   * Concurrency-safe atomic bid placement with mutex synchronization and anti-sniping
   */
  async placeBid(input: PlaceBidInput) {
    const startTime = process.hrtime();
    const { auctionId, bidderId, amount, ipAddress } = input;

    // Concurrency Lock: Strictly serialize bids on the same auction
    return await auctionMutex.runExclusive(auctionId, async () => {
      try {
        const now = new Date();

        // 1. Fetch current auction and bidder
        const [auction, bidder] = await Promise.all([
          prisma.auction.findUnique({
            where: { id: auctionId },
            include: { winner: true },
          }),
          prisma.user.findUnique({
            where: { id: bidderId },
          }),
        ]);

        if (!auction) {
          bidsTotal.inc({ status: 'rejected' });
          throw new AppError('Auction not found', 404);
        }

        if (!bidder) {
          bidsTotal.inc({ status: 'rejected' });
          throw new AppError('Bidder account not found', 404);
        }

        // 2. Validate Auction Status & Expiry
        if (auction.status !== 'LIVE') {
          bidsTotal.inc({ status: 'rejected' });
          throw new AppError(`Cannot place bid. Auction status is currently ${auction.status}.`, 400);
        }

        if (now.getTime() >= auction.endTime.getTime()) {
          bidsTotal.inc({ status: 'rejected' });
          throw new AppError('This auction has already concluded.', 400);
        }

        // 3. Prevent Self-Outbidding
        if (auction.currentWinnerId === bidderId) {
          bidsTotal.inc({ status: 'rejected' });
          throw new AppError('You are already the highest bidder for this auction.', 400);
        }

        // 4. Validate Bid Amount
        const minRequiredBid = auction.currentBid > 0
          ? auction.currentBid + auction.minIncrement
          : auction.startingPrice;

        if (amount < minRequiredBid) {
          bidsTotal.inc({ status: 'rejected' });
          throw new AppError(
            `Bid of $${amount.toLocaleString()} is insufficient. Minimum required bid is $${minRequiredBid.toLocaleString()}.`,
            400
          );
        }

        // 5. Validate Bidder Financial Capability / Balance
        if (bidder.balance < amount) {
          bidsTotal.inc({ status: 'rejected' });
          throw new AppError(
            `Insufficient available bidding balance ($${bidder.balance.toLocaleString()}) to place a bid of $${amount.toLocaleString()}.`,
            400
          );
        }

        // 6. Anti-Sniping (Soft-Close) Detection
        const timeLeftMs = auction.endTime.getTime() - now.getTime();
        const antiSnipingMs = auction.antiSnipingSeconds * 1000;
        let extendedEndTime = auction.endTime;
        let isExtended = false;
        let newExtensionCount = auction.antiSnipingExtensionsCount;

        if (timeLeftMs <= antiSnipingMs) {
          // Extend auction by antiSnipingSeconds
          isExtended = true;
          newExtensionCount += 1;
          extendedEndTime = new Date(auction.endTime.getTime() + antiSnipingMs);
          antiSnipingExtensionsTotal.inc();
          logger.info(`Anti-sniping triggered for auction ${auctionId}. Extended to ${extendedEndTime.toISOString()}`);
        }

        const isReserveMet = amount >= auction.reservePrice;
        const previousWinnerId = auction.currentWinnerId;

        // 7. Atomic Database Transaction
        const [, createdBid, updatedAuction] = await prisma.$transaction([
          // Mark previous winning bids as not winning
          prisma.bid.updateMany({
            where: { auctionId, isWinning: true },
            data: { isWinning: false },
          }),
          // Record new winning bid
          prisma.bid.create({
            data: {
              auctionId,
              bidderId,
              amount,
              timestamp: now,
              isWinning: true,
              ipAddress,
            },
            include: {
              bidder: {
                select: { id: true, name: true, email: true },
              },
            },
          }),
          // Update auction state
          prisma.auction.update({
            where: { id: auctionId },
            data: {
              currentBid: amount,
              currentWinnerId: bidderId,
              isReserveMet: isReserveMet || auction.isReserveMet,
              endTime: extendedEndTime,
              antiSnipingExtensionsCount: newExtensionCount,
            },
            include: {
              bike: true,
              winner: {
                select: { id: true, name: true, email: true },
              },
            },
          }),
        ]);

        // Record metrics
        bidsTotal.inc({ status: 'success' });
        const diff = process.hrtime(startTime);
        const durationMs = (diff[0] * 1e3) + (diff[1] / 1e6);
        bidProcessingDurationMs.observe(durationMs);

        // 8. WebSocket Broadcasts
        emitBidPlaced({
          auctionId,
          bidId: createdBid.id,
          amount: createdBid.amount,
          bidderId: createdBid.bidderId,
          bidderName: createdBid.bidder.name,
          timestamp: createdBid.timestamp.toISOString(),
          endTime: updatedAuction.endTime.toISOString(),
          isReserveMet: updatedAuction.isReserveMet,
        });

        if (isExtended) {
          emitAuctionExtended({
            auctionId,
            newEndTime: updatedAuction.endTime.toISOString(),
            antiSnipingExtensionsCount: updatedAuction.antiSnipingExtensionsCount,
            message: `Late bid triggered anti-sniping protection! Auction extended by ${auction.antiSnipingSeconds}s.`,
          });
        }

        // Notify previous leader that they have been outbid
        if (previousWinnerId && previousWinnerId !== bidderId) {
          emitOutbidAlert(previousWinnerId, {
            auctionId,
            auctionTitle: updatedAuction.title,
            newHighestBid: amount,
          });
        }

        logger.info(
          `Bid placed successfully: $${amount} on ${auctionId} by ${bidder.name} in ${durationMs.toFixed(2)}ms`
        );

        return {
          bid: createdBid,
          auction: updatedAuction,
          isExtended,
          durationMs,
        };
      } catch (err) {
        if (!(err instanceof AppError)) {
          bidsTotal.inc({ status: 'rejected' });
        }
        throw err;
      }
    });
  }

  /**
   * Get bid history for a specific user
   */
  async getUserBids(userId: string) {
    return prisma.bid.findMany({
      where: { bidderId: userId },
      include: {
        auction: {
          include: {
            bike: true,
            winner: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });
  }
}

export const bidService = new BidService();
