# Architecture & System Design Document
## Vutto Live Motorcycle Auction Platform

---

## 1. Executive Summary
Vutto is a production-grade, high-concurrency real-time auction platform engineered for used motorcycle auctions. The platform delivers sub-second bid synchronization, anti-sniping protection (soft-close), multi-user race-condition prevention, and operational observability (structured JSON logging, Prometheus metrics, and automated lifecycle state machines).

---

## 2. High-Level System Architecture

```
                    ┌────────────────────────────────────────┐
                    │          Client Layer (React)          │
                    │   Vite + TypeScript + Tailwind CSS     │
                    │   Socket.IO Client + Web Audio / Toast │
                    └───────────────────┬────────────────────┘
                                        │
                         HTTP REST / WebSocket (WSS)
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │          Application Gateway           │
                    │    Reverse Proxy / Helmet / CORS       │
                    │       Rate Limiting & Request ID       │
                    └───────────────────┬────────────────────┘
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           │                            │                            │
           ▼                            ▼                            ▼
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│   Auth & RBAC       │      │   Bid Engine        │      │ Auction Lifecycle   │
│   Controller        │      │   & Mutex Manager   │      │ State Machine       │
│   (JWT / bcrypt)    │      │   (Anti-Sniping)    │      │ (2s Auto-Ticker)    │
└──────────┬──────────┘      └──────────┬──────────┘      └──────────┬──────────┘
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │          Data Persistence              │
                    │     Prisma ORM with SQLite WAL         │
                    │  (ACID Transactions & Row Isolation)   │
                    └───────────────────┬────────────────────┘
                                        │
                                        ▼
                    ┌────────────────────────────────────────┐
                    │      Observability & Telemetry         │
                    │   Winston JSON Logs • prom-client      │
                    │    /metrics Endpoint • /health         │
                    └────────────────────────────────────────┘
```

---

## 3. Core Architectural Components

### 3.1 Presentation & Real-Time Client (`frontend/`)
- **Technology Stack**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Canvas-Confetti.
- **State Management & Sockets**:
  - `AuthContext`: Manages user credentials, JWT session persistence, auto-refresh of available bidding balance, and 1-click test user switching (Elena, Marcus, Alex, Admin).
  - `SocketContext`: Connects to backend Socket.IO gateway with connection resilience (heartbeats, auto-reconnect, exponential backoff).
- **Interactive Live Room**:
  - Displays high-resolution multi-angle motorcycle galleries.
  - Mechanical inspection summary and 10-point condition verification score.
  - Synchronized countdown timer with urgency styling (< 120s).
  - Anti-sniping soft-close alert banner.
  - 1-click dynamic increment bid buttons (+min, +2x, +5x) and custom bid input.
  - Real-time bid log stream updated over WebSockets.

### 3.2 Real-Time Event Broker (`src/sockets/socketHandler.ts`)
- **Engine**: Socket.IO over WebSocket with HTTP long-polling fallback.
- **Room Strategy**:
  - `auction:<auctionId>`: Auction-specific room where participants receive sub-second bid updates, anti-sniping extension events, and timer synchronizations.
  - `auctions:ticker`: Global broadcast room streaming live bids across all auctions to the top ticker.
  - Targeted direct sockets: Instant push notifications sent exclusively to outbid users (`user:outbid`).

### 3.3 Concurrency Control & Atomic Bid Engine (`src/services/bidService.ts`)
When multiple users or automated bidding bots submit bids simultaneously (within the same millisecond):
1. **Per-Auction Mutex Synchronization (`src/utils/mutex.ts`)**:
   - Each auction has an isolated asynchronous execution lock.
   - Concurrent incoming bids for the same auction are queued and executed strictly sequentially (FIFO), preventing race conditions.
   - Bids on *different* auctions execute fully in parallel without blocking each other.
2. **Multi-Constraint Validation**:
   - Status must be strictly `LIVE`.
   - `now < auction.endTime`.
   - `amount >= currentBid + minIncrement`.
   - Bidder cannot outbid their own active winning bid (prevents self-bidding loops).
   - Bidder must possess sufficient available balance.
3. **Database Transaction Isolation**:
   - Uses `prisma.$transaction` to atomically:
     - Mark prior bids as `isWinning = false`.
     - Insert new `Bid` record.
     - Update `Auction` state (`currentBid`, `currentWinnerId`, `isReserveMet`, `endTime`).
