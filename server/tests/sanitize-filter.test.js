import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Scan } from '../src/models/Scan.js';
import { User } from '../src/models/User.js';

mongoose.set('sanitizeFilter', true);

test('trusted server-side query operators remain usable with sanitizeFilter enabled', () => {
  const user = new mongoose.Types.ObjectId();
  const since = new Date();

  assert.doesNotThrow(() => Scan.find({
    user,
    createdAt: mongoose.trusted({ $gte: since }),
  }).cast());
  assert.doesNotThrow(() => Scan.countDocuments({
    user,
    verdict: mongoose.trusted({ $ne: 'safe' }),
  }).cast());
  assert.doesNotThrow(() => User.findOne({
    email: 'person@example.com',
    resetExpires: mongoose.trusted({ $gt: since }),
  }).cast());
});
