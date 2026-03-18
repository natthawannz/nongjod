#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { User } = require('../models');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI, {});
  const users = await User.find({ $or: [ { email: null }, { email: { $exists: false } } ] });
  console.log('Found', users.length, 'users with null/missing email');
  for (const u of users) {
    const placeholder = `line_${u.lineUserId || u._id}@local`;
    console.log('Patching user', u._id.toString(), 'lineUserId=', u.lineUserId, '->', placeholder);
    try {
      u.email = placeholder;
      await u.save();
    } catch (err) {
      console.error('Failed to patch user', u._id, err);
    }
  }
  await mongoose.disconnect();
}

main().catch(e=>{ console.error(e); process.exit(1); });
