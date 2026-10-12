# API Documentation & WebSocket Protocol
## Vutto Live Motorcycle Auction Platform

---

## 1. REST API Specification

### Base URL
- Local: `http://localhost:5000`
- Production: `<deployed-url>`

---

### Authentication Endpoints

#### `POST /api/auth/register`
Create a new user account.
- **Request Body**:
  ```json
  {
    "email": "user@vutto.com",
    "password": "Password123!",
    "name": "Jane Rider",
    "role": "BUYER"
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "cm2b...",
      "email": "user@vutto.com",
      "name": "Jane Rider",
      "role": "BUYER",
      "balance": 100000
    }
  }
  ```

#### `POST /api/auth/login`
Authenticate existing user and receive JWT.
- **Request Body**:
  ```json
  {
    "email": "elena@vutto.com",
    "password": "Buyer@123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
  ```

#### `GET /api/auth/me`
Retrieve authenticated user profile.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**:
  ```json
  {
    "id": "cm2b...",
    "email": "elena@vutto.com",
    "name": "Elena Rostova",
    "role": "BUYER",
    "balance": 150000,
    "_count": { "bids": 12, "wonAuctions": 1 }
  }
  ```

---

### Public Auction Endpoints

#### `GET /api/auctions`
Retrieve paginated and filtered list of auctions.
- **Query Parameters**:
  - `status`: `ALL` | `LIVE` | `UPCOMING` | `ENDED` (optional)
  - `search`: String matching title, make, or model (optional)
  - `limit`: Number (default: 50)
  - `offset`: Number (default: 0)
- **Response `200 OK`**:
  ```json
  {
    "auctions": [
      {
        "id": "cm2b...",
        "title": "2023 Ducati Panigale V4 S",
        "currentBid": 28500,
        "status": "LIVE",
        "endTime": "2026-10-12T16:30:00.000Z",
        "antiSnipingExtensionsCount": 0,
        "bike": { ... },
        "winner": { "name": "Elena Rostova" }
      }
    ],
    "total": 5
  }
  ```

#### `GET /api/auctions/:id`
Retrieve full auction details with motorcycle specifications and bid history.
- **Response `200 OK`**:
  ```json
  {
    "id": "cm2b...",
    "title": "2023 Ducati Panigale V4 S",
    "startingPrice": 22000,
    "currentBid": 28500,
    "minIncrement": 250,
    "reservePrice": 27000,
    "isReserveMet": true,
    "bike": {
      "make": "Ducati",
      "model": "Panigale V4 S",
      "year": 2023,
      "mileage": 1240,
      "vin": "ZDM14AEW2PB001928",
      "conditionScore": 9.8,
      "specsJson": "{\"horsepower\":\"215.5 HP\"}"
    },
    "bids": [
      {
        "id": "cm2b...",
        "amount": 28500,
        "timestamp": "2026-10-12T16:25:00.000Z",
        "isWinning": true,
        "bidder": { "name": "Elena Rostova" }
      }
    ]
  }
  ```

---

### Bidding Endpoints

#### `POST /api/bids`
Place an atomic bid on an active live auction.
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "auctionId": "cm2b...",
    "amount": 29000
  }
  ```
- **Response `201 Created`**:
  ```json
  {
    "message": "Bid placed successfully",
    "bid": {
      "id": "cm2b...",
      "amount": 29000,
      "isWinning": true,
      "timestamp": "2026-10-12T16:26:10.000Z"
    },
    "auction": {
      "currentBid": 29000,
      "endTime": "2026-10-12T16:31:00.000Z"
    },
    "isExtended": false,
    "durationMs": 4.2
  }
  ```

#### `GET /api/bids/my-bids`
Retrieve history of bids submitted by authenticated user.
- **Headers**: `Authorization: Bearer <token>`
- **Response `200 OK`**: Array of bids with auction details and winning position.

---

### Admin Endpoints (`role: ADMIN`)

#### `POST /api/admin/auctions`
Create and schedule a new motorcycle auction.
- **Headers**: `Authorization: Bearer <admin-token>`
- **Request Body**:
  ```json
  {
    "title": "2024 Ducati Streetfighter V4 SP2",
    "startingPrice": 28000,
    "reservePrice": 34000,
    "minIncrement": 500,
    "startTime": "2026-10-12T16:30:00.000Z",
    "endTime": "2026-10-12T17:00:00.000Z",
    "antiSnipingSeconds": 60,
    "bike": {
      "make": "Ducati",
      "model": "Streetfighter V4 SP2",
      "year": 2024,
      "engineCc": 1103,
      "mileage": 450,
      "vin": "ZDM14AEW2PB992100",
      "conditionScore": 9.9,
      "inspectionSummary": "Pristine track condition",
      "location": "Miami, FL",
      "primaryImage": "https://..."
    }
  }
  ```

#### `POST /api/admin/auctions/:id/start`
Force transition an upcoming auction to LIVE state immediately.

#### `POST /api/admin/auctions/:id/end`
Manually end and settle an active auction early.

#### `POST /api/admin/bot-simulation`
Toggle automated live bidding bots on/off.
- **Request Body**: `{"enable": true}`

#### `GET /api/admin/system-overview`
Retrieve system telemetry, memory usage, auction counts, and recent audit logs.

---

### Observability Endpoints

#### `GET /health`
Returns system component status:
```json
{
  "status": "UP",
  "timestamp": "2026-10-12T16:28:00.000Z",
  "uptimeSeconds": 1420,
  "components": {
    "database": { "status": "healthy" },
    "memory": { "rssMb": 68, "heapUsedMb": 34 }
  }
}
```

#### `GET /metrics`
Standard Prometheus exposition format exposing `vutto_http_requests_total`, `vutto_bids_total`, `vutto_active_auctions_total`, etc.

---

## 2. WebSocket Protocol (Socket.IO)

### Client to Server Events
- `join:auction` `(auctionId: string)`: Joins room for live bid updates on specific auction.
- `leave:auction` `(auctionId: string)`: Leaves room.
- `join:ticker` `()`: Subscribes to global live bids stream across all auctions.

### Server to Client Events
- `bid:placed`: Emitted to `auction:<id>` when a new highest bid is accepted.
  ```json
  {
    "auctionId": "...",
    "bidId": "...",
    "amount": 29000,
    "bidderId": "...",
    "bidderName": "Elena Rostova",
    "timestamp": "...",
    "endTime": "...",
    "isReserveMet": true
  }
  ```
- `auction:extended`: Emitted when anti-sniping soft-close extends auction duration.
  ```json
  {
    "auctionId": "...",
    "newEndTime": "...",
    "antiSnipingExtensionsCount": 1,
    "message": "Late bid triggered anti-sniping protection! Auction extended by 60s."
  }
  ```
- `user:outbid`: Targeted direct event sent to the user socket of the previously winning bidder.
  ```json
  {
    "auctionId": "...",
    "auctionTitle": "2023 Ducati Panigale V4 S",
    "newHighestBid": 29000
  }
  ```
- `ticker:bid`: Streamed to global ticker subscribers.
- `auction:status_changed`: Broadcast when auction lifecycle transitions (`LIVE`, `ENDED`, `CANCELLED`).
