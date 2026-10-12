import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

import { soundEffects } from '../utils/soundEffects';

export interface TickerBid {
  auctionId: string;
  bidId: string;
  amount: number;
  bidderId: string;
  bidderName: string;
  timestamp: string;
  endTime: string;
  isReserveMet: boolean;
}

export interface ToastAlert {
  id: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  message: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  recentTickerBids: TickerBid[];
  toasts: ToastAlert[];
  dismissToast: (id: string) => void;
  joinAuction: (auctionId: string) => void;
  leaveAuction: (auctionId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [recentTickerBids, setRecentTickerBids] = useState<TickerBid[]>([]);
  const [toasts, setToasts] = useState<ToastAlert[]>([]);

  const addToast = (toast: Omit<ToastAlert, 'id'>) => {
    const id = `toast_${Date.now()}_${Math.random()}`;
    const newToast: ToastAlert = { ...toast, id };
    setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
    setTimeout(() => {
      dismissToast(id);
    }, 6000);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_WS_URL || window.location.origin;
    const socketClient = io(socketUrl, {
      auth: {
        userId: user?.id,
      },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socketClient.on('connect', () => {
      setIsConnected(true);
      socketClient.emit('join:ticker');
    });

    socketClient.on('disconnect', () => {
      setIsConnected(false);
    });

    socketClient.on('ticker:bid', (bid: TickerBid) => {
      setRecentTickerBids((prev) => [bid, ...prev.slice(0, 19)]);
    });

    socketClient.on('ticker:auction_extended', (data: { message: string }) => {
      addToast({
        type: 'warning',
        title: 'Anti-Sniping Soft Close Triggered!',
        message: data.message,
      });
    });

    socketClient.on('user:outbid', (data: { auctionTitle: string; newHighestBid: number }) => {
      soundEffects.playOutbidSound();
      addToast({
        type: 'alert',
        title: 'You Have Been Outbid!',
        message: `A new highest bid of $${data.newHighestBid.toLocaleString()} was placed on "${data.auctionTitle}".`,
      });
    });

    socketClient.on('ticker:status_changed', (data: { auctionId: string; status: string; winnerName?: string; finalBid?: number }) => {
      if (data.status === 'ENDED' && data.winnerName) {
        soundEffects.playGavelSound();
        addToast({
          type: 'success',
          title: 'Auction Concluded!',
          message: `Auction ended. Winner: ${data.winnerName} with $${data.finalBid?.toLocaleString()}`,
        });
      }
    });

    setSocket(socketClient);

    return () => {
      socketClient.disconnect();
    };
  }, [user?.id]);

  const joinAuction = (auctionId: string) => {
    if (socket && isConnected) {
      socket.emit('join:auction', auctionId);
    }
  };

  const leaveAuction = (auctionId: string) => {
    if (socket && isConnected) {
      socket.emit('leave:auction', auctionId);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        recentTickerBids,
        toasts,
        dismissToast,
        joinAuction,
        leaveAuction,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
