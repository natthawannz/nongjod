const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');
const { scanImageFile } = require('../utils/ocrScan');

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `ocr-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|bmp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});


// Calculate Levenshtein distance for WER/CER
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Calculate Word Error Rate (WER)
function calculateWER(reference, hypothesis) {
  const refWords = reference.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const hypWords = hypothesis.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  
  if (refWords.length === 0) return hypothesis.length === 0 ? 0 : 1;
  
  const distance = levenshteinDistance(refWords.join(' '), hypWords.join(' '));
  return Math.min(1, distance / refWords.length);
}

// Calculate Character Error Rate (CER)
function calculateCER(reference, hypothesis) {
  const refChars = reference.replace(/\s+/g, '');
  const hypChars = hypothesis.replace(/\s+/g, '');
  
  if (refChars.length === 0) return hypChars.length === 0 ? 0 : 1;
  
  const distance = levenshteinDistance(refChars, hypChars);
  return Math.min(1, distance / refChars.length);
}

// Main OCR endpoint
router.post('/scan', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const originalPath = req.file.path;
    const { extraction, ocrConfidence, tesseractVersion } = await scanImageFile(originalPath, { cleanupOriginal: true });

    res.json({
      success: true,
      extraction,
      ocrConfidence,
      tesseractVersion
    });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Accuracy test endpoint - compare OCR result with expected values
router.post('/test-accuracy', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const { expectedAmount, expectedBank, expectedRecipient, expectedDate } = req.body;
    
    const originalPath = req.file.path;
    const { extraction, ocrConfidence, tesseractVersion } = await scanImageFile(originalPath, { cleanupOriginal: true });
    const text = extraction?.rawText || '';
    const bankCode = extraction?.bank?.code || null;
    const amount = extraction?.amount ?? null;
    const date = extraction?.date ?? null;
    const recipient = extraction?.recipient ?? null;

    // Calculate accuracy metrics
    const metrics = {
      amount: {
        expected: expectedAmount,
        extracted: amount,
        correct: expectedAmount && amount != null && parseFloat(expectedAmount) === parseFloat(amount)
      },
      bank: {
        expected: expectedBank,
        extracted: bankCode,
        correct: expectedBank && bankCode && expectedBank.toUpperCase() === bankCode
      },
      recipient: {
        expected: expectedRecipient,
        extracted: recipient,
        cer: expectedRecipient && recipient ? calculateCER(expectedRecipient, recipient) : null,
        wer: expectedRecipient && recipient ? calculateWER(expectedRecipient, recipient) : null
      },
      date: {
        expected: expectedDate,
        extracted: date,
        correct: expectedDate && date && expectedDate === date
      }
    };

    // Overall accuracy
    let correctFields = 0;
    let totalFields = 0;
    
    if (expectedAmount) { totalFields++; if (metrics.amount.correct) correctFields++; }
    if (expectedBank) { totalFields++; if (metrics.bank.correct) correctFields++; }
    if (expectedRecipient) { totalFields++; if (metrics.recipient.cer !== null && metrics.recipient.cer < 0.3) correctFields++; }
    if (expectedDate) { totalFields++; if (metrics.date.correct) correctFields++; }

    const overallAccuracy = totalFields > 0 ? (correctFields / totalFields) * 100 : 0;

    res.json({
      success: true,
      metrics,
      overallAccuracy: Math.round(overallAccuracy * 100) / 100,
      ocrConfidence,
      tesseractVersion,
      rawText: text
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
