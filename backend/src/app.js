'use strict';

const crypto = require('node:crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const pinoHttp = require('pino-http');
const rateLimit = require('express-rate-limit');
const Sentry = require('./instrument');

const config = require('./config');
const logger = require('./lib/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const catsRoutes = require('./routes/cats');
const logsRoutes = require('./routes/logs');
const diseasesRoutes = require('./routes/diseases');
const dashboardRoutes = require('./routes/dashboard');
const devicesRoutes = require('./routes/devices');

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

  app.use(notFoundHandler);
  if (config.sentry.dsn) Sentry.setupExpressErrorHandler(app); // must come before our own error handler
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
