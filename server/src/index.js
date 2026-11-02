import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';
import { refreshFeeds } from './services/intelFeed.js';

mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

try {
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
} catch (e) {
  console.error(`\n[db] Could not connect to MongoDB (${e?.name || 'connection error'}).\n     Verify MONGODB_URI, network access, and Atlas IP access rules.\n`);
  process.exit(1);
}
console.log('[db] connected');

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[api] DefendIQ API listening on http://localhost:${config.port}`);
  refreshFeeds().then((s) => console.log(`[feeds] ${s.entries} entries from ${s.sources.filter((x) => x.ok).length}/${s.sources.length} sources`)).catch(() => {});
});
setInterval(() => refreshFeeds().catch(() => {}), 6 * 3600e3).unref();

const stop = () => server.close(() => mongoose.disconnect().finally(() => process.exit(0)));
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
