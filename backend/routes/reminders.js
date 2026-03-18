const express = require('express');
const jwt = require('jsonwebtoken');
const { ReminderSetting, User } = require('../models');

const router = express.Router();

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const BANGKOK_TZ = 'Asia/Bangkok';

const toBangkokDateKey = (dateInput) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  try {
    // en-CA yields YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: BANGKOK_TZ }).format(d);
  } catch {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
};

const toBangkokHHMM = (dateInput) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: BANGKOK_TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const map = {};
    parts.forEach((p) => { if (p?.type) map[p.type] = p.value; });
    const hh = map.hour;
    const mm = map.minute;
    if (!hh || !mm) return '';
    return `${hh}:${mm}`;
  } catch {
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
};

const timeToMinutes = (hhmm) => {
  const s = String(hhmm || '').trim();
  if (!TIME_RE.test(s)) return NaN;
  const [h, m] = s.split(':').map((x) => Number(x));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN;
  return h * 60 + m;
};

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.exp) return res.status(401).json({ message: 'Token expired' });
    req.user = decoded;
    next();
  } catch (error) {
    if (error && error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' });
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const [setting, user] = await Promise.all([
      ReminderSetting.findOne({ userId }).lean(),
      User.findById(userId).select({ lineMessagingUserId: 1 }).lean(),
    ]);
    const enabled = Boolean(setting?.enabled);
    const time = String(setting?.timeHHMM || '08:00');
    const canPush = Boolean(String(user?.lineMessagingUserId || '').trim());
    res.json({ enabled, time, canPush });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + (err?.message || 'Unknown error') });
  }
});

router.put('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const enabled = Boolean(req.body?.enabled);
    const time = String(req.body?.time || '').trim() || '08:00';
    if (!TIME_RE.test(time)) return res.status(400).json({ message: 'Invalid time. Expected HH:MM' });

    const prev = await ReminderSetting.findOne({ userId }).lean();

    // If user changes reminder time, allow it to trigger at the new time "today" (Bangkok)
    // when the previously-sent reminder happened earlier than the new time.
    // This prevents the common confusion where users change the time and it never fires because
    // `lastSentDate` is already set for today from an earlier schedule.
    let shouldClearLastSent = false;
    if (prev) {
      const prevTime = String(prev?.timeHHMM || '').trim();
      const prevEnabled = Boolean(prev?.enabled);

      const timeChanged = prevTime && prevTime !== time;
      const enabledTurnedOn = !prevEnabled && enabled;

      if (timeChanged || enabledTurnedOn) {
        const todayKey = toBangkokDateKey(Date.now());
        const nowHHMM = toBangkokHHMM(Date.now());

        if (todayKey && String(prev?.lastSentDate || '') === todayKey) {
          const newMin = timeToMinutes(time);
          const nowMin = timeToMinutes(nowHHMM);
          const lastHHMM = prev?.lastSentAt ? toBangkokHHMM(prev.lastSentAt) : '';
          const lastMin = timeToMinutes(lastHHMM);

          // Only clear if the new scheduled time is still ahead (or equal) today,
          // and the last send happened before the new scheduled time (or we can't tell).
          const newTimeUpcoming = Number.isFinite(newMin) && Number.isFinite(nowMin) ? nowMin <= newMin : false;
          const lastWasBeforeNew = Number.isFinite(lastMin) && Number.isFinite(newMin) ? lastMin < newMin : true;

          if (newTimeUpcoming && lastWasBeforeNew) shouldClearLastSent = true;
        } else if (!prev?.lastSentDate) {
          // No lastSentDate: nothing to clear.
        } else {
          // lastSentDate is not today: no need to clear; scheduler will run normally.
        }
      }
    }

    const update = {
      $set: { enabled, timeHHMM: time },
    };
    if (shouldClearLastSent) {
      update.$set.lastSentDate = '';
      update.$set.lastSentAt = null;
    }

    const setting = await ReminderSetting.findOneAndUpdate(
      { userId },
      update,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    const user = await User.findById(userId).select({ lineMessagingUserId: 1 }).lean();
    const canPush = Boolean(String(user?.lineMessagingUserId || '').trim());

    res.json({
      ok: true,
      enabled: Boolean(setting?.enabled),
      time: String(setting?.timeHHMM || time),
      canPush,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error: ' + (err?.message || 'Unknown error') });
  }
});

module.exports = router;
