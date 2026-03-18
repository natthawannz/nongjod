const express = require('express');
const jwt = require('jsonwebtoken');
const Budget = require('../models/Budget');
const Category = require('../models/Categories');
const mongoose = require('mongoose');
const router = express.Router();

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

// Get total budgets grouped by month for user
router.get('/total', authMiddleware, async (req, res) => {
  try {
    const rawUserId = req?.user?.userId;
    if (!mongoose.isValidObjectId(rawUserId)) {
      return res.status(400).json({ message: 'Invalid user id' });
    }
    const userId = new mongoose.Types.ObjectId(String(rawUserId));
    // Use a defensive aggregation: coerce total (or legacy amount) to double and sum that.
    const agg = await Budget.aggregate([
      { $match: { userId } },
      { $addFields: { budgetValue: { $convert: { input: { $ifNull: ['$total', '$amount'] }, to: 'double', onError: 0, onNull: 0 } } } },
      { $group: { _id: '$month', total: { $sum: '$budgetValue' } } },
      { $project: { _id: 0, month: '$_id', total: 1 } }
    ]);
    console.log('GET /api/budgets/total result for user', req.user.userId, agg);
    res.json(agg);
  } catch (error) {
    console.error('GET /api/budgets/total error:', error);
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
    // Allow budgets for any category owned by the user (expense or income)
    const categoryDoc = await Category.findOne({ _id: category, userId: req.user.userId });
    if (!categoryDoc) {
      return res.status(400).json({ message: 'Invalid category' });
    }

    let budget = await Budget.findOne({ userId: req.user.userId, category, month });
    const parsed = parseFloat(total) || 0;
    if (budget) {
      budget.total = parsed;
      // keep legacy field in sync
      budget.amount = parsed;
      await budget.save();
      console.log('Updated budget for user', req.user.userId, 'category', category, 'month', month, 'total', budget.total);
    } else {
      budget = new Budget({
        userId: req.user.userId,
        category,
        month,
        total: parsed,
        amount: parsed,
      });
      await budget.save();
      console.log('Created budget for user', req.user.userId, 'id', budget._id, 'total', parsed);
    }
    res.status(201).json(budget);
  } catch (error) {
    console.error('POST /api/budgets error:', error);
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

// Debug: return all budgets for authenticated user (temporary)
router.get('/debug', authMiddleware, async (req, res) => {
  try {
    const docs = await Budget.find({ userId: req.user.userId }).populate('category', 'name icon type');
    res.json(docs);
  } catch (err) {
    console.error('GET /api/budgets/debug error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
