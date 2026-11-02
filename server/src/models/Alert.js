import mongoose from 'mongoose';
const { Schema } = mongoose;

const alertSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  type: { type: String, enum: ['threat', 'suspicious', 'info', 'system'], default: 'info' },
  title: { type: String, required: true, maxlength: 160 },
  message: { type: String, maxlength: 600 },
  scan: { type: Schema.Types.ObjectId, ref: 'Scan' },
  read: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });
alertSchema.index({ user: 1, createdAt: -1 });

export const Alert = mongoose.model('Alert', alertSchema);
