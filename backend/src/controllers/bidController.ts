import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { bidService } from '../services/bidService';

const placeBidSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
  amount: z.number().positive('Bid amount must be positive'),
});

const autoBidSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
  maxAmount: z.number().positive('Max amount must be positive'),
});

export const bidController = {
  async placeBid(req: Request, res: Response, next: NextFunction) {
    try {
      const data = placeBidSchema.parse(req.body);
      const result = await bidService.placeBid({
        auctionId: data.auctionId,
        bidderId: req.user!.id,
        amount: data.amount,
        ipAddress: req.ip,
      });

      res.status(201).json({
        message: 'Bid placed successfully',
        ...result,
      });
    } catch (err) {
      next(err);
    }
  },

  async setAutoBid(req: Request, res: Response, next: NextFunction) {
    try {
      const data = autoBidSchema.parse(req.body);
      const result = await bidService.setAutoBid({
        auctionId: data.auctionId,
        bidderId: req.user!.id,
        maxAmount: data.maxAmount,
      });
      res.status(200).json({
        message: 'Proxy auto-bid configured successfully',
        autoBid: result,
      });
    } catch (err) {
      next(err);
    }
  },

  async getAutoBid(req: Request, res: Response, next: NextFunction) {
    try {
      const auctionId = req.params.auctionId as string;
      const result = await bidService.getAutoBid(auctionId, req.user!.id);
      res.json(result || { maxAmount: 0 });
    } catch (err) {
      next(err);
    }
  },

  async deleteAutoBid(req: Request, res: Response, next: NextFunction) {
    try {
      const auctionId = req.params.auctionId as string;
      await bidService.deleteAutoBid(auctionId, req.user!.id);
      res.json({ message: 'Auto-bid cancelled successfully' });
    } catch (err) {
      next(err);
    }
  },

  async getMyBids(req: Request, res: Response, next: NextFunction) {
    try {
      const bids = await bidService.getUserBids(req.user!.id);
      res.json(bids);
    } catch (err) {
      next(err);
    }
  },

  async toggleWatchlist(req: Request, res: Response, next: NextFunction) {
    try {
      const auctionId = req.params.id as string;
      const result = await bidService.toggleWatchlist(req.user!.id, auctionId);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getWatchlist(req: Request, res: Response, next: NextFunction) {
    try {
      const list = await bidService.getUserWatchlist(req.user!.id);
      res.json(list);
    } catch (err) {
      next(err);
    }
  },
};
