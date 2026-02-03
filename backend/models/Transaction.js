const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, // เปลี่ยนเป็น ObjectId
  date: { type: Date, required: true },
  notes: { type: String, default: '' },
}, {
  timestamps: true,
  indexes: [{ key: { userId: 1, date: -1 } }]
});

module.exports = mongoose.model('Transaction', transactionSchema);