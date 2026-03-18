#!/usr/bin/env node
// Move transactions between users (simple helper).
//
// Prefer `backend/scripts/merge_users.js` if you need to move categories/budgets too.
//
// Usage:
//   node backend/scripts/merge_transactions.js <fromUserId> <toUserId>
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { Transaction } = require('../models');

function usage(code = 2) {
  console.error('Usage: node backend/scripts/merge_transactions.js <fromUserId> <toUserId>');
  process.exit(code);
}

async function main() {
  const fromUserId = process.argv[2];
  const toUserId = process.argv[3];
  if (!fromUserId || !toUserId) usage();

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in env');
    process.exit(3);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    const result = await Transaction.updateMany(
      { userId: fromUserId },
      { $set: { userId: toUserId } }
    );
    console.log(`Moved ${Number(result?.modifiedCount ?? 0) || 0} transactions from ${fromUserId} to ${toUserId}`);
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Error:', e?.message || e);
    process.exit(1);
  });
}
