const express = require('express');
const jwt = require('jsonwebtoken');
const Budget = require('../models/Budget');
const Category = require('../models/Categories');
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

// Get budgets for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const budgets = await Budget.find({ userId: req.user.userId })
      .populate('category', 'name icon type');
    res.json(budgets);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Add or update budget
router.post('/', authMiddleware, async (req, res) => {
  const { category, month, total } = req.body;
  if (!category || !month || total === undefined) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  if (isNaN(parseFloat(total)) || parseFloat(total) < 0) {
    return res.status(400).json({ message: 'Total must be a non-negative number' });
  }

  try {
    const categoryDoc = await Category.findOne({ _id: category, userId: req.user.userId, type: 'expense' });
    if (!categoryDoc) {
      return res.status(400).json({ message: 'Invalid category or not an expense category' });
    }

    let budget = await Budget.findOne({ userId: req.user.userId, category, month });
    if (budget) {
      budget.total = parseFloat(total);
      await budget.save();
    } else {
      budget = new Budget({
        userId: req.user.userId,
        category,
        month,
        total: parseFloat(total),
      });
      await budget.save();
    }
    res.status(201).json(budget);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Delete budget
router.delete('/:category/:month', authMiddleware, async (req, res) => {
  const { category, month } = req.params;
  try {
    const budget = await Budget.findOneAndDelete({ userId: req.user.userId, category, month });
    if (!budget) {
      return res.status(404).json({ message: 'Budget not found' });
    }
    res.status(200).json({ message: 'Budget deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;