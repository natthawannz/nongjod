const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  name: { type: String, default: '' }, // name เป็น optional
  profilePic: { type: String, default: '' }, // LINE profile picture URL
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  resetPasswordToken: { type: String }, // Token สำหรับรีเซ็ต
  resetPasswordExpires: { type: Date }, // วันหมดอายุของ token
});

module.exports = mongoose.model('User', userSchema);