const mongoose = require('mongoose');

// One-time login session created from LINE chat to help users open the web app
// as the same LINE-linked account.
const lineLoginSessionSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  lineUserId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

// Auto-delete after expiry time.
lineLoginSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LineLoginSession', lineLoginSessionSchema);
