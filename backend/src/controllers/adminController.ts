import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { auctionService } from '../services/auctionService';
import { botSimulationService } from '../services/botSimulationService';
import { prisma } from '../utils/prisma';

const createAuctionSchema = z.object({
  title: z.string().min(3),
  startingPrice: z.number().positive(),
  reservePrice: z.number().nonnegative(),
  minIncrement: z.number().positive(),
  startTime: z.string().transform((str) => new Date(str)),
  endTime: z.string().transform((str) => new Date(str)),
  antiSnipingSeconds: z.number().int().positive().optional().default(60),
  bike: z.object({
    make: z.string().min(1),
    model: z.string().min(1),
    year: z.number().int().min(1900),
    engineCc: z.number().int().positive(),
    mileage: z.number().nonnegative(),
    vin: z.string().min(5),
    conditionScore: z.number().min(0).max(10),
    inspectionSummary: z.string().min(5),
    location: z.string().min(2),
    primaryImage: z.string().url(),
    images: z.array(z.string().url()).optional().default([]),
    specs: z.record(z.string()).optional().default({}),
  }),
});

export const adminController = {
  async createAuction(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createAuctionSchema.parse(req.body);
      const auction = await auctionService.createAuction({
        ...data,
        createdById: req.user!.id,
      });
      res.status(201).json(auction);
    } catch (err) {
      next(err);
    }
  },

  async startAuction(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const auction = await auctionService.startAuctionNow(id, req.user!.id);
      res.json(auction);
    } catch (err) {
      next(err);
    }
  },

  async endAuction(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const auction = await auctionService.endAuctionEarly(id, req.user!.id);
      res.json(auction);
    } catch (err) {
      next(err);
    }
  },

  async cancelAuction(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { reason } = req.body;
      const auction = await auctionService.cancelAuction(id, req.user!.id, reason);
      res.json(auction);
    } catch (err) {
      next(err);
    }
  },

  async toggleBotSimulation(req: Request, res: Response, next: NextFunction) {
    try {
      const { enable } = req.body;
      if (enable) {
        botSimulationService.start();
      } else {
        botSimulationService.stop();
      }
      res.json(botSimulationService.getStatus());
    } catch (err) {
      next(err);
    }
  },

  async getBotStatus(req: Request, res: Response, next: NextFunction) {
    try {
      res.json(botSimulationService.getStatus());
    } catch (err) {
      next(err);
    }
  },

  async getSystemOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const [
        totalAuctions,
        liveAuctions,
        upcomingAuctions,
        endedAuctions,
        totalBids,
        totalUsers,
        recentLogs,
      ] = await Promise.all([
        prisma.auction.count(),
        prisma.auction.count({ where: { status: 'LIVE' } }),
        prisma.auction.count({ where: { status: 'UPCOMING' } }),
        prisma.auction.count({ where: { status: 'ENDED' } }),
        prisma.bid.count(),
        prisma.user.count(),
        prisma.auditLog.findMany({
          orderBy: { timestamp: 'desc' },
          take: 20,
        }),
      ]);

      const memory = process.memoryUsage();

      res.json({
        auctions: {
          total: totalAuctions,
          live: liveAuctions,
          upcoming: upcomingAuctions,
          ended: endedAuctions,
        },
        bids: {
          total: totalBids,
        },
        users: {
          total: totalUsers,
        },
        system: {
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          memoryHeapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
          memoryRssMb: Math.round(memory.rss / 1024 / 1024),
        },
        botSimulation: botSimulationService.getStatus(),
        recentLogs,
      });
    } catch (err) {
      next(err);
    }
  },

  async exportLedgerCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { bidService } = await import('../services/bidService');
      const csv = await bidService.exportAuctionLedgerCsv(id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=auction_${id}_ledger.csv`);
      res.send(csv);
    } catch (err) {
      next(err);
    }
  },
};
