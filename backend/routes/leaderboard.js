const express = require('express');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const router = express.Router();

const BANGKOK_TZ = 'Asia/Bangkok';

const toBangkokISODateKey = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: BANGKOK_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const map = {};
    for (const p of parts) {
      if (p && p.type) map[p.type] = p.value;
    }
    if (!map.year || !map.month || !map.day) return '';
    return `${map.year}-${map.month}-${map.day}`;
  } catch {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
};

const shiftBangkokISODateKey = (isoKey, deltaDays) => {
  if (!isoKey) return '';
  const base = new Date(`${isoKey}T00:00:00.000+07:00`);
  if (Number.isNaN(base.getTime())) return '';
  return toBangkokISODateKey(new Date(base.getTime() + deltaDays * 86400000));
};

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error && error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' });
    return res.status(401).json({ message: 'Invalid token' });
  }
};

router.get('/streak', authMiddleware, async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(3, Number(req.query.limit) || 10));
    const windowDays = Math.min(730, Math.max(60, Number(req.query.windowDays) || 400));
    const since = new Date(Date.now() - windowDays * 86400000);

    const perUserDays = await Transaction.aggregate([
      { $match: { datetime: { $gte: since } } },
      {
        $project: {
          userId: 1,
          day: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$datetime',
              timezone: BANGKOK_TZ,
            }
          },
        }
      },
      { $group: { _id: { userId: '$userId', day: '$day' } } },
      { $group: { _id: '$_id.userId', days: { $push: '$_id.day' } } },
    ]);

    const todayKey = toBangkokISODateKey(Date.now());
    const yesterdayKey = shiftBangkokISODateKey(todayKey, -1);

    const rows = perUserDays.map((r) => {
      const days = Array.isArray(r.days) ? r.days : [];
      const set = new Set(days);
      const loggedToday = Boolean(todayKey && set.has(todayKey));
      const streakStartKey = loggedToday
        ? todayKey
        : (yesterdayKey && set.has(yesterdayKey) ? yesterdayKey : '');

      let streakDays = 0;
      if (streakStartKey) {
        let cursor = streakStartKey;
        while (cursor && set.has(cursor)) {
          streakDays += 1;
          cursor = shiftBangkokISODateKey(cursor, -1);
        }
      }

      return {
        userId: r._id,
        streakDays,
        totalLoggedDays: set.size,
      };
    });

    rows.sort((a, b) => {
      if (b.streakDays !== a.streakDays) return b.streakDays - a.streakDays;
      if (b.totalLoggedDays !== a.totalLoggedDays) return b.totalLoggedDays - a.totalLoggedDays;
      return String(a.userId).localeCompare(String(b.userId));
    });

    const top = rows.slice(0, limit);
    const userIds = top.map((r) => r.userId);
    const users = await User.find({ _id: { $in: userIds } }).select('name profilePic');
    const userById = new Map(users.map((u) => [String(u._id), u]));

    const leaderboard = top.map((r) => {
      const u = userById.get(String(r.userId));
      return {
        userId: r.userId,
        name: u?.name || 'ผู้ใช้งาน',
        profilePic: u?.profilePic || '',
        days: r.streakDays,
        streakDays: r.streakDays,
        totalLoggedDays: r.totalLoggedDays,
      };
    });

    res.json({ timezone: BANGKOK_TZ, updatedAt: Date.now(), leaderboard });
  } catch (err) {
    console.error('Leaderboard streak error:', err);
    res.status(500).json({ message: 'Server error: ' + (err?.message || 'Unknown error') });
  }
});

module.exports = router;

