const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Dev-only route: verify and decode token sent in Authorization header
router.get('/token', (req, res) => {
  const auth = req.header('Authorization') || '';
  const token = auth.replace('Bearer ', '').trim();
  if (!token) return res.status(400).json({ ok: false, message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ ok: true, decoded });
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'verify failed', error: err.message });
  }
});

// Allow POST with token in body for convenience
router.post('/token', (req, res) => {
  const token = req.body && req.body.token;
  if (!token) return res.status(400).json({ ok: false, message: 'No token in body' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.json({ ok: true, decoded });
  } catch (err) {
    return res.status(401).json({ ok: false, message: 'verify failed', error: err.message });
  }
});

module.exports = router;