4. **Anti-Sniping Soft-Close Mechanism**:
   - If a bid arrives with $\le 60$ seconds remaining before `endTime`:
     - The auction `endTime` is automatically extended by 60 seconds.
     - `antiSnipingExtensionsCount` increments.
     - An `auction:extended` event broadcasts to all participants.
     - Prometheus metric `vutto_anti_sniping_extensions_total` increments.

### 3.4 Automated Auction Lifecycle Engine (`src/services/auctionService.ts`)
- A background ticker executes every 2,000 ms to evaluate auction state transitions:
  - `UPCOMING` $\rightarrow$ `LIVE` when `startTime <= now < endTime`.
  - `LIVE` $\rightarrow$ `ENDED` when `now >= endTime`.
- Dispatches WebSocket broadcast `auction:status_changed` to transition client interfaces smoothly without requiring page reloads.
- Updates Prometheus metric gauge `vutto_active_auctions_total`.

### 3.5 Observability & Operational Telemetry
- **Structured Logging (`src/utils/logger.ts`)**:
  - Winston logger outputting JSON format with timestamps, log level, correlation `x-request-id`, duration in ms, client IP, and contextual metadata.
- **Prometheus Telemetry (`src/utils/metrics.ts`)**:
  - `/metrics` endpoint scrapes standard Prometheus format metrics:
    - `vutto_http_requests_total`: Counter by method, route, status code.
    - `vutto_http_request_duration_seconds`: Histogram of API latency.
    - `vutto_bids_total`: Counter partitioned by status (`success` vs `rejected`).
    - `vutto_bid_processing_duration_ms`: Histogram of atomic bid processing time.
    - `vutto_active_auctions_total`: Gauge tracking current live auctions count.
    - `vutto_connected_sockets_total`: Gauge tracking active WebSocket connections.
    - `vutto_anti_sniping_extensions_total`: Counter tracking anti-sniping triggers.
- **Health Check (`/health`)**:
  - Reports database connection status, memory consumption (RSS and heap), process uptime, and system health status.

---

## 4. Database Schema & ERD

```
┌────────────────────────┐         ┌────────────────────────┐
│         User           │         │          Bike          │
├────────────────────────┤         ├────────────────────────┤
│ id (PK)                │         │ id (PK)                │
│ email (Unique)         │         │ make, model, year      │
│ passwordHash           │         │ engineCc, mileage, vin │
│ name                   │         │ conditionScore         │
│ role (BUYER | ADMIN)   │         │ inspectionSummary      │
│ balance                │         │ primaryImage, images   │
│ createdAt, updatedAt   │         │ specsJson              │
└───────────┬────────────┘         └───────────┬────────────┘
            │                                  │ 1
            │ 1                                │
            │                                  │
            ▼ *                                ▼ *
┌────────────────────────┐         ┌────────────────────────┐
│          Bid           │ *     1 │        Auction         │
├────────────────────────┼─────────┼────────────────────────┤
│ id (PK)                │         │ id (PK)                │
│ auctionId (FK)         │         │ bikeId (FK)            │
│ bidderId (FK)          │         │ title                  │
│ amount                 │         │ startingPrice          │
│ timestamp              │         │ reservePrice           │
│ isWinning              │         │ minIncrement           │
│ ipAddress              │         │ currentBid             │
└────────────────────────┘         │ currentWinnerId (FK)   │
                                   │ status (LIVE, etc.)    │
                                   │ startTime, endTime     │
                                   │ antiSnipingSeconds     │
                                   │ extensionsCount        │
                                   │ isReserveMet           │
                                   └────────────────────────┘
```

---

## 5. Security & Protection Measures
1. **Authentication**: Stateless JSON Web Tokens (JWT) signed with HMAC SHA-256 and expiration.
2. **Password Storage**: Passwords hashed using `bcrypt` with 10 salt rounds.
3. **Role-Based Access Control (RBAC)**: Strict `requireAdmin` middleware guards auction creation, manual status overrides, and simulation toggles.
4. **Input Validation**: `Zod` schemas validate every incoming request body and query parameter with explicit error responses.
5. **Rate Limiting**: `express-rate-limit` prevents brute force and denial of service.
6. **Security Headers**: `helmet` enforces secure headers against clickjacking and cross-site scripting.
7. **Negative Bid Prevention**: Validation asserts bid strictly exceeds current bid by at least `minIncrement`.
