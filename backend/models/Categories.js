const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  icon: {
    type: String,
    default: '🌐',
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  // เปลี่ยน index เป็น compound index ที่รวม type เพื่อให้ name ซ้ำได้ถ้า type ต่างกัน
  indexes: [{ key: { userId: 1, name: 1, type: 1 }, unique: true }]
});

module.exports = mongoose.model('Category', categorySchema);