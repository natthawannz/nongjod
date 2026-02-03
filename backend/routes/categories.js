const express = require('express');
const jwt = require('jsonwebtoken');
const Category = require('../models/Categories');
const Transaction = require('../models/Transaction');
const router = express.Router();

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Get categories for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const defaultCategories = [
      { name: 'เงินเดือน', icon: '💰', type: 'income' },
      { name: 'ยอดขาย', icon: '📈', type: 'income' },
      { name: 'โบนัส', icon: '🎁', type: 'income' },
      { name: 'เงินดอกเบี้ย', icon: '🏦', type: 'income' },
      { name: 'ของขวัญ', icon: '🎁', type: 'income' },
      { name: 'เงินฝาก', icon: '🏦', type: 'income' },
      { name: 'อาหาร', icon: '🍽️', type: 'expense' },
      { name: 'ขนม', icon: '🍩', type: 'expense' },
      { name: 'ของใช้จำเป็น', icon: '🧴', type: 'expense' },
      { name: 'ค่าเดินทาง', icon: '🚗', type: 'expense' },
      { name: 'ที่อยู่อาศัย', icon: '🏠', type: 'expense' },
      { name: 'บันเทิง', icon: '🎬', type: 'expense' },
      { name: 'ช้อปปิ้ง', icon: '🛒', type: 'expense' },
      { name: 'สุขภาพ', icon: '🏥', type: 'expense' },
      { name: 'การศึกษา', icon: '📚', type: 'expense' },
    ];

    const existingCategories = await Category.find({ userId: req.user.userId });
    if (existingCategories.length === 0) {
      for (const cat of defaultCategories) {
        await Category.findOneAndUpdate(
          { name: cat.name, userId: req.user.userId, type: cat.type },
          { name: cat.name, icon: cat.icon, type: cat.type, userId: req.user.userId },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }
    }

    const categories = await Category.find({ userId: req.user.userId });
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

    await Category.deleteOne({ _id: categoryId });

    let otherCategory = await Category.findOne({ name: 'อื่นๆ', type: category.type, userId: req.user.userId });
    if (!otherCategory) {
      otherCategory = new Category({
        name: 'อื่นๆ',
        icon: '🌐',
        type: category.type,
        userId: req.user.userId,
      });
      await otherCategory.save();
    }

    const relatedTransactions = await Transaction.find({ category: category._id, userId: req.user.userId });
    if (relatedTransactions.length > 0) {
      await Transaction.updateMany(
        { category: category._id, userId: req.user.userId },
        { category: otherCategory._id }
      );
    }

    res.json({ message: 'ลบหมวดหมู่เรียบร้อย' });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;