#!/usr/bin/env node
/**
 * Merge one user into another (move ownership of data so it shows on the web).
 *
 * Usage:
 *   node backend/scripts/merge_users.js <fromUserId> <toUserId> [--delete-source]
 *
 * Example:
 *   node backend/scripts/merge_users.js 69a42bb3294b1da36f64ac58 69a42c406fc79c74ac82ed8a --delete-source
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const { User } = require('../models');
const { mergeUsers: mergeUsersUtil } = require('../utils/mergeUsers');

function usage(code = 2) {
  console.error('Usage: node backend/scripts/merge_users.js <fromUserId> <toUserId> [--delete-source]');
  process.exit(code);
}

function isValidObjectId(v) {
  return mongoose.Types.ObjectId.isValid(String(v || ''));
}

async function runMerge({ fromUserId, toUserId, deleteSource }) {
  const mergeResult = await mergeUsersUtil({ fromUserId, toUserId, deleteSource });
  const to = await User.findById(toUserId).lean();
  return {
    ...mergeResult,
    lineMessagingUserId: String(to?.lineMessagingUserId || ''),
    lineUserId: String(to?.lineUserId || ''),
    deletedSource: Boolean(deleteSource),
  };
}

async function main() {
  const fromUserId = process.argv[2];
  const toUserId = process.argv[3];
  const deleteSource = process.argv.includes('--delete-source');
  if (!fromUserId || !toUserId) usage();

  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in env');
    process.exit(3);
  }

  if (!isValidObjectId(fromUserId) || !isValidObjectId(toUserId)) {
    console.error('Invalid ObjectId(s)');
    usage();
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  try {
    const result = await runMerge({ fromUserId, toUserId, deleteSource });
    console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('merge_users error:', err?.message || err);
    process.exit(1);
  });
}
