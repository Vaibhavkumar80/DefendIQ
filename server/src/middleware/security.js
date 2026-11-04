import { ZodError } from 'zod';
import crypto from 'node:crypto';
import { AppError } from '../lib/errors.js';
import { config } from '../config.js';

// Custom header cannot be sent cross-site without a CORS preflight (which we restrict), blocking CSRF.
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('X-Requested-With') !== 'DefendIQ') return next(new AppError(403, 'Blocked by CSRF protection.', 'csrf'));
  next();
}

export function notFound(req, res, next) {
  next(new AppError(404, 'Route not found.', 'not_found'));
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const fields = {};
    for (const i of err.issues) fields[i.path.join('.') || '_'] = i.message;
    return res.status(400).json({ error: Object.values(fields)[0] || 'Validation failed.', fields });
  }
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body.' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large.' });
  if (err?.code === 11000) return res.status(409).json({ error: 'That value is already in use.' });
  if (err?.name === 'CastError') return res.status(400).json({ error: 'Invalid identifier.' });
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message, code: err.code });

  const ref = crypto.randomBytes(4).toString('hex');
  const detail = `${err?.name || 'Error'}${err?.code ? ` code=${String(err.code)}` : ''}`;
  console.error(`[error ${ref}] ${req.method} ${req.path} (${detail})`);
  if (!config.isProd) console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side.', ref });
}
