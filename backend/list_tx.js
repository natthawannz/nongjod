require('dotenv').config();
const mongoose = require('mongoose');
(async()=>{
  try{
    await mongoose.connect(process.env.MONGODB_URI, {serverSelectionTimeoutMS:10000});
    const {Transaction} = require('./models');
    const count = await Transaction.countDocuments();
    console.log('Total transactions:', count);
    const docs = await Transaction.find().sort({createdAt:-1}).limit(10).lean();
    console.log(JSON.stringify(docs, null, 2));
  }catch(e){ console.error('err', e.message); }
  finally{ await mongoose.disconnect(); }
})();
