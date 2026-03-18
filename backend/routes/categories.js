const express = require('express');
const jwt = require('jsonwebtoken');
const Category = require('../models/Categories');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const router = express.Router();

const normalizeCategoryName = (name) => String(name || '').trim().replace(/\s+/g, '');
const isReservedOtherCategoryName = (name) => {
  const n = normalizeCategoryName(name);
  if (!n) return false;
  if (n === 'อื่นๆ') return true;
  if (n.toLowerCase() === 'other') return true;
  return false;
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
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get categories for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;

    const ensureOtherCategory = async (type) => {
      const safeType = type === 'income' ? 'income' : 'expense';
      const existing = await Category.findOne({ userId, type: safeType, name: 'อื่นๆ' });
      if (existing) return existing;
      const doc = new Category({ userId, type: safeType, name: 'อื่นๆ', icon: 'other' });
      try {
        await doc.save();
        return doc;
      } catch (e) {
        if (e && e.code === 11000) {
          return await Category.findOne({ userId, type: safeType, name: 'อื่นๆ' });
        }
        throw e;
      }
    };

    await Promise.all([ensureOtherCategory('expense'), ensureOtherCategory('income')]);

    const categories = await Category.find({ userId });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Add category
router.post('/', authMiddleware, async (req, res) => {
  const { name, icon, type } = req.body;
  if (!type || !['income', 'expense'].includes(type)) {
    return res.status(400).json({ message: 'ประเภทต้องเป็น "income" หรือ "expense"' });
  }
  try {
    const existingCategory = await Category.findOne({ name, userId: req.user.userId, type });
    if (existingCategory) {
      return res.status(400).json({ message: 'หมวดหมู่นี้มีอยู่แล้วในประเภทนี้' });
    }
    const category = new Category({
      name,
      icon: icon || '🌐',
      type,
      userId: req.user.userId,
    });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update category (name/icon)
router.put('/:categoryId', authMiddleware, async (req, res) => {
  const { categoryId } = req.params;
  const rawName = req.body?.name;
  const rawIcon = req.body?.icon;

  const name = typeof rawName === 'string' ? rawName.trim() : '';
  const icon = typeof rawIcon === 'string' ? rawIcon.trim() : '';

  if (!name) {
    return res.status(400).json({ message: 'กรุณาระบุชื่อหมวดหมู่' });
  }

  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่ในระบบ' });
    }

    if (category.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์แก้ไขหมวดหมู่นี้' });
    }

    const sameType = category.type;
    const existingCategory = await Category.findOne({
      _id: { $ne: category._id },
      userId: req.user.userId,
      type: sameType,
      name,
    });
    if (existingCategory) {
      return res.status(400).json({ message: 'หมวดหมู่นี้มีอยู่แล้วในประเภทนี้' });
    }

    category.name = name;
    if (icon) category.icon = icon;
    await category.save();
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Delete category
router.delete('/:categoryId', authMiddleware, async (req, res) => {
  const { categoryId } = req.params;
  try {
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'ไม่พบหมวดหมู่ในระบบ' });
    }

    if (category.userId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ลบหมวดหมู่นี้' });
    }

    if (isReservedOtherCategoryName(category?.name)) {
      return res.status(400).json({ message: 'ไม่สามารถลบหมวด “อื่นๆ” ได้' });
    }

    // Detach related data instead of forcing a fallback category.
    // Transactions will show as "ไม่ระบุหมวด" on the UI and can be recategorized later.
    await Transaction.updateMany(
      { categoryId: category._id, userId: req.user.userId },
      { $set: { categoryId: null } }
    );

    // Remove budgets tied to this category to avoid orphan budgets.
    await Budget.deleteMany({
      userId: req.user.userId,
      $or: [
        { category: category._id },
        { categoryId: category._id },
      ],
    }).catch(() => {});

    await Category.deleteOne({ _id: categoryId });

    res.json({ message: 'ลบหมวดหมู่เรียบร้อย', deletedId: categoryId, reassignedTo: null });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
