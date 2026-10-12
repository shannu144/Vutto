import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { bidService } from '../services/bidService';

const placeBidSchema = z.object({
  auctionId: z.string().min(1, 'Auction ID is required'),
  amount: z.number().positive('Bid amount must be positive'),
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

  async getMyBids(req: Request, res: Response, next: NextFunction) {
    try {
      const bids = await bidService.getUserBids(req.user!.id);
      res.json(bids);
    } catch (err) {
      next(err);
    }
  },
};
