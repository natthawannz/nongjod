const mongoose = require('mongoose');

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

const reminderSettingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  enabled: { type: Boolean, default: false },
  timeHHMM: { type: String, default: '08:00' },
  timeZone: { type: String, default: 'Asia/Bangkok' },
  lastSentDate: { type: String, default: '' }, // YYYY-MM-DD in timeZone
  lastSentAt: { type: Date },
}, { timestamps: true });

reminderSettingSchema.pre('validate', function validateTime(next) {
  const raw = String(this.timeHHMM || '').trim();
  this.timeHHMM = raw || '08:00';
  if (!TIME_RE.test(this.timeHHMM)) {
    return next(new Error('Invalid timeHHMM. Expected HH:MM (00:00-23:59)'));
  }
  return next();
});

module.exports = mongoose.model('ReminderSetting', reminderSettingSchema);

