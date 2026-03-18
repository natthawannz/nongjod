const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const sharp = require('sharp');

// Thai bank patterns for detection
const BANK_PATTERNS = {
  KBANK: { names: ['กสิกร', 'kbank', 'kasikorn', 'kasikornbank'], fullName: 'ธนาคารกสิกรไทย', color: '#138f2d' },
  SCB: { names: ['ไทยพาณิชย์', 'scb', 'siam commercial', 'scbeasy'], fullName: 'ธนาคารไทยพาณิชย์', color: '#4e2a84' },
  BBL: { names: ['กรุงเทพ', 'bbl', 'bangkok bank'], fullName: 'ธนาคารกรุงเทพ', color: '#1e3a8a' },
  KTB: { names: ['กรุงไทย', 'ktb', 'krungthai'], fullName: 'ธนาคารกรุงไทย', color: '#00a4e4' },
  BAY: { names: ['กรุงศรี', 'krungsri', 'bay', 'ayudhya'], fullName: 'ธนาคารกรุงศรีอยุธยา', color: '#ffc600' },
  TTB: { names: ['ttb', 'ทหารไทยธนชาต', 'tmbthanachart'], fullName: 'ธนาคารทหารไทยธนชาต', color: '#0066b3' },
  GSB: { names: ['ออมสิน', 'gsb', 'government savings'], fullName: 'ธนาคารออมสิน', color: '#e91e63' },
  BAAC: { names: ['ธกส', 'baac', 'เกษตร'], fullName: 'ธ.ก.ส.', color: '#4caf50' },
  GHB: { names: ['อาคารสงเคราะห์', 'ghb', 'ธอส'], fullName: 'ธนาคารอาคารสงเคราะห์', color: '#ff9800' },
  PROMPTPAY: { names: ['พร้อมเพย์', 'promptpay'], fullName: 'พร้อมเพย์', color: '#0052cc' },
};

function safeUnlink(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}

