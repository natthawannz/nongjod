const mongoose = require('mongoose');

const monthlyReportStateSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  cycleKey: { type: String, required: true }, // e.g. "2026-02-01_2026-02-29"
  startKey: { type: String, required: true }, // YYYY-MM-DD (Bangkok)
  endKey: { type: String, required: true }, // YYYY-MM-DD (Bangkok)
  sentAt: { type: Date },
}, {
  timestamps: true,
});

monthlyReportStateSchema.index({ userId: 1, cycleKey: 1 }, { unique: true });

module.exports = mongoose.model('MonthlyReportState', monthlyReportStateSchema);

