// Creates local development data. Never use this script in production.
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './config.js';
import { User } from './models/User.js';
import { Scan } from './models/Scan.js';
import { Alert } from './models/Alert.js';
import { analyzeUrl } from './services/urlAnalyzer.js';

const URLS = ['https://example.com', 'https://github.com/vercel/next.js', 'https://en.wikipedia.org/wiki/Phishing', 'https://accounts.google.com/signin', 'https://www.reddit.com', 'https://stackoverflow.com/questions',
  'http://paypa1-secure-login.xyz/verify/account', 'https://paypal.com.account-verify.xyz/login', 'http://secure-update-appleid.top/signin', 'https://microsft.com', 'https://bit.ly/abc123', 'http://192.168.1.1/login', 'http://dhl-parcel-fee.top/track', 'https://netflix-billing-update.click/pay'];

if (config.isProd) throw new Error('Demo seeding is disabled in production.');
const email = process.env.DEMO_EMAIL?.trim().toLowerCase();
const password = process.env.DEMO_PASSWORD;
if (!email || !password) throw new Error('Set DEMO_EMAIL and DEMO_PASSWORD explicitly before seeding local demo data.');

await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });
await User.deleteOne({ email });
const user = await User.create({ name: 'Demo User', email, passwordHash: await bcrypt.hash(password, 12) });
await Scan.deleteMany({ user: user._id });
const docs = [];
for (let i = 0; i < 60; i++) {
  const r = await analyzeUrl(URLS[Math.floor(Math.random() * URLS.length)], { deep: false });
  const at = new Date(Date.now() - Math.random() * 14 * 864e5);
  docs.push({ ...r, user: user._id, createdAt: at });
}
await Scan.insertMany(docs);
const risky = docs.filter((d) => d.verdict !== 'safe').slice(0, 6);
await Alert.insertMany(risky.map((d) => ({ user: user._id, type: d.verdict === 'malicious' ? 'threat' : 'suspicious', title: d.verdict === 'malicious' ? `Threat blocked: ${d.label}` : `Suspicious url: ${d.label}`, message: d.summary, createdAt: d.createdAt })));
console.log(`Created local development data with ${docs.length} sample scans.`);
await mongoose.disconnect();