function sanitizeForPath(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Preprocess image for better OCR (single variant)
async function preprocessImageVariant(inputPath, outputPath, variant) {
  try {
    const v = String(variant || 'bw-170');
    let img = sharp(inputPath).rotate(); // honor EXIF orientation

    // Make text larger for OCR. Most phone screenshots are small.
    img = img.resize(2400, null, { withoutEnlargement: false, fit: 'inside' });

    // Common baseline for Thai slips/screenshots.
    img = img.grayscale().normalize();

    if (v === 'gray') {
      // Keep grayscale (no hard threshold) - helps on colorful backgrounds.
      img = img.median(3).sharpen();
    } else if (v === 'bw-160') {
      img = img.median(3).sharpen().threshold(160);
    } else {
      // Default: slightly softer threshold than before.
      img = img.median(3).sharpen().threshold(170);
    }

    await img.toFile(outputPath);
    return outputPath;
  } catch (error) {
    console.error('Image preprocessing error:', error);
    return inputPath;
  }
}

async function preprocessImageVariants(inputPath, baseOutputPath) {
  const baseDir = path.dirname(baseOutputPath);
  const baseName = path.basename(baseOutputPath, path.extname(baseOutputPath));
  try {
    fs.mkdirSync(baseDir, { recursive: true });
  } catch {
    // ignore
  }

  const variants = ['bw-170', 'gray', 'bw-160'];
  const out = [];
  for (const v of variants) {
    const outPath = path.join(baseDir, `${baseName}-${sanitizeForPath(v)}.png`);
    const p = await preprocessImageVariant(inputPath, outPath, v);
    out.push({ variant: v, path: p });
  }
  return out;
}

// Detect bank from text
function detectBank(text) {
  const lowerText = String(text || '').toLowerCase();
  for (const [code, bank] of Object.entries(BANK_PATTERNS)) {
    for (const name of bank.names) {
      if (lowerText.includes(String(name).toLowerCase())) {
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
  const safeLines = Array.isArray(lines) ? lines : [];
  const fullText = String(text || '');

  const parseAmountFromText = (s) => {
    const str = String(s || '');
    const m = str.match(/(\d{1,9}(?:[,\s]\d{3})*(?:\.\d{1,2})?)(?:\s*(?:บาท|thb))?/i);
    if (!m) return null;
    const normalized = String(m[1]).replace(/[,\s]/g, '');
    const num = Number.parseFloat(normalized);
    if (!Number.isFinite(num)) return null;
    if (num <= 0 || num > 10000000) return null;
    return { raw: normalized, num };
  };

  // Method 1: Look for amount keywords
  for (let i = 0; i < safeLines.length; i++) {
    const line = safeLines[i];
    const lowerLine = String(line || '').toLowerCase();

    const hasAmountKeyword = amountKeywords.some((k) => lowerLine.includes(k));
    const hasExcludeKeyword = excludeKeywords.some((k) => lowerLine.includes(k));

    if (hasAmountKeyword && !hasExcludeKeyword) {
      const amountHit = parseAmountFromText(line);
      if (amountHit) {
        foundAmount = amountHit.raw;
        confidence = 0.92;
        break;
      }

      for (let j = i + 1; j < Math.min(i + 4, safeLines.length); j++) {
        const nextLine = safeLines[j];
        const nextLower = String(nextLine || '').toLowerCase();
        if (excludeKeywords.some((k) => nextLower.includes(k))) continue;
        const nextHit = parseAmountFromText(nextLine);
        if (nextHit) {
          foundAmount = nextHit.raw;
          confidence = 0.9;
          break;
        }
      }
      if (foundAmount) break;
    }
  }

  // Method 2: Find standalone decimal numbers (or with currency)
  if (!foundAmount) {
    for (const line of safeLines) {
      const trimmed = String(line || '').trim();
      const match = trimmed.match(/^(\d{1,9}(?:[,\s]\d{3})*(?:\.\d{1,2})?)(?:\s*(?:บาท|thb))$/i);
      if (match) {
        const hit = parseAmountFromText(trimmed);
        if (hit) {
          foundAmount = hit.raw;
          confidence = 0.78;
          break;
        }
      }
    }
  }

  // Method 3: Find largest reasonable number
  if (!foundAmount) {
    const allNumbers = fullText.match(/\b(\d{1,9}(?:[,\s]\d{3})*(?:\.\d{1,2})?)\b/g);
    if (allNumbers) {
      const amounts = allNumbers
        .map((n) => ({ original: n, value: Number.parseFloat(String(n).replace(/[,\s]/g, '')) }))
        .filter((n) => n.value > 0 && n.value < 1000000)
        .sort((a, b) => b.value - a.value);
      if (amounts.length > 0) {
        foundAmount = String(amounts[0].original).replace(/[,\s]/g, '');
        confidence = 0.5;
      }
    }
  }

  return { amount: foundAmount, confidence };
}

function extractMemo(_text, lines) {
  const safeLines = Array.isArray(lines) ? lines : [];
  const keys = ['บันทึกช่วยจำ', 'หมายเหตุ', 'โน้ต', 'note', 'memo'];
  for (const line of safeLines) {
    const s = String(line || '').trim();
    const lower = s.toLowerCase();
    if (!keys.some((k) => lower.includes(String(k).toLowerCase()))) continue;
    const m = s.match(/(?:บันทึกช่วยจำ|หมายเหตุ|โน้ต|note|memo)\s*[:：]?\s*(.+)$/i);
    if (m && String(m[1] || '').trim()) return String(m[1]).trim();
  }
  return null;
}

function extractDate(_text, lines) {
  const patterns = [
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
    /(\d{1,2})\s+(ม\.?ค\.?|ก\.?พ\.?|มี\.?ค\.?|เม\.?ย\.?|พ\.?ค\.?|มิ\.?ย\.?|ก\.?ค\.?|ส\.?ค\.?|ก\.?ย\.?|ต\.?ค\.?|พ\.?ย\.?|ธ\.?ค\.?)\s+(\d{2,4})/i,
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{2,4})/i,
  ];
  const safeLines = Array.isArray(lines) ? lines : [];
  for (const line of safeLines) {
    for (const pattern of patterns) {
      const match = String(line || '').match(pattern);
      if (match) return match[0];
    }
  }
  return null;
}

function extractTime(_text, lines) {
  const safeLines = Array.isArray(lines) ? lines : [];
  for (const line of safeLines) {
    const match = String(line || '').match(/(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM|น\.))?/i);
    if (match) return match[0];
  }
  return null;
}

function extractRecipient(_text, lines) {
  const keywords = ['ผู้รับ', 'to', 'recipient', 'ไปยัง', 'payee', 'ชื่อ'];
  const safeLines = Array.isArray(lines) ? lines : [];
  for (let i = 0; i < safeLines.length; i++) {
    const line = safeLines[i];
    const lowerLine = String(line || '').toLowerCase();
    if (keywords.some((k) => lowerLine.includes(k))) {
      const nameMatch = String(line || '').match(/[ก-๙a-zA-Z\s]{3,40}/g);
      if (nameMatch) {
        for (const name of nameMatch) {
          const trimmed = String(name || '').trim();
          if (trimmed.length >= 3 && !keywords.some((k) => trimmed.toLowerCase().includes(k))) {
            return trimmed;
          }
        }
      }
      if (i + 1 < safeLines.length) {
        const nextLine = String(safeLines[i + 1] || '').trim();
        if (nextLine.length >= 3 && nextLine.length <= 40 && !/^\d+$/.test(nextLine)) return nextLine;
      }
    }
  }
  return null;
}

async function runOcr(imagePath) {
  const { data } = await Tesseract.recognize(imagePath, 'tha+eng', {
    tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    preserve_interword_spaces: '1',
  });
  return data || {};
}

async function scanImageFile(originalPath, { cleanupOriginal = true } = {}) {
  const startTime = Date.now();
  const baseProcessedPath = originalPath.replace(/\.[^.]+$/, '-processed.png');
  const processedVariants = await preprocessImageVariants(originalPath, baseProcessedPath);

  let best = null;
  for (const v of processedVariants) {
    const data = await runOcr(v.path);
    const text = data.text || '';
    const lines = String(text).split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
    const fullText = String(text).toLowerCase();

    const transferKeywords = ['โอนเงิน', 'transfer', 'successful', 'สำเร็จ', 'จากบัญชี', 'ไปยังบัญชี', 'promptpay', 'พร้อมเพย์'];
    const receiptKeywords = ['total', 'ยอดรวม', 'vat', 'receipt', 'ใบเสร็จ', 'tax'];
    const isTransferSlip = transferKeywords.some((k) => fullText.includes(k));
    const isReceipt = receiptKeywords.some((k) => fullText.includes(k));

    const bank = detectBank(text);
    const { amount, confidence: amountConfidence } = extractAmount(text, lines);
    const date = extractDate(text, lines);
    const time = extractTime(text, lines);
    const memo = extractMemo(text, lines);
    const recipient = isTransferSlip ? extractRecipient(text, lines) : null;

    let documentType = 'unknown';
    if (isTransferSlip) documentType = 'transfer_slip';
    else if (isReceipt) documentType = 'receipt';

    const extraction = {
      documentType,
      bank: bank ? { code: bank.code, name: bank.fullName, color: bank.color } : null,
      amount: amount ? Number.parseFloat(amount) : null,
      amountConfidence,
      date,
      time,
      memo,
      recipient,
      rawText: text,
      lineCount: lines.length,
      processingTimeMs: 0, // set at end
      _preprocessVariant: v.variant,
    };

    const ocrConfidence = Number(data.confidence) || 0;
    const hasAmount = Number(extraction.amount) > 0;
    const score =
      ocrConfidence +
      (amountConfidence || 0) * 50 +
      (hasAmount ? 20 : 0) +
      (extraction.date ? 5 : 0) +
      (extraction.time ? 3 : 0) +
      (extraction.memo ? 3 : 0);

    if (!best || score > best.score) {
      best = { score, extraction, ocrConfidence, tesseractVersion: Tesseract.version, rawData: data };
    }

    // Early exit: confident amount found.
    if (hasAmount && (amountConfidence || 0) >= 0.88) break;
  }

  const processingTime = Date.now() - startTime;
  if (best && best.extraction) best.extraction.processingTimeMs = processingTime;

  for (const v of processedVariants) safeUnlink(v.path);
  if (cleanupOriginal) safeUnlink(originalPath);

  return {
    extraction: best ? best.extraction : { documentType: 'unknown', bank: null, amount: null, amountConfidence: 0, date: null, time: null, memo: null, recipient: null, rawText: '', lineCount: 0, processingTimeMs: processingTime },
    ocrConfidence: best ? best.ocrConfidence : 0,
    tesseractVersion: best ? best.tesseractVersion : Tesseract.version,
  };
}

module.exports = {
  scanImageFile,
};
