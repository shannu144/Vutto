import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { auctionService } from '../services/auctionService';

const getAuctionsQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().optional().default(50),
  offset: z.coerce.number().optional().default(0),
});

export const auctionController = {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const query = getAuctionsQuerySchema.parse(req.query);
      const result = await auctionService.getAuctions(query);
      res.json(result);
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const auction = await auctionService.getAuctionById(id);
      res.json(auction);
    } catch (err) {
      next(err);
    }
  },
};
