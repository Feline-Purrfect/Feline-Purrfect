import crypto from 'node:crypto';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import Sentry from './instrument.js';

import config from './config.js';
import logger from './lib/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

import healthRoutes from './routes/health.js';
import authRoutes from './routes/auth.js';
import catsRoutes from './routes/cats.js';
import logsRoutes from './routes/logs.js';
import diseasesRoutes from './routes/diseases.js';
import dashboardRoutes from './routes/dashboard.js';
import devicesRoutes from './routes/devices.js';

function createApp() {
  const app = express();

  app.set('trust proxy', 1); // Render terminates TLS in front of us; needed for correct client IPs
  app.disable('x-powered-by');

  app.use(pinoHttp({
    logger,
    genReqId: (req, res) => {
      const id = req.headers['x-request-id'] || crypto.randomUUID();
      res.setHeader('X-Request-Id', id);
      return id;
    },
    autoLogging: { ignore: (req) => req.url === '/health' },
    customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
    serializers: {
      req: (req) => ({ id: req.id, method: req.method, url: req.url }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
  }));
  app.use(helmet());
  app.use(cors({
    origin: config.corsOrigins.length ? config.corsOrigins : true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  }));

  // Health endpoints sit before rate limiting so monitors are never throttled.
  app.use(healthRoutes);

  const jsonSmall = express.json({ limit: '100kb' });
  const jsonPhoto = express.json({ limit: '8mb' }); // cats carry a base64 photo

  const general = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { code: 'LimitExceededException', message: 'Too many requests. Please slow down.' },
  });
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 40, standardHeaders: 'draft-7', legacyHeaders: false,
    message: { code: 'LimitExceededException', message: 'Too many attempts. Please try again later.' },
  });

  app.use(general);
  app.use('/auth', authLimiter, jsonSmall, authRoutes);
  app.use('/cats', jsonPhoto, catsRoutes);
  app.use('/logs', jsonSmall, logsRoutes);
  app.use('/diseases', diseasesRoutes);
  app.use('/dashboard', dashboardRoutes);
  app.use('/devices', jsonSmall, devicesRoutes);

  // Sentry smoke test (dev only). Must be registered before the 404 handler or it is unreachable.
  if (!config.isProd) {
    app.get('/debug-sentry', () => {
      throw new Error('Sentry test error from /debug-sentry');
    });
  }

  app.use(notFoundHandler);
  if (config.sentry.dsn) Sentry.setupExpressErrorHandler(app); // must come before our own error handler
  app.use(errorHandler);

  return app;
}

export { createApp };
