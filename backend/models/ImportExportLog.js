const mongoose = require('mongoose');

const importExportLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['import', 'export'], required: true },
  fileUrl: { type: String },
  range: { type: String }, // e.g., 2026-01 or custom range
  meta: { type: mongoose.Schema.Types.Mixed },
  status: { type: String, enum: ['pending', 'done', 'failed'], default: 'done' },
}, {
  timestamps: true
});

module.exports = mongoose.model('ImportExportLog', importExportLogSchema);
