import mongoose from 'mongoose';
const { Schema } = mongoose;

export const QuizResult = mongoose.model('QuizResult', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  score: Number,
  total: Number,
}, { timestamps: { createdAt: true, updatedAt: false } }));

export const SimResult = mongoose.model('SimResult', new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  scenarioId: String,
  correct: Boolean,
}, { timestamps: { createdAt: true, updatedAt: false } }));
