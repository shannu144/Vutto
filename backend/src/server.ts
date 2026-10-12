import http from 'http';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { initSocket } from './sockets/socketHandler';
import { initializeDatabase, prisma } from './utils/prisma';
import { auctionService } from './services/auctionService';
import { logger } from './utils/logger';

dotenv.config();

const PORT = parseInt(process.env.PORT || '5000', 10);

async function bootstrap() {
  await initializeDatabase();

  const app = createApp();
  const server = http.createServer(app);

  // Initialize Socket.IO with CORS
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  initSocket(io);

  // Background Auction Lifecycle Ticker (every 2 seconds)
  const tickerInterval = setInterval(async () => {
    try {
      await auctionService.processLifecycleTicks();
    } catch (err: any) {
      logger.error('Error during auction lifecycle tick:', err.message);
    }
  }, 2000);

  server.listen(PORT, () => {
    logger.info(`Vutto Live Bike Auction Platform Backend running on port ${PORT}`);
    logger.info(`REST API: http://localhost:${PORT}/api`);
    logger.info(`Health Check: http://localhost:${PORT}/health`);
    logger.info(`Prometheus Metrics: http://localhost:${PORT}/metrics`);
  });

  // Graceful Shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    clearInterval(tickerInterval);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await prisma.$disconnect();
      logger.info('Database connections closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  logger.error('Fatal error during application startup:', err);
  process.exit(1);
});
