#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const { User } = require('../models');
(async function(){
  await mongoose.connect(process.env.MONGODB_URI, {});
  const users = await User.find({ $or: [ { email: null }, { email: { $exists: false } } ] }).lean();
  console.log('null/email-missing users count:', users.length);
  console.log(JSON.stringify(users.map(u=>({ _id: u._id, lineUserId: u.lineUserId, email: u.email })), null, 2));
  await mongoose.disconnect();
})().catch(e=>{ console.error(e); process.exit(1); });
