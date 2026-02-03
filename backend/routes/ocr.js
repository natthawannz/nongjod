const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

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

// Thai bank patterns for detection
const BANK_PATTERNS = {
  'KBANK': { names: ['กสิกร', 'kbank', 'kasikorn', 'kasikornbank'], fullName: 'ธนาคารกสิกรไทย', color: '#138f2d' },
  'SCB': { names: ['ไทยพาณิชย์', 'scb', 'siam commercial', 'scbeasy'], fullName: 'ธนาคารไทยพาณิชย์', color: '#4e2a84' },
  'BBL': { names: ['กรุงเทพ', 'bbl', 'bangkok bank'], fullName: 'ธนาคารกรุงเทพ', color: '#1e3a8a' },
  'KTB': { names: ['กรุงไทย', 'ktb', 'krungthai'], fullName: 'ธนาคารกรุงไทย', color: '#00a4e4' },
  'BAY': { names: ['กรุงศรี', 'krungsri', 'bay', 'ayudhya'], fullName: 'ธนาคารกรุงศรีอยุธยา', color: '#ffc600' },
  'TTB': { names: ['ttb', 'ทหารไทยธนชาต', 'tmbthanachart'], fullName: 'ธนาคารทหารไทยธนชาต', color: '#0066b3' },
  'GSB': { names: ['ออมสิน', 'gsb', 'government savings'], fullName: 'ธนาคารออมสิน', color: '#e91e63' },
  'BAAC': { names: ['ธกส', 'baac', 'เกษตร'], fullName: 'ธ.ก.ส.', color: '#4caf50' },
  'GHB': { names: ['อาคารสงเคราะห์', 'ghb', 'ธอส'], fullName: 'ธนาคารอาคารสงเคราะห์', color: '#ff9800' },
  'PROMPTPAY': { names: ['พร้อมเพย์', 'promptpay'], fullName: 'พร้อมเพย์', color: '#0052cc' }
};

// Preprocess image for better OCR
async function preprocessImage(inputPath, outputPath) {
  try {
    await sharp(inputPath)
      .resize(2000, null, { withoutEnlargement: false, fit: 'inside' })
      .grayscale()
      .normalize()
      .sharpen()
      .threshold(180) // Binarization for better text recognition
      .toFile(outputPath);
    return outputPath;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return inputPath;
  }
}

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

// Detect bank from text
function detectBank(text) {
  const lowerText = text.toLowerCase();
  for (const [code, bank] of Object.entries(BANK_PATTERNS)) {
    for (const name of bank.names) {
      if (lowerText.includes(name.toLowerCase())) {
        return { code, ...bank };
      }
    }
  }
  return null;
}

// Extract amount from text with improved accuracy
function extractAmount(text, lines) {
  const amountKeywords = ['จำนวนเงิน', 'จำนวน', 'amount', 'total', 'ยอดเงิน', 'ยอดโอน', 'โอนเงิน'];
  const excludeKeywords = ['ค่าธรรมเนียม', 'fee', 'ธรรมเนียม', 'รหัส', 'อ้างอิง', 'reference', 'balance', 'คงเหลือ'];
  
  let foundAmount = null;
  let confidence = 0;

  // Method 1: Look for amount keywords
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    const hasAmountKeyword = amountKeywords.some(k => lowerLine.includes(k));
    const hasExcludeKeyword = excludeKeywords.some(k => lowerLine.includes(k));
    
    if (hasAmountKeyword && !hasExcludeKeyword) {
      // Check same line
      const amountMatch = line.match(/(\d{1,7}(?:[,\s]\d{3})*(?:\.\d{2})?)/);
      if (amountMatch) {
        const amount = amountMatch[1].replace(/[,\s]/g, '');
        const numAmount = parseFloat(amount);
        if (numAmount > 0 && numAmount <= 10000000) {
          foundAmount = amount;
          confidence = 0.9;
          break;
        }
      }
      
      // Check next few lines
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nextLine = lines[j];
        const nextLower = nextLine.toLowerCase();
        
        if (excludeKeywords.some(k => nextLower.includes(k))) continue;
        
        const nextMatch = nextLine.match(/^\s*(\d{1,7}(?:[,\s]\d{3})*(?:\.\d{2})?)\s*$/);
        if (nextMatch) {
          const amount = nextMatch[1].replace(/[,\s]/g, '');
          const numAmount = parseFloat(amount);
          if (numAmount > 0 && numAmount <= 10000000) {
            foundAmount = amount;
            confidence = 0.85;
            break;
          }
        }
      }
      if (foundAmount) break;
    }
  }

  // Method 2: Find standalone decimal numbers
  if (!foundAmount) {
    for (const line of lines) {
      const trimmed = line.trim();
      const match = trimmed.match(/^(\d{1,7}(?:[,\s]\d{3})*\.\d{2})$/);
      if (match) {
        const amount = match[1].replace(/[,\s]/g, '');
        const numAmount = parseFloat(amount);
        if (numAmount > 0 && numAmount <= 10000000) {
          foundAmount = amount;
          confidence = 0.7;
          break;
        }
      }
    }
  }

  // Method 3: Find largest reasonable number
  if (!foundAmount) {
    const allNumbers = text.match(/\b(\d{1,7}(?:[,\s]\d{3})*\.\d{2})\b/g);
    if (allNumbers) {
      const amounts = allNumbers
        .map(n => ({ original: n, value: parseFloat(n.replace(/[,\s]/g, '')) }))
        .filter(n => n.value > 0 && n.value < 1000000)
        .sort((a, b) => b.value - a.value);
      
      if (amounts.length > 0) {
        foundAmount = amounts[0].original.replace(/[,\s]/g, '');
        confidence = 0.5;
      }
    }
  }

  return { amount: foundAmount, confidence };
}

