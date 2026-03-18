#!/usr/bin/env node
// load backend/.env explicitly so script works when run from project root
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Transaction } = require('../models');

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: node find_by_line_user.js <LINE_USER_ID>');
    process.exit(2);
  }
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI not set in env');
    process.exit(3);
  }
  await mongoose.connect(process.env.MONGODB_URI, {});
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // last 24h
  const docs = await Transaction.find({
    'rawMessage.source.userId': userId,
    createdAt: { $gte: since }
  }).sort({ createdAt: -1 }).limit(100).lean();
  console.log(JSON.stringify(docs, null, 2));
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('error', err);
  process.exit(1);
});
