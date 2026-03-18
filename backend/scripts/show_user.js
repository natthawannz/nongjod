require('dotenv').config();
const mongoose = require('mongoose');
(async()=>{
  try{
    await mongoose.connect(process.env.MONGODB_URI, {serverSelectionTimeoutMS:10000});
    const User = require('../models/User');
    const id = process.argv[2] || '697dd848627df78b5f14d7ca';
    const u = await User.findOne({_id: id}).lean();
    console.log(JSON.stringify(u, null, 2));
  }catch(e){ console.error('err', e.message); }
  finally{ await mongoose.disconnect(); }
})();
