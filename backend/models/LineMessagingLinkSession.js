const mongoose = require('mongoose');

// Short-lived link session to connect a LINE Messaging API userId to an existing web account.
const lineMessagingLinkSessionSchema = new mongoose.Schema({
  codeHash: { type: String, required: true, unique: true, index: true },
  lineMessagingUserId: { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
}, {
  timestamps: true,
});

lineMessagingLinkSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('LineMessagingLinkSession', lineMessagingLinkSessionSchema);

