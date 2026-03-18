#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { Transaction } = require('../models');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {});
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const docs = await Transaction.find({
    createdAt: { $gte: since },
    amount: 120,
    $or: [ { notes: /ข้าว/i }, { note: /ข้าว/i }, { 'rawMessage.message.text': /ข้าว/i } ]
  }).sort({ createdAt: -1 }).limit(100).lean();
  console.log(JSON.stringify(docs, null, 2));
  await mongoose.disconnect();
}

main().catch(err => { console.error(err); process.exit(1); });
