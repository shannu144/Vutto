export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'BUYER';
  balance: number;
}

export interface Bike {
  id: string;
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
  imagesJson: string; // JSON array
  specsJson: string;  // JSON key-value
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  amount: number;
  timestamp: string;
  isWinning: boolean;
  bidder?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface Auction {
  id: string;
  title: string;
  bikeId: string;
  bike: Bike;
  startingPrice: number;
  reservePrice: number;
  minIncrement: number;
  currentBid: number;
  currentWinnerId?: string | null;
  winner?: {
    id: string;
    name: string;
    email: string;
  } | null;
  status: 'DRAFT' | 'UPCOMING' | 'LIVE' | 'ENDED' | 'CANCELLED' | 'SETTLED';
  startTime: string;
  endTime: string;
  originalEndTime: string;
  antiSnipingSeconds: number;
  antiSnipingExtensionsCount: number;
  isReserveMet: boolean;
  bids?: Bid[];
  _count?: {
    bids: number;
  };
}

export interface SystemOverview {
  auctions: {
    total: number;
    live: number;
    upcoming: number;
    ended: number;
  };
  bids: {
    total: number;
  };
  users: {
    total: number;
  };
  system: {
    uptimeSeconds: number;
    nodeVersion: string;
    memoryHeapUsedMb: number;
    memoryRssMb: number;
  };
  botSimulation: {
    isRunning: boolean;
  };
  recentLogs: Array<{
    id: string;
    action: string;
    actorId?: string;
    details: string;
    timestamp: string;
  }>;
}
