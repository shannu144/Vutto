import { Router } from 'express';
import { authController } from '../controllers/authController';
import { auctionController } from '../controllers/auctionController';
import { bidController } from '../controllers/bidController';
import { adminController } from '../controllers/adminController';
import { metricsController } from '../controllers/metricsController';
import { authenticate, requireAdmin } from '../middlewares/authMiddleware';

export const router = Router();

// Health & Observability
router.get('/health', metricsController.getHealth);
router.get('/metrics', metricsController.getPrometheusMetrics);

// Authentication Routes
router.post('/api/auth/register', authController.register);
router.post('/api/auth/login', authController.login);
router.get('/api/auth/me', authenticate, authController.getMe);

// Public Auction Routes
router.get('/api/auctions', auctionController.getAll);
router.get('/api/auctions/:id', auctionController.getById);

// Bid Routes (Authenticated)
router.post('/api/bids', authenticate, bidController.placeBid);
router.get('/api/bids/my-bids', authenticate, bidController.getMyBids);

// Admin Routes (Role: ADMIN)
router.post('/api/admin/auctions', authenticate, requireAdmin, adminController.createAuction);
router.post('/api/admin/auctions/:id/start', authenticate, requireAdmin, adminController.startAuction);
router.post('/api/admin/auctions/:id/end', authenticate, requireAdmin, adminController.endAuction);
router.post('/api/admin/auctions/:id/cancel', authenticate, requireAdmin, adminController.cancelAuction);
router.post('/api/admin/bot-simulation', authenticate, requireAdmin, adminController.toggleBotSimulation);
router.get('/api/admin/bot-simulation', authenticate, requireAdmin, adminController.getBotStatus);
router.get('/api/admin/system-overview', authenticate, requireAdmin, adminController.getSystemOverview);
