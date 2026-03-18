require('dotenv').config();
const mongoose = require('mongoose');
(async()=>{
  try{
    await mongoose.connect(process.env.MONGODB_URI, {serverSelectionTimeoutMS:10000});
    const User = require('../models/User');
    const users = await User.find().lean();
    console.log('Total users:', users.length);
    console.log('Users:');
    users.forEach(u => {
      console.log({
        _id: u._id.toString(),
        email: u.email || '(no email)',
        name: u.name || '(no name)',
        lineUserId: u.lineUserId || '(no lineUserId)',
        createdAt: u.createdAt
      });
    });
  }catch(e){ console.error('err', e.message); }
  finally{ await mongoose.disconnect(); }
})();
