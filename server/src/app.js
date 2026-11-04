import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { csrfGuard, errorHandler, notFound } from './middleware/security.js';
import authRoutes from './routes/auth.js';
import scanRoutes from './routes/scan.js';
import scansRoutes from './routes/scans.js';
import dashboardRoutes from './routes/dashboard.js';
import alertRoutes from './routes/alerts.js';
import reportRoutes from './routes/reports.js';
import awarenessRoutes from './routes/awareness.js';
import accountRoutes from './routes/account.js';
import intelRoutes from './routes/intel.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(helmet({
    contentSecurityPolicy: config.isProd ? {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'script-src': ["'self'", 'https://accounts.google.com'],
        'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com'],
        'font-src': ["'self'", 'https://fonts.gstatic.com'],
        'img-src': ["'self'", 'data:', 'https:'],
        'connect-src': ["'self'", 'https://accounts.google.com'],
        'frame-src': ['https://accounts.google.com'],
        'upgrade-insecure-requests': null,
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());
  app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false, skip: (req) => req.originalUrl.split('?')[0] === '/api/public/stats', message: { error: 'Too many requests. Slow down a little.' } }));
  app.use('/api', csrfGuard);

  app.use('/api/auth', authRoutes);
  app.use('/api/scan', scanRoutes);
  app.use('/api/scans', scansRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/awareness', awarenessRoutes);
  app.use('/api/account', accountRoutes);
  app.use('/api', intelRoutes);
  app.use('/api', notFound);

  // Serve the built React app (npm run build) from the same server in production.
  const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '1h', index: false }));
    app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
