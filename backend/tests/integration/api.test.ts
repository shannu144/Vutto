import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { initializeDatabase, prisma } from '../../src/utils/prisma';

const app = createApp();

describe('API Integration Endpoints', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('GET /health should return 200 with system status UP', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('UP');
    expect(res.body.components.database.status).toBe('healthy');
  });

  it('GET /metrics should return Prometheus metrics output format', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.text).toContain('vutto_');
  });

  it('GET /api/auctions should return array of auctions', async () => {
    const res = await request(app).get('/api/auctions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.auctions)).toBe(true);
    expect(res.body.total).toBeGreaterThan(0);
  });

  it('POST /api/auth/login with wrong credentials should return 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@vutto.com', password: 'WrongPassword!' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/auth/login with valid seeded buyer credentials should return token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'elena@vutto.com', password: 'Buyer@123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('elena@vutto.com');
  });
});