// Extract date from text
function extractDate(text, lines) {
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{1,2})\s+(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?)\s+(\d{2,4})/i,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/i
  ];

  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        return match[0];
      }
    }
  }
  return null;
}

// Extract time from text
function extractTime(text, lines) {
  for (const line of lines) {
    const match = line.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|น\.))?/i);
    if (match) {
      return match[0];
    }
  }
  return null;
}

// Extract recipient name
function extractRecipient(text, lines) {
  const keywords = ['ผู้รับ', 'to', 'recipient', 'ไปยัง', 'payee', 'ชื่อ'];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();
    
    if (keywords.some(k => lowerLine.includes(k))) {
      // Try same line
      const nameMatch = line.match(/[ก-๙a-zA-Z\s]{3,40}/g);
      if (nameMatch) {
        for (const name of nameMatch) {
          const trimmed = name.trim();
          if (trimmed.length >= 3 && !keywords.some(k => trimmed.toLowerCase().includes(k))) {
            return trimmed;
          }
        }
      }
      
      // Try next line
      if (i + 1 < lines.length) {
        const nextLine = lines[i + 1].trim();
        if (nextLine.length >= 3 && nextLine.length <= 40 && !/^\d+$/.test(nextLine)) {
          return nextLine;
        }
      }
    }
  }
  return null;
}

// Main OCR endpoint
router.post('/scan', upload.single('image'), async (req, res) => {
  const startTime = Date.now();
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const originalPath = req.file.path;
    const processedPath = originalPath.replace(/\.[^.]+$/, '-processed.png');
    
    // Preprocess image
    await preprocessImage(originalPath, processedPath);
    
    // Run Tesseract OCR with Thai + English
    const { data } = await Tesseract.recognize(
      processedPath,
      'tha+eng',
      {
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: '1'
      }
    );

    const text = data.text;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const fullText = text.toLowerCase();
    
    // Detect document type
    const transferKeywords = ['โอนเงิน', 'transfer', 'successful', 'สำเร็จ', 'จากบัญชี', 'ไปยังบัญชี'];
    const receiptKeywords = ['total', 'ยอดรวม', 'vat', 'receipt', 'ใบเสร็จ', 'tax'];
    
    const isTransferSlip = transferKeywords.some(k => fullText.includes(k));
    const isReceipt = receiptKeywords.some(k => fullText.includes(k));

    // Extract data
    const bank = detectBank(text);
    const { amount, confidence: amountConfidence } = extractAmount(text, lines);
    const date = extractDate(text, lines);
    const time = extractTime(text, lines);
    const recipient = isTransferSlip ? extractRecipient(text, lines) : null;

    // Calculate processing time
    const processingTime = Date.now() - startTime;

    // Determine document type
    let documentType = 'unknown';
    if (isTransferSlip) documentType = 'transfer_slip';
    else if (isReceipt) documentType = 'receipt';

    // Build extraction result
    const extraction = {
      documentType,
      bank: bank ? {
        code: bank.code,
        name: bank.fullName,
        color: bank.color
      } : null,
      amount: amount ? parseFloat(amount) : null,
      amountConfidence,
      date,
      time,
      recipient,
      rawText: text,
      lineCount: lines.length,
      processingTimeMs: processingTime
    };

    // Cleanup files
    try {
      if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
      if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
    } catch (e) {
      console.error('Cleanup error:', e);
    }

    res.json({
      success: true,
      extraction,
      ocrConfidence: data.confidence,
      tesseractVersion: Tesseract.version
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
    const processedPath = originalPath.replace(/\.[^.]+$/, '-processed.png');
    
    await preprocessImage(originalPath, processedPath);
    
    const { data } = await Tesseract.recognize(
      processedPath,
      'tha+eng',
      {
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: '1'
      }
    );

    const text = data.text;
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const bank = detectBank(text);
    const { amount } = extractAmount(text, lines);
    const date = extractDate(text, lines);
    const recipient = extractRecipient(text, lines);

    // Calculate accuracy metrics
    const metrics = {
      amount: {
        expected: expectedAmount,
        extracted: amount,
        correct: expectedAmount && amount && parseFloat(expectedAmount) === parseFloat(amount)
      },
      bank: {
        expected: expectedBank,
        extracted: bank?.code || null,
        correct: expectedBank && bank && expectedBank.toUpperCase() === bank.code
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

    // Cleanup
    try {
      if (fs.existsSync(processedPath)) fs.unlinkSync(processedPath);
      if (fs.existsSync(originalPath)) fs.unlinkSync(originalPath);
    } catch (e) {}

    res.json({
      success: true,
      metrics,
      overallAccuracy: Math.round(overallAccuracy * 100) / 100,
      ocrConfidence: data.confidence,
      rawText: text
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
