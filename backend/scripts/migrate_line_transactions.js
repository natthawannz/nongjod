#!/usr/bin/env node
// Migrate LINE-bot-created transactions (matched by rawMessage.source.userId) to a target userId.
//
// Usage:
//   node backend/scripts/migrate_line_transactions.js <LINE_USER_ID> <TARGET_USER_ID>
//
// Example:
//   node backend/scripts/migrate_line_transactions.js U491b7... 69a4198efd1790d5f00c43cc

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Transaction, User } = require('../models');

async function main() {
  const lineUserId = String(process.argv[2] || '').trim();
  const targetUserId = String(process.argv[3] || '').trim();

  if (!lineUserId || !targetUserId) {
    console.error('Usage: node backend/scripts/migrate_line_transactions.js <LINE_USER_ID> <TARGET_USER_ID>');
    process.exit(2);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set');
    process.exit(3);
  }
  if (!mongoose.isValidObjectId(targetUserId)) {
    console.error('TARGET_USER_ID is not a valid ObjectId:', targetUserId);
    process.exit(4);
  }

  await mongoose.connect(process.env.MONGODB_URI, {});

  const targetUser = await User.findById(targetUserId).lean();
  if (!targetUser) {
    console.error('Target user not found:', targetUserId);
    process.exit(5);
  }

  const filter = { 'rawMessage.source.userId': lineUserId };
  const total = await Transaction.countDocuments(filter);

  const res = await Transaction.updateMany(filter, {
    $set: { userId: new mongoose.Types.ObjectId(targetUserId) }
  });

  console.log(JSON.stringify({
    lineUserId,
    targetUserId,
    matched: total,
    modified: res.modifiedCount ?? res.nModified ?? null,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('error', err);
  process.exit(1);
});

