const mongoose = require('mongoose');

const budgetAlertStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  month: { type: String, required: true }, // e.g. "มีนาคม 2569"
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  // The last alert stage sent for this month/category (80/90/100).
  lastStage: { type: Number, default: 0 },
  lastSentAt: { type: Date },
}, {
  timestamps: true,
});

budgetAlertStateSchema.index({ userId: 1, month: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model('BudgetAlertState', budgetAlertStateSchema);

