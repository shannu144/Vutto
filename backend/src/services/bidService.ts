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
  isAutoBid?: boolean;
}

export class BidService {
  /**
   * Concurrency-safe atomic bid placement with mutex synchronization and anti-sniping
   */
  async placeBid(input: PlaceBidInput): Promise<any> {
    const startTime = process.hrtime();
    const { auctionId, bidderId, amount, ipAddress, isAutoBid = false } = input;

    // Concurrency Lock: Strictly serialize bids on the same auction
    const result = await auctionMutex.runExclusive(auctionId, async () => {
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
          prisma.bid.updateMany({
            where: { auctionId, isWinning: true },
            data: { isWinning: false },
          }),
          prisma.bid.create({
            data: {
              auctionId,
              bidderId,
              amount,
              timestamp: now,
              isWinning: true,
              ipAddress: isAutoBid ? `${ipAddress || '127.0.0.1'} (ProxyAutoBid)` : ipAddress,
            },
            include: {
              bidder: {
                select: { id: true, name: true, email: true },
              },
            },
          }),
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
          `Bid placed: $${amount} on ${auctionId} by ${bidder.name} (${isAutoBid ? 'Auto-Proxy' : 'Manual'}) in ${durationMs.toFixed(2)}ms`
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

    // 9. Proxy Auto-Bid Engine Trigger
    // Check if another user has an active AutoBid configured for this auction
    this.evaluateProxyAutoBids(auctionId, bidderId).catch((err) => {
      logger.debug(`Proxy auto-bid evaluation error: ${err.message}`);
    });

    return result;
  }

  /**
   * Evaluates pending Proxy Auto-Bids on behalf of other registered users
   */
  private async evaluateProxyAutoBids(auctionId: string, currentLeaderId: string) {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
    });
    if (!auction || auction.status !== 'LIVE') return;

    // Find auto-bidders who are NOT currently winning and whose maxAmount >= next required bid
    const nextRequiredBid = auction.currentBid + auction.minIncrement;
    const eligibleAutoBids = await prisma.autoBid.findMany({
      where: {
        auctionId,
        bidderId: { not: currentLeaderId },
        maxAmount: { gte: nextRequiredBid },
      },
      include: {
        bidder: true,
      },
      orderBy: {
        maxAmount: 'desc',
      },
    });

    if (eligibleAutoBids.length > 0) {
      const topAutoBid = eligibleAutoBids[0];
      logger.info(
        `Proxy Auto-Bid: Placing counter-bid of $${nextRequiredBid} for ${topAutoBid.bidder.name} (Max budget: $${topAutoBid.maxAmount})`
      );

      // Recursive call enters mutex queue
      await this.placeBid({
        auctionId,
        bidderId: topAutoBid.bidderId,
        amount: nextRequiredBid,
        ipAddress: '127.0.0.1',
        isAutoBid: true,
      });
    }
  }

  /**
   * Set or update maximum proxy auto-bid budget for a user
   */
  async setAutoBid(input: { auctionId: string; bidderId: string; maxAmount: number }) {
    const { auctionId, bidderId, maxAmount } = input;

    const [auction, user] = await Promise.all([
      prisma.auction.findUnique({ where: { id: auctionId } }),
      prisma.user.findUnique({ where: { id: bidderId } }),
    ]);

    if (!auction) throw new AppError('Auction not found', 404);
    if (!user) throw new AppError('User not found', 404);
    if (auction.status !== 'LIVE' && auction.status !== 'UPCOMING') {
      throw new AppError('Auto-bid can only be set on live or upcoming auctions', 400);
    }

    const minRequired = auction.currentBid > 0 ? auction.currentBid + auction.minIncrement : auction.startingPrice;
    if (maxAmount < minRequired) {
      throw new AppError(`Max auto-bid must be at least $${minRequired.toLocaleString()}`, 400);
    }

    if (user.balance < maxAmount) {
      throw new AppError(`Insufficient balance ($${user.balance.toLocaleString()}) for max auto-bid of $${maxAmount.toLocaleString()}`, 400);
    }

    const autoBid = await prisma.autoBid.upsert({
      where: {
        auctionId_bidderId: {
          auctionId,
          bidderId,
        },
      },
      create: {
        auctionId,
        bidderId,
        maxAmount,
      },
      update: {
        maxAmount,
      },
    });

    logger.info(`Auto-bid set for user ${user.name} on ${auction.title} with max: $${maxAmount}`);

    // If auction is LIVE and user is not currently leading, trigger immediate initial bid
    if (auction.status === 'LIVE' && auction.currentWinnerId !== bidderId) {
      await this.placeBid({
        auctionId,
        bidderId,
        amount: minRequired,
        ipAddress: '127.0.0.1',
        isAutoBid: true,
      });
    }

    return autoBid;
  }

  /**
   * Get active auto-bid configuration for a user on an auction
   */
  async getAutoBid(auctionId: string, bidderId: string) {
    return prisma.autoBid.findUnique({
      where: {
        auctionId_bidderId: {
          auctionId,
          bidderId,
        },
      },
    });
  }

  /**
   * Remove auto-bid configuration
   */
  async deleteAutoBid(auctionId: string, bidderId: string) {
    return prisma.autoBid.deleteMany({
      where: {
        auctionId,
        bidderId,
      },
    });
  }

  /**
   * Toggle Watchlist for an auction
   */
  async toggleWatchlist(userId: string, auctionId: string) {
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_auctionId: {
          userId,
          auctionId,
        },
      },
    });

    if (existing) {
      await prisma.watchlist.delete({
        where: { id: existing.id },
      });
      return { isWatched: false };
    } else {
      await prisma.watchlist.create({
        data: {
          userId,
          auctionId,
        },
      });
      return { isWatched: true };
    }
  }

  /**
   * Get user's watchlist
   */
  async getUserWatchlist(userId: string) {
    const records = await prisma.watchlist.findMany({
      where: { userId },
      include: {
        auction: {
          include: {
            bike: true,
            winner: { select: { id: true, name: true } },
            _count: { select: { bids: true } },
          },
        },
      },
    });

    return records.map((r) => r.auction);
  }

  /**
   * Export immutable CSV ledger of all bids on an auction for compliance
   */
  async exportAuctionLedgerCsv(auctionId: string): Promise<string> {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: {
        bike: true,
        bids: {
          include: {
            bidder: { select: { name: true, email: true } },
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!auction) throw new AppError('Auction not found', 404);

    let csv = 'Bid ID,Auction Title,VIN,Bidder Name,Bidder Email,Amount USD,Timestamp,Winning Bid,IP Address\n';

    for (const b of auction.bids) {
      csv += `"${b.id}","${auction.title}","${auction.bike.vin}","${b.bidder.name}","${b.bidder.email}",${b.amount},"${b.timestamp.toISOString()}",${b.isWinning},"${b.ipAddress || 'N/A'}"\n`;
    }

    return csv;
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
