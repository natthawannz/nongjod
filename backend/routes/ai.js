const express = require('express');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { parseSlipImageBuffer } = require('../utils/openaiSlip');

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token provided' });
//
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

const requireOpenAiKey = (req, res) => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      success: false,
      error: 'OPENAI_API_KEY is not set on the server',
    });
    return null;
  }
  return apiKey;
};

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = /^image\//.test(file.mimetype || '');
    if (!ok) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

const uploadAudio = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'audio/webm',
      'audio/wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/x-m4a',
      'audio/aac',
      'audio/ogg',
      'video/webm', // some browsers label audio-only recordings as video/webm
    ];
    if (!allowed.includes(file.mimetype)) return cb(new Error(`Unsupported audio type: ${file.mimetype}`));
    cb(null, true);
  },
});

router.post('/slip', authMiddleware, uploadImage.single('image'), async (req, res) => {
  const apiKey = requireOpenAiKey(req, res);
  if (!apiKey) return;

  if (!req.file?.buffer) {
    return res.status(400).json({ success: false, error: 'No image file provided (field name: image)' });
  }

  try {
    const parsed = await parseSlipImageBuffer({
      buffer: req.file.buffer,
      mimeType: req.file.mimetype || 'image/jpeg',
    });
    return res.json({ success: true, parsed });
  } catch (error) {
    console.error('AI slip error:', error);
    return res.status(500).json({ success: false, error: error.message || 'AI slip error' });
  }
});

router.post('/transcribe', authMiddleware, uploadAudio.single('audio'), async (req, res) => {
  const apiKey = requireOpenAiKey(req, res);
  if (!apiKey) return;

  if (!req.file?.buffer) {
    return res.status(400).json({ success: false, error: 'No audio file provided (field name: audio)' });
  }

  try {
    const model = process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1';
    const language = process.env.OPENAI_TRANSCRIBE_LANG || 'th';

    const form = new FormData();
    form.append('model', model);
    if (language) form.append('language', language);
    form.append(
      'file',
      new Blob([req.file.buffer], { type: req.file.mimetype || 'audio/webm' }),
      req.file.originalname || 'recording.webm'
    );

    const resp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: form,
    });

    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return res.status(resp.status).json({
        success: false,
        error: data?.error?.message || 'OpenAI transcription failed',
        details: data,
      });
    }

    // whisper-1 returns: { text: "..." }
    return res.json({ success: true, text: data?.text || '' });
  } catch (error) {
    console.error('AI transcribe error:', error);
    return res.status(500).json({ success: false, error: error.message || 'AI transcribe error' });
  }
});

module.exports = router;
