const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  // Primary fields used by API routes
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false }, // used by routes as `category`
  month: { type: String, required: false }, // e.g. 'มกราคม 2569'
  total: { type: Number, required: false, default: 0 }, // total budget for that month/category

  // Legacy / alternate fields (kept for compatibility)
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
  period: { type: String, enum: ['monthly', 'weekly'], default: 'monthly' },
  startDay: { type: Number, default: 1 },
  startDate: { type: Date },
  notifyThreshold: { type: Number, default: 80 },
  cycleStartDay: { type: Number, default: 1 },
}, {
  timestamps: true
});

// Indexes to support common queries
budgetSchema.index({ userId: 1, month: 1, category: 1 }, { unique: true, partialFilterExpression: { month: { $exists: true } } });
budgetSchema.index({ userId: 1, period: 1, categoryId: 1 });

module.exports = mongoose.model('Budget', budgetSchema);