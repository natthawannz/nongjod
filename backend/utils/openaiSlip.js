function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildSlipPrompt() {
  return [
    'You are a parser for Thai bank transfer slips / PromptPay slips / payment confirmations.',
    'Extract only what is visible in the image. If unsure, use null.',
    'Return STRICT JSON only. No markdown, no extra text.',
    '',
    'Schema (all keys required):',
    '{',
    '  "amount": number|null,',
    '  "currency": string|null,',
    '  "date": "YYYY-MM-DD"|null,',
    '  "time": "HH:MM"|null,',
    '  "direction": "in"|"out"|"unknown",',
    '  "sender_name": string|null,',
    '  "recipient_name": string|null,',
    '  "sender_bank": string|null,',
    '  "recipient_bank": string|null,',
    '  "reference": string|null,',
    '  "notes": string|null',
    '}',
    '',
    'Rules:',
    '- amount must be a number (THB amount). If multiple totals, pick the transfer amount / total paid.',
    '- date is Gregorian (not Buddhist year). Convert if needed.',
    '- direction: "out" if money sent/paid, "in" if received, else "unknown".',
    '- notes: short Thai summary (<= 140 chars) of what this slip is about.',
    '- IMPORTANT: if the slip shows a user-entered message/memo/remark (เช่น "ค่าของใช้ส่วนตัว ยาสระผม"), include that text in notes (prefer it over generic phrases like "โอนเงินสำเร็จ").',
  ].join('\n');
}

function buildSlipMemoPrompt() {
  return [
    'You extract ONLY the user-entered memo/remark/message from a Thai bank transfer slip image.',
    'Examples: "ค่าของใช้ส่วนตัว ยาสระผม", "ค่าเช่าห้อง", "ค่ากาแฟ".',
    'If there is no memo/remark visible, return null.',
    '',
    'Output JSON only (no markdown, no extra text).',
    'Schema:',
    '{ "memo": string|null }',
    '',
    'Rules:',
    '- Return ONLY the memo/remark text, not sender/recipient, not "โอนเงินสำเร็จ", not reference numbers.',
    '- Keep Thai as-is; do not translate.',
    '- Trim spaces; max 140 chars.',
  ].join('\n');
}

function looksGenericSlipNotes(notes) {
  const t = String(notes || '').trim().toLowerCase();
  if (!t) return true;
  // Generic transfer status without any expense intent.
  if (t === 'โอนเงินสำเร็จ') return true;
  if (/^(โอนเงินสำเร็จ|โอนเงิน|ชำระเงิน|payment|transfer)(\s|$)/i.test(t) && t.length <= 24) return true;
  return false;
}

async function parseSlipImageBuffer({ buffer, mimeType, model } = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not set on the server');
    err.code = 'missing_openai_api_key';
    throw err;
  }

  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('Missing image buffer');
    err.code = 'missing_image_buffer';
    throw err;
  }

  const usedModel = model || process.env.OPENAI_SLIP_MODEL || 'gpt-4o-mini';
  const fallbackModel = String(process.env.OPENAI_SLIP_FALLBACK_MODEL || '').trim();
  const usedMime = mimeType || 'image/jpeg';
  const base64 = buffer.toString('base64');
  const prompt = buildSlipPrompt();
  const memoPrompt = buildSlipMemoPrompt();

  const buildBody = (m) => ({
    model: m,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract data from this slip image.' },
          { type: 'image_url', image_url: { url: `data:${usedMime};base64,${base64}` } },
        ],
      },
    ],
  });

  const buildMemoBody = (m) => ({
    model: m,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: memoPrompt },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Extract only the memo/remark/message text from this slip image.' },
          { type: 'image_url', image_url: { url: `data:${usedMime};base64,${base64}` } },
        ],
      },
    ],
  });

  const doRequest = async (m) => {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.OPENAI_SLIP_TIMEOUT_MS || 45000) || 45000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildBody(m)),
        signal: controller.signal,
      });

      const text = await resp.text();
      const data = safeJson(text) || {};
      if (!resp.ok) {
        const msg = data?.error?.message || text || `OpenAI slip parse failed (${resp.status})`;
        const err = new Error(msg);
        err.status = resp.status;
        err.payload = data;
        err.model = m;
        throw err;
      }

      const content = String(data?.choices?.[0]?.message?.content || '').trim();
      const parsed = safeJson(content);
      if (!parsed || typeof parsed !== 'object') {
        const err = new Error('Model did not return valid JSON');
        err.code = 'invalid_json';
        err.raw = content;
        err.model = m;
        throw err;
      }

      return parsed;
    } finally {
      clearTimeout(timer);
    }
  };

  const doMemoRequest = async (m) => {
    const controller = new AbortController();
    const timeoutMs = Number(process.env.OPENAI_SLIP_TIMEOUT_MS || 45000) || 45000;
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const resp = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildMemoBody(m)),
        signal: controller.signal,
      });

      const text = await resp.text();
      const data = safeJson(text) || {};
      if (!resp.ok) return null;

      const content = String(data?.choices?.[0]?.message?.content || '').trim();
      const parsed = safeJson(content);
      const memo = String(parsed?.memo || '').trim();
      return memo ? memo.slice(0, 140) : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  try {
    const parsed = await doRequest(usedModel);
    const existingNotes = String(parsed?.notes || '').trim();
    if (looksGenericSlipNotes(existingNotes)) {
      const memo = await doMemoRequest(usedModel);
      if (memo) parsed.notes = memo;
    }
    return parsed;
  } catch (e) {
    const canRetry =
      fallbackModel &&
      fallbackModel !== usedModel &&
      (e?.code === 'invalid_json' || (Number(e?.status) >= 500 && Number(e?.status) <= 599));
    if (!canRetry) throw e;
    const parsed = await doRequest(fallbackModel);
    const existingNotes = String(parsed?.notes || '').trim();
    if (looksGenericSlipNotes(existingNotes)) {
      const memo = await doMemoRequest(fallbackModel);
      if (memo) parsed.notes = memo;
    }
    return parsed;
  }
}

module.exports = { parseSlipImageBuffer };
