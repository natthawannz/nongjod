function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildPrompt({ language = 'th' } = {}) {
  const lang = String(language || 'th').trim().toLowerCase();
  if (lang === 'en') {
    return [
      'You are a strict classifier for personal finance categories.',
      'Choose the best categoryId from the provided list for the given transaction note.',
      'Use ONLY the JSON provided. Do not invent categories.',
      'Be conservative: if not clearly matching any category, choose otherCategoryId if provided; otherwise return "".',
      '',
      'Output rules:',
      '- Output JSON only.',
      '- Shape: {"categoryId":"<id>"} where <id> is one of the provided categoryIds, or "".',
      '- No extra keys, no prose.',
    ].join('\n');
  }
  return [
    'คุณเป็นตัวช่วย “จัดหมวดหมู่” รายรับ/รายจ่ายแบบเข้มงวด',
    'เลือก categoryId ที่เหมาะที่สุดจาก “รายการหมวดที่ให้มาเท่านั้น” จากโน้ตของรายการ',
    'ให้ “ระมัดระวัง” และอย่ามั่ว: ถ้าไม่มั่นใจว่าเข้าหมวดไหน ให้เลือก otherCategoryId ถ้ามี (หมวดอื่นๆ) ถ้าไม่มีค่อยตอบ ""',
    '',
    'กติกา output:',
    '- ตอบเป็น JSON อย่างเดียว',
    '- รูปแบบเท่านั้น: {"categoryId":"<id>"} โดย <id> ต้องเป็นหนึ่งใน categoryIds ที่ให้มา หรือ ""',
    '- ห้ามใส่ key อื่น และห้ามอธิบายเพิ่ม',
  ].join('\n');
}

async function suggestCategoryIdFromNote({
  language = 'th',
  noteText = '',
  type = 'expense',
  categories = [],
  model,
} = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not set on the server');
    err.code = 'missing_openai_api_key';
    throw err;
  }

  const usedModel = model || process.env.OPENAI_CATEGORY_MODEL || 'gpt-4o-mini';
  const timeoutMs = Number(process.env.OPENAI_CATEGORY_TIMEOUT_MS || 12000) || 12000;

  const safeNote = String(noteText || '').trim().slice(0, 280);
  const safeType = type === 'income' ? 'income' : 'expense';
  const list = Array.isArray(categories)
    ? categories
        .map((c) => ({
          id: String(c?.id || c?._id || '').trim(),
          name: String(c?.name || '').trim(),
          icon: String(c?.icon || '').trim(),
        }))
        .filter((c) => c.id && c.name)
        .slice(0, 80)
    : [];

  if (!safeNote || list.length === 0) return '';

  const payload = {
    type: safeType,
    noteText: safeNote,
    categories: list,
    categoryIds: list.map((c) => c.id),
    otherCategoryId: (() => {
      const other = list.find((c) => String(c.name).trim() === 'อื่นๆ' || String(c.name).trim().toLowerCase() === 'other');
      return other ? other.id : '';
    })(),
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: usedModel,
        temperature: 0,
        messages: [
          { role: 'system', content: buildPrompt({ language }) },
          { role: 'user', content: JSON.stringify(payload) },
        ],
      }),
      signal: controller.signal,
    });

    const text = await resp.text();
    const data = safeJson(text) || {};
    if (!resp.ok) {
      const msg = data?.error?.message || text || `OpenAI category suggest failed (${resp.status})`;
      const err = new Error(msg);
      err.status = resp.status;
      err.payload = data;
      err.model = usedModel;
      throw err;
    }

    const content = String(data?.choices?.[0]?.message?.content || '').trim();
    const parsed = safeJson(content);
    const categoryId = String(parsed?.categoryId || '').trim();
    if (!categoryId) return '';
    if (!payload.categoryIds.includes(categoryId)) return '';
    return categoryId;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { suggestCategoryIdFromNote };
