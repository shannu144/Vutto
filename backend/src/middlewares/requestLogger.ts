import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { httpRequestsTotal, httpRequestDurationSeconds } from '../utils/metrics';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime();
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationSeconds = diff[0] + diff[1] / 1e9;
    const statusCode = res.statusCode.toString();
    const route = req.route?.path || req.path;

    // Track Prometheus metrics
    httpRequestsTotal.inc({ method: req.method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method: req.method, route, status_code: statusCode }, durationSeconds);

    // Filter noisy metrics polling from general info logs
    if (req.path !== '/metrics' && req.path !== '/health') {
      logger.info(`${req.method} ${req.originalUrl} - ${statusCode} [${(durationSeconds * 1000).toFixed(2)}ms]`, {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: durationSeconds * 1000,
        ip: req.ip,
      });
    }
  });

  next();
}
