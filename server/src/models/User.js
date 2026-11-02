import mongoose from 'mongoose';
const { Schema } = mongoose;

const userSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, select: false },
  sessionVersion: { type: Number, default: 0 },
  googleId: { type: String, index: true, sparse: true },
  settings: {
    theme: { type: String, enum: ['dark', 'light'], default: 'dark' },
    saveHistory: { type: Boolean, default: true },
    deepChecks: { type: Boolean, default: true },
    alertsEnabled: { type: Boolean, default: true },
    alertThreshold: { type: String, enum: ['suspicious', 'malicious'], default: 'suspicious' },
  },
  completedModules: { type: [String], default: [] },
  resetTokenHash: { type: String, select: false },
  resetExpires: { type: Date, select: false },
  lastLoginAt: Date,
}, { timestamps: true });

userSchema.methods.toPublic = function toPublic() {
  return {
    id: String(this._id),
    name: this.name,
    email: this.email,
    settings: this.settings,
    createdAt: this.createdAt,
    lastLoginAt: this.lastLoginAt,
  };
};

export const User = mongoose.model('User', userSchema);
