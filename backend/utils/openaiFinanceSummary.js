function safeJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatThb(amount) {
  const n = Number(amount) || 0;
  return `฿${n.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
}

function buildPrompt({ language = 'th' } = {}) {
  const lang = String(language || 'th').trim().toLowerCase();
  if (lang === 'en') {
    return [
      'You are a personal finance assistant.',
      'Summarize the user’s finances for the given period using ONLY the provided JSON.',
      'You may compute derived ratios (e.g. percentages) from the provided numbers.',
      'Be concise, specific, and actionable.',
      '',
      'Output rules:',
      '- Plain text only (no markdown).',
      '- Exactly 4 bullet lines, each starting with "- " (no extra lines).',
      '- Do not invent numbers or transactions.',
      '- Line 1 MUST be: "{dateLabel} spent {expenseText} • received {incomeText} • net {remainingText} • {txCount} tx".',
      '- Line 2: biggest spending category (or say none).',
      '- Line 3: 1 insight about risk/health based on net/income/expense.',
      '- Line 4: exactly 1 practical suggestion.',
    ].join('\n');
  }
  return [
    'คุณเป็นผู้ช่วยสรุปการเงิน (ช่วงเวลา) สำหรับผู้ใช้ไทย',
    'สรุปโดยใช้ “เฉพาะ JSON ที่ให้มา” ห้ามแต่งตัวเลข/รายการเพิ่ม (คำนวณสัดส่วนจากตัวเลขที่ให้มาได้)',
    'เขียนให้สั้น กระชับ อ่านง่าย และเน้นสิ่งที่ทำได้จริง',
    '',
    'กติกา output:',
    '- เป็นข้อความล้วนเท่านั้น (ไม่ใช้ markdown และไม่ใส่หัวข้อเพิ่ม)',
    '- ต้องมี “4 บรรทัดพอดี” และแต่ละบรรทัดขึ้นต้นด้วย "- " (ห้ามเกิน/ขาด)',
    '- บรรทัดที่ 1 ต้องอยู่รูปแบบนี้เท่านั้น: "{dateLabel} ใช้ไป {expenseText} • รับ {incomeText} • สุทธิ {remainingText} • {txCount} รายการ"',
    '- บรรทัดที่ 2: หมวดที่ใช้จ่ายมากสุด (ถ้าไม่มีให้บอกว่าไม่มีหมวดเด่น)',
    '- บรรทัดที่ 3: Insight 1 ข้อ จากข้อมูล (เช่น สุทธิติดลบ/รายจ่ายสูงเมื่อเทียบรายรับ/จำนวนรายการน้อยทำให้ประเมินยาก)',
    '- บรรทัดที่ 4: คำแนะนำที่ทำได้จริง “1 ข้อ” (ห้ามเกิน 1 ข้อ และอย่าตั้งตัวเลขใหม่)',
    '- แต่ละบรรทัดพยายามไม่เกิน ~90 ตัวอักษร',
  ].join('\n');
}

async function summarizeFinanceDay({
  language = 'th',
  dateLabel = '',
  income = 0,
  expense = 0,
  remaining = 0,
  txCount = 0,
  topExpenses = [],
  model,
} = {}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const err = new Error('OPENAI_API_KEY is not set on the server');
    err.code = 'missing_openai_api_key';
    throw err;
  }

  const usedModel = model || process.env.OPENAI_FINANCE_SUMMARY_MODEL || 'gpt-4o-mini';
  const timeoutMs = Number(process.env.OPENAI_FINANCE_SUMMARY_TIMEOUT_MS || 20000) || 20000;

  const safeIncome = Number(income) || 0;
  const safeExpense = Number(expense) || 0;
  const safeRemaining = Number(remaining) || 0;
  const safeTxCount = Math.max(0, Number(txCount) || 0);

  const top = Array.isArray(topExpenses)
    ? topExpenses
        .filter(Boolean)
        .slice(0, 3)
        .map((x) => {
          const name = String(x?.categoryName || x?.name || '').trim();
          const total = Number(x?.total ?? x?.spent ?? x?.amount) || 0;
          const sharePct = safeExpense > 0 ? Math.round((total / safeExpense) * 100) : null;
          return {
            name,
            total,
            totalText: formatThb(total),
            sharePct: Number.isFinite(sharePct) ? sharePct : null,
          };
        })
        .filter((x) => x.name && x.total > 0)
    : [];

  const avgExpensePerTx = safeTxCount > 0 ? safeExpense / safeTxCount : 0;

  const userPayload = {
    dateLabel: String(dateLabel || '').trim(),
    income: safeIncome,
    incomeText: formatThb(safeIncome),
    expense: safeExpense,
    expenseText: formatThb(safeExpense),
    remaining: safeRemaining,
    remainingText: formatThb(safeRemaining),
    txCount: safeTxCount,
    avgExpensePerTxText: formatThb(avgExpensePerTx),
    topExpenses: top,
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
        temperature: 0.2,
        messages: [
          { role: 'system', content: buildPrompt({ language }) },
          { role: 'user', content: JSON.stringify(userPayload) },
        ],
      }),
      signal: controller.signal,
    });

    const text = await resp.text();
    const data = safeJson(text) || {};
    if (!resp.ok) {
      const msg = data?.error?.message || text || `OpenAI finance summary failed (${resp.status})`;
      const err = new Error(msg);
      err.status = resp.status;
      err.payload = data;
      err.model = usedModel;
      throw err;
    }

    const content = String(data?.choices?.[0]?.message?.content || '').trim();
    return content;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { summarizeFinanceDay };
