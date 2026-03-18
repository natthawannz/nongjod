const mongoose = require('mongoose');

// Map additional LINE userId values (from LIFF / other providers) to a canonical backend user.
// This is used when LINE provides different `userId` values between LIFF and Messaging API,
// but we still want a single account in our database.
const lineMessagingAliasSchema = new mongoose.Schema({
  aliasId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true, ref: 'User' },
  source: { type: String, default: '' }, // e.g., 'liff', 'heuristic'
}, {
  timestamps: true,
});

module.exports = mongoose.model('LineMessagingAlias', lineMessagingAliasSchema);

