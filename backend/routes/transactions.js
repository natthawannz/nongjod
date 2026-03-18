const express = require('express');
const jwt = require('jsonwebtoken');
const Transaction = require('../models/Transaction');
const Category = require('../models/Categories'); // เพิ่มการ import
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

async function ensureOtherCategoryId({ userId, type } = {}) {
  const safeType = type === 'income' ? 'income' : 'expense';
  const name = 'อื่นๆ';

  const existing = await Category.findOne({ userId, type: safeType, name }).select({ _id: 1 }).lean();
  if (existing?._id) return existing._id;

  try {
    const created = await Category.create({ userId, type: safeType, name, icon: 'other', isDefault: false });
    return created?._id || null;
  } catch (e) {
    // Unique index race
    const retry = await Category.findOne({ userId, type: safeType, name }).select({ _id: 1 }).lean();
    return retry?._id || null;
  }
}

router.post('/', authMiddleware, async (req, res) => {
  const { amount, type, category, date, notes } = req.body;
  console.log('Received data:', { amount, type, category, date, notes });
  try {
    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Type must be either income or expense' });
    }

    let categoryId;
    const categoryText = String(category || '').trim();
    if (!categoryText) {
      categoryId = await ensureOtherCategoryId({ userId: req.user.userId, type });
    } else if (mongoose.Types.ObjectId.isValid(categoryText)) {
      const found = await Category.findOne({ _id: new mongoose.Types.ObjectId(categoryText), userId: req.user.userId })
        .select({ _id: 1 })
        .lean();
      categoryId = found?._id || (await ensureOtherCategoryId({ userId: req.user.userId, type }));
    } else {
      const foundCategory = await Category.findOne({ name: categoryText, userId: req.user.userId, type }).select({ _id: 1 }).lean();
      categoryId = foundCategory?._id || (await ensureOtherCategoryId({ userId: req.user.userId, type }));
    }
    if (!categoryId) return res.status(500).json({ message: 'Cannot resolve category' });

    let transactionDate;
    if (date.includes('T')) {
      transactionDate = new Date(date);
    } else {
      transactionDate = new Date(`${date}T00:00:00.000+07:00`);
    }

    if (isNaN(transactionDate.getTime())) {
      return res.status(400).json({ message: `Invalid date format: ${date}` });
    }

    const transaction = new Transaction({
      userId: req.user.userId,
      amount: parseFloat(amount),
      type,
      categoryId: categoryId,
      datetime: transactionDate,
      note: notes || '',
    });
    await transaction.save();
    const saved = await Transaction.findById(transaction._id).populate('categoryId', 'name icon');
    const sObj = saved.toObject();
    res.status(201).json({ ...sObj, category: sObj.categoryId || null, date: sObj.datetime, notes: sObj.note || '' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.userId })
      .populate('categoryId', 'name icon');
    const mapped = transactions.map(t => {
      const obj = t.toObject();
      return { ...obj, category: obj.categoryId || null, date: obj.datetime, notes: obj.note || '' };
    });
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Update transaction
router.put('/:id', authMiddleware, async (req, res) => {
  const { amount, type, category, date, notes } = req.body;
  try {
    const transaction = await Transaction.findOne({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (amount !== undefined) {
      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: 'Amount must be a positive number' });
      }
      transaction.amount = parseFloat(amount);
    }

    if (type !== undefined) {
      if (!['income', 'expense'].includes(type)) {
        return res.status(400).json({ message: 'Type must be either income or expense' });
      }
      transaction.type = type;
    }

    if (category !== undefined) {
      let categoryId;
      const categoryText = String(category || '').trim();
      if (!categoryText) {
        categoryId = await ensureOtherCategoryId({ userId: req.user.userId, type: transaction.type });
      } else if (mongoose.Types.ObjectId.isValid(categoryText)) {
        const found = await Category.findOne({ _id: new mongoose.Types.ObjectId(categoryText), userId: req.user.userId })
          .select({ _id: 1 })
          .lean();
        categoryId = found?._id || (await ensureOtherCategoryId({ userId: req.user.userId, type: transaction.type }));
      } else {
        const foundCategory = await Category.findOne({ name: categoryText, userId: req.user.userId, type: transaction.type })
          .select({ _id: 1 })
          .lean();
        categoryId = foundCategory?._id || (await ensureOtherCategoryId({ userId: req.user.userId, type: transaction.type }));
      }
      transaction.categoryId = categoryId;
    }

    if (date !== undefined) {
      let transactionDate;
      if (date.includes('T')) {
        transactionDate = new Date(date);
      } else {
        transactionDate = new Date(`${date}T00:00:00.000+07:00`);
      }
      if (isNaN(transactionDate.getTime())) {
        return res.status(400).json({ message: `Invalid date format: ${date}` });
      }
      transaction.datetime = transactionDate;
    }

    if (notes !== undefined) {
      transaction.note = notes;
    }

    await transaction.save();
    const updatedTransaction = await Transaction.findById(transaction._id).populate('categoryId', 'name icon');
    const uobj = updatedTransaction.toObject();
    res.json({ ...uobj, category: uobj.categoryId || null, date: uobj.datetime, notes: uobj.note || '' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Delete ALL transactions for authenticated user
router.delete('/all', authMiddleware, async (req, res) => {
  try {
    const result = await Transaction.deleteMany({ userId: req.user.userId });
    res.json({ message: 'Deleted all transactions', deletedCount: result?.deletedCount || 0 });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

// Delete transaction
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({ 
      _id: req.params.id, 
      userId: req.user.userId 
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Server error: ' + error.message });
  }
});

module.exports = router;
