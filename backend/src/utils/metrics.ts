import client from 'prom-client';

// Prometheus Registry
export const register = new client.Registry();

// Enable default system metrics (CPU, Memory, Event Loop, GC)
client.collectDefaultMetrics({
  register,
  prefix: 'vutto_',
});

// Custom Metrics for Live Auction System
export const httpRequestsTotal = new client.Counter({
  name: 'vutto_http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDurationSeconds = new client.Histogram({
  name: 'vutto_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  registers: [register],
});

export const bidsTotal = new client.Counter({
  name: 'vutto_bids_total',
  help: 'Total number of bids submitted',
  labelNames: ['status'], // 'success' | 'rejected'
  registers: [register],
});

export const bidProcessingDurationMs = new client.Histogram({
  name: 'vutto_bid_processing_duration_ms',
  help: 'Latency of processing and committing a bid in milliseconds',
  buckets: [1, 2, 5, 10, 20, 50, 100, 250, 500],
  registers: [register],
});

export const activeAuctionsGauge = new client.Gauge({
  name: 'vutto_active_auctions_total',
  help: 'Total count of currently active LIVE auctions',
  registers: [register],
});

export const connectedSocketsGauge = new client.Gauge({
  name: 'vutto_connected_sockets_total',
  help: 'Total number of active WebSocket connections',
  registers: [register],
});

export const antiSnipingExtensionsTotal = new client.Counter({
  name: 'vutto_anti_sniping_extensions_total',
  help: 'Total number of times auctions were extended due to anti-sniping trigger',
  registers: [register],
});
