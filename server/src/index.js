import 'dotenv/config';
import mongoose from 'mongoose';
import { config } from './config.js';
import { createApp } from './app.js';
import { refreshFeeds } from './services/intelFeed.js';

mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

const app = createApp();
const server = app.listen(config.port, () => {
  console.log(`[api] DefendIQ API listening on port ${config.port}`);
  connectMongo();
  refreshFeeds().then((s) => console.log(`[feeds] ${s.entries} entries from ${s.sources.filter((x) => x.ok).length}/${s.sources.length} sources`)).catch(() => {});
});
setInterval(() => refreshFeeds().catch(() => {}), 6 * 3600e3).unref();

let stopping = false;

async function connectMongo() {
  let delay = 1000;
  while (!stopping && mongoose.connection.readyState !== 1) {
    try {
      await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
      console.log('[db] connected');
      return;
    } catch (error) {
      console.error(`[db] MongoDB unavailable (${error?.name || 'connection error'}); retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 30000);
    }
  }
}

function stop(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  server.close(() => {
    mongoose.disconnect().catch(() => {}).finally(() => { process.exitCode = exitCode; });
  });
  const forceExit = setTimeout(() => process.exit(exitCode), 10000);
  forceExit.unref();
}

process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
process.on('unhandledRejection', (reason) => {
  console.error(`[fatal] unhandled rejection (${reason?.name || typeof reason})`);
  stop(1);
});
process.on('uncaughtException', (error) => {
  console.error(`[fatal] uncaught exception (${error?.name || 'Error'})`);
  stop(1);
});
