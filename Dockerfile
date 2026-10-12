# ==========================================
# Multi-stage Dockerfile for Vutto Bike Auction Platform
# ==========================================

# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npx prisma generate
RUN npx prisma db push
RUN npm run build

# Stage 3: Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Install production dependencies for backend
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# Copy generated Prisma engine & client
COPY --from=backend-builder /app/backend/node_modules/.prisma ./backend/node_modules/.prisma
COPY --from=backend-builder /app/backend/node_modules/@prisma ./backend/node_modules/@prisma
COPY --from=backend-builder /app/backend/prisma ./backend/prisma

# Copy compiled backend dist
COPY --from=backend-builder /app/backend/dist ./backend/dist

# Copy compiled frontend dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

EXPOSE 5000

# Run database migration/seed check and start production server
CMD ["node", "backend/dist/server.js"]
