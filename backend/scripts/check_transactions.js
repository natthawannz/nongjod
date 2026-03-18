require('dotenv').config();
const mongoose = require('mongoose');

async function main(){
  try{
    await mongoose.connect(process.env.MONGODB_URI, {serverSelectionTimeoutMS:10000});
    const {Transaction} = require('../models');
    const q = {$or:[{amount:130},{notes:/ข้าวหมูแดง/i},{rawMessage:/ข้าวหมูแดง/i},{note:/ข้าวหมูแดง/i}]};
    const docs = await Transaction.find(q).sort({createdAt:-1}).limit(20).lean();
    console.log(JSON.stringify(docs,null,2));
  }catch(err){
    console.error('DB error:', err && err.message ? err.message : err);
  }finally{
    await mongoose.disconnect().catch(()=>{});
  }
}

main();
