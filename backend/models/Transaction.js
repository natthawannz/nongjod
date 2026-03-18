const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  note: { type: String, default: '' },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
  datetime: { type: Date, required: true, default: Date.now },
  source: { type: String, enum: ['text', 'slip', 'slip_ai', 'voice'], default: 'text' },
  rawMessage: { type: mongoose.Schema.Types.Mixed }, // เก็บ raw message/payload เสมอ
}, {
  timestamps: true
});

transactionSchema.index({ userId: 1, datetime: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
