const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  month: { type: String, required: true }, // รูปแบบ: "กันยายน 2568"
  total: { type: Number, required: true, default: 0 },
}, {
  timestamps: true,
  indexes: [{ key: { userId: 1, month: 1, category: 1 }, unique: true }]
});

module.exports = mongoose.model('Budget', budgetSchema);