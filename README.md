# Vutto Live Motorcycle Auction Platform 🏍️⚡

A production-grade, high-concurrency real-time auction platform engineered for live used motorcycle auctions. The platform delivers sub-second bid synchronization, multi-user race condition protection, automated lifecycle management, anti-sniping soft-close mechanisms, and enterprise operational observability.

---

## 🚀 Key Highlights & Architectural Features

- **Real-Time Bidding with Sub-Second Synchronization**: Powered by Socket.IO over WebSockets with room partitioning, live tickers, and targeted outbid alerts.
- **Race Condition & Concurrency Control**: Asynchronous per-auction in-memory mutex queues enforce serialized bid evaluation, preventing double-bidding and phantom wins during concurrent bid bursts.
- **Anti-Sniping (Soft-Close) Engine**: Bids submitted within the final 60 seconds automatically extend the auction by 60 seconds, preventing bot sniping and maximizing fair market value.
- **Automated Lifecycle State Machine**: High-precision background engine evaluates auctions every 2 seconds, handling seamless transitions (`UPCOMING` $\rightarrow$ `LIVE` $\rightarrow$ `ENDED`) and broadcasting state updates via WebSockets.
- **Production Observability & Telemetry**:
  - Prometheus `/metrics` endpoint tracking requests, bid latency histograms, active socket gauges, and anti-sniping triggers.
  - System `/health` endpoint reporting database connectivity and memory usage.
  - Structured JSON logging with request-id tracing.
  - Interactive Admin Observability Console with real-time telemetry metrics and immutable audit trails.
- **Live Bidding Bot Simulation**: 1-click toggle in Admin Console to launch automated bidding bots for live evaluation and demonstration without needing manual multi-device testing.
- **1-Click Quick Demo User Switcher**: Seamlessly switch between Buyer 1 (Elena), Buyer 2 (Marcus), Buyer 3 (Alex), and System Administrator in 1 click right from the top navigation bar.

---

## 🔐 Pre-Seeded Test Credentials

| Role | Name | Email | Password | Starting Balance |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@vutto.com` | `Admin@123` | $1,000,000 |
| **Buyer 1** | Elena Rostova | `elena@vutto.com` | `Buyer@123` | $150,000 |
| **Buyer 2** | Marcus Vance | `marcus@vutto.com` | `Buyer@123` | $120,000 |
| **Buyer 3** | Alex Chen | `alex@vutto.com` | `Buyer@123` | $95,000 |

> **Pro Tip**: The application features a **1-Click Demo Account Switcher** in the top navigation bar. You do not even need to type passwords manually to test outbidding between different buyers!

---

## 🛠️ Quick Start & Setup Instructions

### Prerequisites
- Node.js LTS (v20+ recommended)
- npm (v10+)
- *(Zero additional software required: SQLite with WAL mode is embedded!)*

### Setup Steps

```bash
# 1. Clone the repository
git clone <repo-url>
cd Vutto

# 2. Install all dependencies (Backend + Frontend)
npm run install:all

# 3. Seed database with premium motorcycles, buyers, and active auctions
npm run seed

# 4. Build both frontend and backend bundles
npm run build

# 5. Run automated tests to verify concurrency lock & endpoints
npm run test

# 6. Launch production server
npm start
```

Open your browser at **`http://localhost:5000`**.

---

## 💻 Development Mode (Hot-Reload)

To run backend and frontend independently with hot reloading during local development:

```bash
# Terminal 1: Backend development server (Port 5000)
npm run dev:backend

# Terminal 2: Frontend Vite development server (Port 3000)
npm run dev:frontend
```
Vite runs on `http://localhost:3000` and automatically proxies `/api` and `/socket.io` to the backend on `http://localhost:5000`.

---

## 🧪 Automated Testing

The platform includes unit and integration tests powered by Vitest and Supertest:
- **Unit Tests**:
  - `backend/tests/unit/mutex.test.ts`: Proves that concurrent asynchronous tasks on the same auction key are strictly serialized (FIFO), while tasks on different auctions execute in parallel.
  - `backend/tests/unit/bidService.test.ts`: Verifies business rules (insufficient bids rejected, balance validation, non-existent auctions).
- **Integration Tests**:
  - `backend/tests/integration/api.test.ts`: Tests `/health`, Prometheus `/metrics`, `/api/auctions`, and JWT authentication flows.

Run tests anytime:
```bash
npm run test
```

---

## 📊 Operational Telemetry & Observability Endpoints

| URL Path | Protocol | Description |
| :--- | :--- | :--- |
| `http://localhost:5000/` | HTTP | Full-stack interactive Live Auction application |
| `http://localhost:5000/health` | HTTP JSON | System health status, database ping, memory usage, uptime |
| `http://localhost:5000/metrics` | Prometheus | Prometheus telemetry scrape target |
| `http://localhost:5000/api/auctions` | REST JSON | Public auction listing with motorcycle specs and bid counts |

---

## 📁 Project Structure

```
Vutto/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # Prisma SQLite schema (User, Bike, Auction, Bid, AuditLog)
│   │   └── seed.ts              # Database seeder with 5 premium motorcycles & users
│   ├── src/
│   │   ├── controllers/         # Auth, Auction, Bid, Admin, and Metrics controllers
│   │   ├── middlewares/         # JWT auth, rate limiter, request logger, error handler
│   │   ├── routes/              # Centralized API route mappings
│   │   ├── services/            # BidService (mutex), AuctionService (ticker), AuthService
│   │   ├── sockets/             # Socket.IO event handler (rooms, broadcasts, outbid alerts)
│   │   ├── utils/               # Concurrency mutex, Winston logger, Prometheus metrics
│   │   ├── app.ts               # Express application configuration & static dist serving
│   │   └── server.ts            # Server entrypoint with lifecycle ticker & graceful shutdown
│   └── tests/                   # Vitest unit & integration test suites
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/           # AdminConsole (Observability telemetry, Bot simulator)
│   │   │   ├── auction/         # AuctionCard, LiveAuctionRoomModal, LiveTicker, MyBidsModal
│   │   │   ├── common/          # ToastContainer (outbid & anti-sniping alerts)
│   │   │   └── layout/          # Navbar with real-time status and demo user switcher
│   │   ├── context/             # AuthContext (demo switcher), SocketContext
│   │   ├── hooks/               # useCountdown (real-time synchronized timer)
│   │   ├── services/            # Axios API client with token interceptor
│   │   ├── types/               # TypeScript models
│   │   ├── App.tsx              # Main application orchestrator
│   │   └── index.css            # Tailwind CSS styling
│   └── vite.config.ts           # Vite + Tailwind v4 + Proxy config
│
├── docs/
│   ├── ARCHITECTURE.md          # Comprehensive architectural & system design document
│   ├── API_DOCUMENTATION.md     # REST endpoints & WebSocket protocol reference
│   ├── DEPLOYMENT.md            # Cloud deployment guide (Render, Railway, Fly.io, Docker)
│   └── TRADE_OFFS.md            # Architectural decisions, assumptions, and engineering trade-offs
│
├── Dockerfile                   # Production multi-stage Docker build
├── package.json                 # Root script orchestration
└── README.md                    # Master platform guide
```

---

## 📑 Detailed Documentation Links
- [System Architecture & Design Document](docs/ARCHITECTURE.md)
- [API & WebSocket Protocol Specification](docs/API_DOCUMENTATION.md)
- [Deployment Guide (Render, Railway, Fly.io, Docker)](docs/DEPLOYMENT.md)
- [Engineering Trade-offs & Assumptions](docs/TRADE_OFFS.md)
