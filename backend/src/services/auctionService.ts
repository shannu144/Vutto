import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';
import { emitAuctionStatusChanged } from '../sockets/socketHandler';
import { activeAuctionsGauge } from '../utils/metrics';

export interface CreateAuctionInput {
  title: string;
  startingPrice: number;
  reservePrice: number;
  minIncrement: number;
  startTime: Date;
  endTime: Date;
  antiSnipingSeconds?: number;
  createdById: string;
  bike: {
    make: string;
    model: string;
    year: number;
    engineCc: number;
    mileage: number;
    vin: string;
    conditionScore: number;
    inspectionSummary: string;
    location: string;
    primaryImage: string;
    images: string[];
    specs: Record<string, string>;
  };
}

export class AuctionService {
  /**
   * Get paginated or filtered list of auctions
   */
  async getAuctions(filters: {
    status?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, search, limit = 50, offset = 0 } = filters;
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { bike: { make: { contains: search } } },
        { bike: { model: { contains: search } } },
      ];
    }

    const [auctions, total] = await Promise.all([
      prisma.auction.findMany({
        where,
        include: {
          bike: true,
          winner: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { bids: true },
          },
        },
        orderBy: [
          // LIVE auctions first, then UPCOMING, then ENDED
          { status: 'desc' },
          { endTime: 'asc' },
        ],
        take: limit,
        skip: offset,
      }),
      prisma.auction.count({ where }),
    ]);

    return { auctions, total };
  }

  /**
   * Get detailed auction by ID including bid history
   */
  async getAuctionById(id: string) {
    const auction = await prisma.auction.findUnique({
      where: { id },
      include: {
        bike: true,
        winner: {
          select: { id: true, name: true, email: true },
        },
        bids: {
          include: {
            bidder: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { timestamp: 'desc' },
          take: 50,
        },
        _count: {
          select: { bids: true },
        },
      },
    });

    if (!auction) {
      throw new AppError('Auction not found', 404);
    }

    return auction;
  }

  /**
   * Create auction and bike transactionally (Admin only)
   */
  async createAuction(input: CreateAuctionInput) {
    const { bike, ...auctionData } = input;

    // Check VIN uniqueness
    const existingBike = await prisma.bike.findUnique({
      where: { vin: bike.vin },
    });
    if (existingBike) {
      throw new AppError(`A motorcycle with VIN ${bike.vin} is already registered.`, 400);
    }

    const createdBike = await prisma.bike.create({
      data: {
        make: bike.make,
        model: bike.model,
        year: bike.year,
        engineCc: bike.engineCc,
        mileage: bike.mileage,
        vin: bike.vin,
        conditionScore: bike.conditionScore,
        inspectionSummary: bike.inspectionSummary,
        location: bike.location,
        primaryImage: bike.primaryImage,
        imagesJson: JSON.stringify(bike.images || [bike.primaryImage]),
        specsJson: JSON.stringify(bike.specs || {}),
      },
    });

    const now = new Date();
    const initialStatus = auctionData.startTime <= now && auctionData.endTime > now ? 'LIVE' : 'UPCOMING';

    const auction = await prisma.auction.create({
      data: {
        title: auctionData.title,
        bikeId: createdBike.id,
        startingPrice: auctionData.startingPrice,
        reservePrice: auctionData.reservePrice,
        minIncrement: auctionData.minIncrement,
        currentBid: auctionData.startingPrice,
        status: initialStatus,
        startTime: auctionData.startTime,
        endTime: auctionData.endTime,
        originalEndTime: auctionData.endTime,
        antiSnipingSeconds: auctionData.antiSnipingSeconds || 60,
        createdById: auctionData.createdById,
      },
      include: {
        bike: true,
      },
    });

    logger.info(`Auction created: ${auction.id} (${auction.title}) with status ${initialStatus}`);

    await prisma.auditLog.create({
      data: {
        action: 'AUCTION_CREATED',
        actorId: auctionData.createdById,
        details: JSON.stringify({ auctionId: auction.id, title: auction.title }),
      },
    });

    return auction;
  }

  /**
   * Admin: Start an upcoming auction immediately
   */
  async startAuctionNow(auctionId: string, adminId: string) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new AppError('Auction not found', 404);
    if (auction.status !== 'UPCOMING' && auction.status !== 'DRAFT') {
      throw new AppError(`Cannot start auction currently in status ${auction.status}`, 400);
    }

    const now = new Date();
    // Default duration: 15 minutes from now if endTime is in the past
    const duration = auction.endTime.getTime() - auction.startTime.getTime();
    const validDuration = duration > 0 ? duration : 15 * 60 * 1000;
    const newEndTime = new Date(now.getTime() + validDuration);

    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: 'LIVE',
        startTime: now,
        endTime: newEndTime,
      },
    });

    emitAuctionStatusChanged({
      auctionId: updated.id,
      status: 'LIVE',
    });

    logger.info(`Auction manually started by admin: ${auctionId}`);
    return updated;
  }

  /**
   * Admin: End an active auction early
   */
  async endAuctionEarly(auctionId: string, adminId: string) {
    const auction = await prisma.auction.findUnique({
      where: { id: auctionId },
      include: { winner: true },
    });
    if (!auction) throw new AppError('Auction not found', 404);
    if (auction.status !== 'LIVE') {
      throw new AppError(`Cannot end auction in status ${auction.status}`, 400);
    }

    const now = new Date();
    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: {
        status: 'ENDED',
        endTime: now,
      },
      include: { winner: true },
    });

    emitAuctionStatusChanged({
      auctionId: updated.id,
      status: 'ENDED',
      winnerId: updated.currentWinnerId,
      winnerName: updated.winner?.name,
      finalBid: updated.currentBid,
    });

    logger.info(`Auction manually ended by admin: ${auctionId}`);
    return updated;
  }

  /**
   * Admin: Cancel auction
   */
  async cancelAuction(auctionId: string, adminId: string, reason?: string) {
    const auction = await prisma.auction.findUnique({ where: { id: auctionId } });
    if (!auction) throw new AppError('Auction not found', 404);
    if (auction.status === 'ENDED' || auction.status === 'SETTLED') {
      throw new AppError('Cannot cancel an already completed auction', 400);
    }

    const updated = await prisma.auction.update({
      where: { id: auctionId },
      data: { status: 'CANCELLED' },
    });

    emitAuctionStatusChanged({
      auctionId: updated.id,
      status: 'CANCELLED',
    });

    logger.info(`Auction cancelled by admin: ${auctionId}, reason: ${reason || 'N/A'}`);
    return updated;
  }

  /**
   * Background lifecycle checker - runs every 2 seconds
   * Transitions UPCOMING -> LIVE and LIVE -> ENDED
   */
  async processLifecycleTicks() {
    const now = new Date();

    // 1. Transition UPCOMING to LIVE
    const auctionsToStart = await prisma.auction.findMany({
      where: {
        status: 'UPCOMING',
        startTime: { lte: now },
        endTime: { gt: now },
      },
    });

    for (const a of auctionsToStart) {
      await prisma.auction.update({
        where: { id: a.id },
        data: { status: 'LIVE' },
      });
      logger.info(`Auction transitioned to LIVE: ${a.id} (${a.title})`);
      emitAuctionStatusChanged({ auctionId: a.id, status: 'LIVE' });
    }

    // 2. Transition LIVE to ENDED
    const auctionsToEnd = await prisma.auction.findMany({
      where: {
        status: 'LIVE',
        endTime: { lte: now },
      },
      include: {
        winner: true,
      },
    });

    for (const a of auctionsToEnd) {
      await prisma.auction.update({
        where: { id: a.id },
        data: { status: 'ENDED' },
      });
      logger.info(
        `Auction transitioned to ENDED: ${a.id} (${a.title}) - Winner: ${a.winner?.name || 'None'} with $${a.currentBid}`
      );
      emitAuctionStatusChanged({
        auctionId: a.id,
        status: 'ENDED',
        winnerId: a.currentWinnerId,
        winnerName: a.winner?.name,
        finalBid: a.currentBid,
      });
    }

    // 3. Update active auctions gauge
    const liveCount = await prisma.auction.count({
      where: { status: 'LIVE' },
    });
    activeAuctionsGauge.set(liveCount);
  }
}

export const auctionService = new AuctionService();
