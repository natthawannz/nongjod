const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Category = require('../models/Categories');
const NotificationCount = require('../models/NotificationCount');

const BANGKOK_TZ = 'Asia/Bangkok';
const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const getBangkokYearMonthIndex = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: BANGKOK_TZ,
      year: 'numeric',
      month: '2-digit',
    }).formatToParts(d);
    const map = {};
    for (const p of parts) {
      if (p?.type) map[p.type] = p.value;
    }
    const year = Number(map.year);
    const month = Number(map.month);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    return { year, monthIndex: month - 1 };
  } catch {
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  }
};

const toThaiMonthLabel = (dateInput) => {
  const p = getBangkokYearMonthIndex(dateInput);
  if (!p) return '';
  const monthName = MONTH_NAMES_TH[p.monthIndex] || '';
  const buddhistYear = p.year + 543;
  if (!monthName || !Number.isFinite(buddhistYear)) return '';
  return `${monthName} ${buddhistYear}`;
};

// Middleware to verify JWT
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
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ฟังก์ชันตรวจสอบงบประมาณที่เกินหรือใกล้เกิน และอัปเดตจำนวนแจ้งเตือน
const checkBudgetExceeded = async (userId, month) => {
  try {
    const budgets = await Budget.find({ userId, month });
    const transactions = await Transaction.find({ userId, type: 'expense' });

    const alerts = [];
    const targetMonthYear = month; // เช่น "กันยายน 2568"

    for (const budget of budgets) {
      const totalSpent = transactions
        .filter(t => {
          const tMonthYear = toThaiMonthLabel(t.datetime);
          return tMonthYear === targetMonthYear && String(t.categoryId) === String(budget.category);
        })
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const budgetTotal = budget.total;
      const percentage = budgetTotal > 0 ? (totalSpent / budgetTotal) * 100 : 0;

      if (percentage >= 80) {
        const category = await Category.findById(budget.category).select('name');
        let alertMessage = `${targetMonthYear}: หมวด ${category ? category.name : 'Unknown'} `;
        
        if (percentage >= 100) {
          alertMessage += `เกินงบ ${(totalSpent - budgetTotal).toFixed(2)} บาท (${percentage.toFixed(2)}%)`;
        } else if (percentage >= 90) {
          alertMessage += `เหลือ ${(budgetTotal - totalSpent).toFixed(2)} บาท (90% ถึง 100%)`;
        } else if (percentage >= 80) {
          alertMessage += `เหลือ ${(budgetTotal - totalSpent).toFixed(2)} บาท (80% ถึง 90%)`;
        }

        alerts.push({
          month: targetMonthYear,
          categoryName: category ? category.name : 'Unknown',
          amountSpent: totalSpent.toFixed(2),
          budgetTotal: budgetTotal.toFixed(2),
          percentage: percentage.toFixed(2),
          alertMessage
        });
      }
    }

    // อัปเดตจำนวนแจ้งเตือนใน NotificationCount
    let notificationCountDoc = await NotificationCount.findOne({ userId });
    if (!notificationCountDoc) {
      notificationCountDoc = new NotificationCount({ userId, count: 0 });
    }
    notificationCountDoc.count = alerts.length;
    await notificationCountDoc.save();

    return alerts;
  } catch (error) {
    console.error('Error checking budget:', error);
    return [];
  }
};

// Endpoint สำหรับดึงรายการแจ้งเตือน และรีเซ็ตจำนวนที่ยังไม่ได้อ่าน
router.post('/notifications', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  const currentMonth = toThaiMonthLabel(Date.now());
  const alerts = await checkBudgetExceeded(userId, currentMonth);

  // รีเซ็ตจำนวนแจ้งเตือนที่ยังไม่ได้อ่านเมื่อผู้ใช้ดูรายการ
  await NotificationCount.findOneAndUpdate({ userId }, { count: 0 }, { upsert: true });

  res.json({ notifications: alerts });
});

// Endpoint สำหรับตรวจสอบและนับจำนวนแจ้งเตือน
router.post('/check-budget', authMiddleware, async (req, res) => {
  const { userId } = req.user;
  const { month } = req.body || {};
  const checkMonth = month || toThaiMonthLabel(Date.now());
  const alerts = await checkBudgetExceeded(userId, checkMonth);

  // ดึงจำนวนแจ้งเตือนจาก NotificationCount
  const notificationCountDoc = await NotificationCount.findOne({ userId }) || { count: 0 };
  res.json({ alertCount: notificationCountDoc.count, alerts });
});

module.exports = router;
