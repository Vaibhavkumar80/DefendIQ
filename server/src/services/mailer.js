import { config } from '../config.js';
import { AppError } from '../lib/errors.js';

export async function sendMail({ to, subject, text }) {
  if (!config.smtp.host) {
    throw new AppError(503, 'Password reset email is not configured on this server.', 'mail_not_configured');
  }
  try {
    const { default: nodemailer } = await import('nodemailer');
    const tx = nodemailer.createTransport({ host: config.smtp.host, port: config.smtp.port, secure: config.smtp.port === 465, auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined });
    const result = await tx.sendMail({ from: config.smtp.from, to, subject, text });
    if (result.rejected?.length || !result.accepted?.length) throw new Error('SMTP rejected the message.');
    return { delivered: true };
  } catch (e) {
    console.error('[mail] delivery failed:', e?.code || e?.name || 'unknown error');
    throw new AppError(503, 'Password reset email could not be sent. Please try again later.', 'mail_unavailable');
  }
}
