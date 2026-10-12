import { Request, Response } from 'express';
import { register } from '../utils/metrics';
import { prisma } from '../utils/prisma';

export const metricsController = {
  async getPrometheusMetrics(req: Request, res: Response) {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (err: any) {
      res.status(500).end(err.message);
    }
  },

  async getHealth(req: Request, res: Response) {
    let dbStatus = 'healthy';
    try {
      await prisma.$queryRawUnsafe('SELECT 1;');
    } catch (err) {
      dbStatus = 'degraded';
    }

    const memory = process.memoryUsage();

    res.json({
      status: dbStatus === 'healthy' ? 'UP' : 'DEGRADED',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      components: {
        database: { status: dbStatus },
        memory: {
          rssMb: Math.round(memory.rss / 1024 / 1024),
          heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        },
      },
    });
  },
};
