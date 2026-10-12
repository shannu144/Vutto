import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from '../utils/logger';
import { connectedSocketsGauge } from '../utils/metrics';

let ioInstance: SocketIOServer | null = null;
const userSocketsMap = new Map<string, Set<string>>(); // userId -> Set of socketIds

export function initSocket(io: SocketIOServer) {
  ioInstance = io;

  io.on('connection', (socket: Socket) => {
    connectedSocketsGauge.inc();
    const userId = socket.handshake.auth?.userId;
    if (userId) {
      if (!userSocketsMap.has(userId)) {
        userSocketsMap.set(userId, new Set());
      }
      userSocketsMap.get(userId)!.add(socket.id);
      logger.info(`Socket authenticated user connected: ${userId} (${socket.id})`);
    } else {
      logger.info(`Anonymous socket connected: ${socket.id}`);
    }

    // Join room for specific auction live updates
    socket.on('join:auction', (auctionId: string) => {
      socket.join(`auction:${auctionId}`);
      logger.debug(`Socket ${socket.id} joined room auction:${auctionId}`);
    });

    socket.on('leave:auction', (auctionId: string) => {
      socket.leave(`auction:${auctionId}`);
      logger.debug(`Socket ${socket.id} left room auction:${auctionId}`);
    });

    // Join global ticker room for all auctions
    socket.on('join:ticker', () => {
      socket.join('auctions:ticker');
    });

    socket.on('disconnect', () => {
      connectedSocketsGauge.dec();
      if (userId && userSocketsMap.has(userId)) {
        userSocketsMap.get(userId)!.delete(socket.id);
        if (userSocketsMap.get(userId)!.size === 0) {
          userSocketsMap.delete(userId);
        }
      }
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });
}

export function getIO(): SocketIOServer {
  if (!ioInstance) {
    throw new Error('Socket.IO instance not initialized yet!');
  }
  return ioInstance;
}

export function emitBidPlaced(data: {
  auctionId: string;
  bidId: string;
  amount: number;
  bidderId: string;
  bidderName: string;
  timestamp: string;
  endTime: string;
  isReserveMet: boolean;
}) {
  if (!ioInstance) return;

  // Broadcast to auction room
  ioInstance.to(`auction:${data.auctionId}`).emit('bid:placed', data);
  // Broadcast to global ticker
  ioInstance.to('auctions:ticker').emit('ticker:bid', data);
}

export function emitAuctionExtended(data: {
  auctionId: string;
  newEndTime: string;
  antiSnipingExtensionsCount: number;
  message: string;
}) {
  if (!ioInstance) return;
  ioInstance.to(`auction:${data.auctionId}`).emit('auction:extended', data);
  ioInstance.to('auctions:ticker').emit('ticker:auction_extended', data);
}

export function emitAuctionStatusChanged(data: {
  auctionId: string;
  status: string;
  winnerId?: string | null;
  winnerName?: string | null;
  finalBid?: number;
}) {
  if (!ioInstance) return;
  ioInstance.to(`auction:${data.auctionId}`).emit('auction:status_changed', data);
  ioInstance.to('auctions:ticker').emit('ticker:status_changed', data);
}

export function emitOutbidAlert(userId: string, data: {
  auctionId: string;
  auctionTitle: string;
  newHighestBid: number;
}) {
  if (!ioInstance) return;
  const socketIds = userSocketsMap.get(userId);
  if (socketIds) {
    socketIds.forEach((sId) => {
      ioInstance!.to(sId).emit('user:outbid', data);
    });
  }
}
