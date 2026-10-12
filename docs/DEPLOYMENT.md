# Deployment Guide
## Vutto Live Motorcycle Auction Platform

This guide outlines how to deploy Vutto to production cloud providers, run it via Docker, or run it locally in one step.

---

## 1. Quick Local Production Run (Zero Extra Services Required)

The application has been engineered to run out-of-the-box with Node.js LTS (v20+):

```bash
# 1. Clone repository
git clone <repo-url>
cd Vutto

# 2. Install all dependencies (Backend + Frontend)
npm run install:all

# 3. Seed database with motorcycles, users, and auctions
npm run seed

# 4. Build both frontend and backend bundles
npm run build

# 5. Start unified full-stack production server
npm start
```
The full application will be live at **`http://localhost:5000`** with:
- **Frontend App**: `http://localhost:5000`
- **Health Check**: `http://localhost:5000/health`
- **Prometheus Telemetry**: `http://localhost:5000/metrics`

---

## 2. Deploying to Render (Free / Pro Web Service)

Render allows you to deploy Node.js full-stack applications directly from a GitHub repository:

1. Push your code to GitHub.
2. Sign in to [Render.com](https://render.com) and click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository.
4. Fill in the service configuration:
   - **Name**: `vutto-bike-auctions`
   - **Environment**: `Node`
   - **Region**: Any (e.g., Oregon or Frankfurt)
   - **Branch**: `main`
   - **Build Command**:
     ```bash
     npm run install:all && npm run seed && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
5. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `PORT`: `10000` (Render provides this automatically)
   - `JWT_SECRET`: `your-random-production-secret-key-32-chars-long`
6. Click **Deploy Web Service**.
7. Once deployment finishes, Render provides a public URL (e.g., `https://vutto-bike-auctions.onrender.com`).

---

## 3. Deploying to Railway

Railway provides rapid container and repo deployments:

1. Install the Railway CLI or use the Railway Dashboard:
   ```bash
   railway login
   railway init
   ```
2. Link your GitHub repository or deploy directly:
   ```bash
   railway up
   ```
3. Set Environment Variables in Railway dashboard:
   - `NODE_ENV` = `production`
   - `JWT_SECRET` = `super-secret-key`
4. Set Build Command: `npm run install:all && npm run seed && npm run build`
5. Set Start Command: `npm start`
6. Railway assigns a public URL with HTTPS enabled automatically.

---

## 4. Deploying via Docker

A multi-stage `Dockerfile` is included in the project root:

```bash
# 1. Build the Docker image
docker build -t vutto-auction:latest .

# 2. Run the container
docker run -d -p 5000:5000 \
  -e NODE_ENV=production \
  -e JWT_SECRET=vutto-production-secret-key-super-secure-2026 \
  --name vutto-live \
  vutto-auction:latest

# 3. View logs
docker logs -f vutto-live
```
Access the application at `http://localhost:5000`.

---

## 5. Deploying to Fly.io

1. Install `flyctl` and sign in:
   ```bash
   fly auth login
   ```
2. Launch app configuration:
   ```bash
   fly launch
   ```
3. Deploy:
   ```bash
   fly deploy
   ```

---

## 6. Verifying Production Deployment

Once deployed to a link, verify the following endpoints:

| Endpoint | Expected Status | Purpose |
| :--- | :--- | :--- |
| `GET /` | `200 OK` | Main Frontend Live Auction interface |
| `GET /health` | `200 OK` | System health check (`status: "UP"`, DB status, memory) |
| `GET /metrics` | `200 OK` | Prometheus scrape target (`vutto_http_requests_total`, etc.) |
| `GET /api/auctions` | `200 OK` | Auction catalog listing JSON |
