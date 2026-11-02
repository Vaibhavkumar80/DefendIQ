import mongoose from 'mongoose';
const { Schema } = mongoose;

const scanSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  type: { type: String, enum: ['url', 'email'], required: true },
  target: { type: String, required: true, maxlength: 2100 },
  label: { type: String, maxlength: 300 },
  verdict: { type: String, enum: ['safe', 'suspicious', 'malicious'], required: true, index: true },
  score: { type: Number, min: 0, max: 100, required: true },
  risk: { type: Number, min: 0, max: 100 },
  primaryThreat: { type: String, enum: ['phishing', 'malware', 'suspicious', 'other', 'none'], default: 'none' },
  categories: { type: Schema.Types.Mixed },
  checks: { type: [Schema.Types.Mixed], default: [] },
  findings: { type: [Schema.Types.Mixed], default: [] },
  positives: { type: [String], default: [] },
  flags: { type: [String], default: [] },
  summary: String,
  meta: { type: Schema.Types.Mixed },
}, { timestamps: { createdAt: true, updatedAt: false } });

scanSchema.index({ user: 1, createdAt: -1 });

export const Scan = mongoose.model('Scan', scanSchema);
