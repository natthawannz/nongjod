const express = require('express');
const line = require('@line/bot-sdk');
const router = express.Router();
const { User, Transaction, Category, Budget, ImportExportLog, LineLoginSession, LineMessagingLinkSession, LineMessagingAlias } = require('../models');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { transcribeAudioFile } = require('../utils/transcribeAudio');
const { mergeUsers } = require('../utils/mergeUsers');
const { parseSlipImageBuffer } = require('../utils/openaiSlip');
const { summarizeFinanceDay } = require('../utils/openaiFinanceSummary');
const { suggestCategoryIdFromNote } = require('../utils/openaiCategorySuggest');

const CHANNEL_SECRET = String(process.env.LINE_CHANNEL_SECRET || '').trim();
let CHANNEL_TOKEN = String(process.env.LINE_CHANNEL_ACCESS_TOKEN || '').trim();
const SESSION_TTL_MS = 10 * 60 * 1000;
const LINK_TTL_MS = 10 * 60 * 1000;

// Create LINE client if token exists; otherwise provide a safe no-op client to avoid startup crash
let client;
function ensureClient() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  if (!token) {
    CHANNEL_TOKEN = '';
    client = {
      replyMessage: async (replyToken, message) => {
        console.log('LINE reply skipped (no CHANNEL_TOKEN). Reply would be:', replyToken, message);
      },
      pushMessage: async (userId, message) => {
        console.log('LINE push skipped (no CHANNEL_TOKEN). Push would be:', userId, message);
      },
      getMessageContent: async () => {
        throw new Error('LINE CHANNEL_TOKEN not configured');
      },
      getProfile: async (userId) => {
        throw new Error('LINE CHANNEL_TOKEN not configured');
      }
    };
    return;
  }
  // recreate client if token changed or client not yet created
  if (!client || CHANNEL_TOKEN !== token) {
    CHANNEL_TOKEN = token;
    client = new line.Client({ channelAccessToken: CHANNEL_TOKEN, channelSecret: CHANNEL_SECRET });
    console.log('LINE client initialized/reinitialized.');
  }
}
// initialize once
ensureClient();

// wrapper to log reply results/errors
async function sendReply(replyToken, message) {
  try {
    ensureClient();
    const r = await client.replyMessage(replyToken, message);
    console.log('LINE reply success', replyToken, message);
    return r;
  } catch (e) {
    const detail =
      e?.originalError?.response?.data ||
      e?.response?.data ||
      e?.originalError?.response ||
      e?.response ||
      null;
    console.error('LINE reply error', detail || e);
    return null;
  }
}

async function pushToUser(userId, message) {
  try {
    ensureClient();
    const r = await client.pushMessage(userId, message);
    console.log('LINE push success', userId, message);
    return r;
  } catch (e) {
    const detail =
      e?.originalError?.response?.data ||
      e?.response?.data ||
      e?.originalError?.response ||
      e?.response ||
      null;
    console.error('LINE push error', detail || e);
    return null;
  }
}

function getPushTargetId(source) {
  const t = source && source.type;
  if (t === 'group') return source.groupId || '';
  if (t === 'room') return source.roomId || '';
  return (source && source.userId) || '';
}

function buildAiUserErrorMessage(err) {
  const code = String(err?.code || '').trim();
  const status = Number(err?.status || 0) || 0;
  const rawMsg = String(err?.message || '').trim();

  if (code === 'missing_openai_api_key') return 'ยังไม่ได้ตั้งค่า OPENAI_API_KEY ใน backend/.env';
  if (status === 401) return 'OpenAI API key ไม่ถูกต้อง/หมดอายุ (401)';
  if (status === 403) return 'OpenAI ถูกปฏิเสธสิทธิ์ (403)';
  if (status === 429) return 'OpenAI โควต้าเต็ม/โดน rate limit (429)';
  if (code === 'invalid_json') return 'AI ตอบกลับผิดรูปแบบ';
  if (/abort/i.test(rawMsg)) return 'AI timeout';
  if (/fetch failed|enotfound|econnrefused|etimedout/i.test(rawMsg)) return 'เชื่อมต่อ OpenAI ไม่ได้ (network)';

  if (rawMsg) return `AI error: ${rawMsg.slice(0, 180)}`;
  return 'AI error';
}

// debug: show whether token was loaded when this module initialized
console.log('LINE webhook module loaded. CHANNEL_TOKEN present:', CHANNEL_TOKEN ? (CHANNEL_TOKEN.slice(0,8) + '...') : 'no');

async function findUserByMessagingIdOrAlias(lineMessagingUserId) {
  const id = String(lineMessagingUserId || '').trim();
  if (!id) return null;
  const direct = await User.findOne({ lineMessagingUserId: id }).catch(() => null);
  if (direct) return direct;
  const alias = await LineMessagingAlias.findOne({ aliasId: id }).catch(() => null);
  if (!alias?.userId) return null;
  return User.findById(alias.userId).catch(() => null);
}

function looksLikePlaceholderUser(u) {
  const email = String(u?.email || '').trim();
  const pw = String(u?.password || '').trim();
  const placeholderEmail = email.endsWith('@local') || email.endsWith('@line.local') || /^line_msg_/i.test(email) || /^line_/i.test(email);
  const noPw = !pw;
  return placeholderEmail && noPw;
}

function isVeryRecent(u, ms) {
  try {
    const t = new Date(u?.createdAt || 0).getTime();
    if (!Number.isFinite(t) || t <= 0) return false;
    return (Date.now() - t) <= Number(ms || 0);
  } catch {
    return false;
  }
}

async function ensureMessagingAlias({ aliasId, userId, source } = {}) {
  const a = String(aliasId || '').trim();
  const u = String(userId || '').trim();
  if (!a || !u) return null;
  try {
    const existing = await LineMessagingAlias.findOne({ aliasId: a }).catch(() => null);
    if (existing) return existing;
    return await LineMessagingAlias.create({ aliasId: a, userId: u, source: String(source || '') });
  } catch (e) {
    if (e && e.code === 11000) return LineMessagingAlias.findOne({ aliasId: a }).catch(() => null);
    throw e;
  }
}

function formatThb(amount) {
  const n = Number(amount) || 0;
  return `฿${n.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
}

function formatThaiDateTime(input) {
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function formatThaiDate(input) {
  try {
    const d = input instanceof Date ? input : new Date(input);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

const THAI_TONE_MARK_RE = /[\u0E47\u0E48-\u0E4C\u0E4D\u0E4E]/;
const THAI_TONE_MARK_GLOBAL_RE = /[\u0E47\u0E48-\u0E4C\u0E4D\u0E4E]/g;
function normalizeThaiCommand(input) {
  return String(input || '').normalize('NFC').replace(THAI_TONE_MARK_GLOBAL_RE, '').replace(/\s+/g, '');
}

function getBangkokMonthRange(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;

  // Thailand is UTC+07:00 with no DST.
  const bangkokMs = d.getTime() + 7 * 60 * 60 * 1000;
  const bd = new Date(bangkokMs);
  const year = bd.getUTCFullYear();
  const month = bd.getUTCMonth();

  const startUtcMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - 7 * 60 * 60 * 1000;
  const endUtcMs = Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - 7 * 60 * 60 * 1000;
  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

function getBangkokDayRange(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;

  const bangkokMs = d.getTime() + 7 * 60 * 60 * 1000;
  const bd = new Date(bangkokMs);
  const year = bd.getUTCFullYear();
  const month = bd.getUTCMonth();
  const day = bd.getUTCDate();

  const startUtcMs = Date.UTC(year, month, day, 0, 0, 0, 0) - 7 * 60 * 60 * 1000;
  const endUtcMs = Date.UTC(year, month, day + 1, 0, 0, 0, 0) - 7 * 60 * 60 * 1000;
  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function parseMonthSpecifierFromText(text) {
  const raw = String(text || '').trim();
  if (!raw) return null;
  const normalizeDigits = (s) => String(s || '').replace(/[๐-๙]/g, (ch) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(ch)));
  const s = normalizeDigits(raw).toLowerCase();

  if (s.includes('เดือนนี้')) return { kind: 'relative', offset: 0 };
  if (s.includes('เดือนที่แล้ว') || s.includes('เดือนก่อน')) return { kind: 'relative', offset: -1 };
  if (s.includes('เดือนหน้า') || s.includes('เดือนถัดไป')) return { kind: 'relative', offset: 1 };

  // Thai month abbreviations: ม.ค., ก.พ., มี.ค., เม.ย., พ.ค., มิ.ย., ก.ค., ส.ค., ก.ย., ต.ค., พ.ย., ธ.ค.
  const ABBR_TH = [
    ['ม.ค', 0], ['ก.พ', 1], ['มี.ค', 2], ['เม.ย', 3], ['พ.ค', 4], ['มิ.ย', 5],
    ['ก.ค', 6], ['ส.ค', 7], ['ก.ย', 8], ['ต.ค', 9], ['พ.ย', 10], ['ธ.ค', 11],
  ];
  for (const [abbr, monthIndex] of ABBR_TH) {
    const re = new RegExp(`${abbr}\\.?(?:\\s*)(\\d{4})`, 'i');
    const match = raw.match(re);
    if (match) {
      let year = Number(match[1]);
      if (year >= 2400) year -= 543;
      if (Number.isFinite(year)) return { kind: 'absolute', year, monthIndex };
    }
  }

  // Thai month + year (B.E. or C.E.)
  for (let i = 0; i < MONTH_NAMES_TH.length; i++) {
    const mName = MONTH_NAMES_TH[i];
    const re = new RegExp(`${mName}\\s*(\\d{4})`, 'i');
    const match = raw.match(re);
    if (match) {
      let year = Number(match[1]);
      if (year >= 2400) year -= 543;
      if (Number.isFinite(year)) return { kind: 'absolute', year, monthIndex: i };
    }
  }

  // YYYY-MM
  const ym = s.match(/(\d{4})\s*-\s*(\d{1,2})/);
  if (ym) {
    const year = Number(ym[1]);
    const month = Number(ym[2]);
    if (Number.isFinite(year) && month >= 1 && month <= 12) return { kind: 'absolute', year, monthIndex: month - 1 };
  }

  // MM/YYYY (B.E. supported)
  const my = s.match(/(\d{1,2})\s*\/\s*(\d{4})/);
  if (my) {
    const month = Number(my[1]);
    let year = Number(my[2]);
    if (year >= 2400) year -= 543;
    if (Number.isFinite(year) && month >= 1 && month <= 12) return { kind: 'absolute', year, monthIndex: month - 1 };
  }

  return null;
}

async function getTopExpenseCategories({ userId, range, limit = 3 } = {}) {
  if (!userId || !range?.start || !range?.end) return [];

  const rows = await Transaction.aggregate([
    {
      $match: {
        userId,
        type: 'expense',
        datetime: { $gte: range.start, $lt: range.end },
      },
    },
    {
      $group: {
        _id: '$categoryId',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
    { $sort: { total: -1 } },
    { $limit: Math.max(1, Math.min(10, Number(limit) || 3)) },
  ]).catch(() => []);

  const catIds = (rows || [])
    .map((r) => r?._id)
    .filter((id) => id != null);

  const cats = await Category.find({ _id: { $in: catIds } })
    .select({ _id: 1, name: 1, icon: 1 })
    .lean()
    .catch(() => []);

  const catMap = new Map((cats || []).map((c) => [String(c._id), c]));
  return (rows || []).map((r) => {
    const c = r?._id ? catMap.get(String(r._id)) : null;
    const name = String(c?.name || '').trim() || 'อื่นๆ';
    const iconDisplay = pickCategoryIconDisplay(c?.icon);
    return {
      categoryId: r?._id || null,
      name,
      icon: iconDisplay?.value || '🤖',
      total: Number(r?.total) || 0,
      count: Number(r?.count) || 0,
    };
  });
}

async function getMonthBudgetTotal({ userId, monthLabel } = {}) {
  if (!userId || !monthLabel) return null;
  const rows = await Budget.find({ userId, month: String(monthLabel) })
    .select({ total: 1 })
    .lean()
    .catch(() => []);
  const total = (rows || []).reduce((s, b) => s + (Number(b?.total) || 0), 0);
  return Number.isFinite(total) && total > 0 ? total : null;
}

function buildFinanceStatusFlexMessage({
  label,
  range,
  income,
  expense,
  remaining,
  txCount,
  topExpenses,
  budgetTotal,
  budgetRemaining,
  aiSummary,
} = {}) {
  const buildAiSummaryBox = (aiText) => {
    const raw = String(aiText || '').trim();
    if (!raw) return null;

    const lines = raw
      .split('\n')
      .map((x) => String(x || '').trim())
      .filter(Boolean)
      .map((ln) => ln.replace(/^\s*[-•]\s+/, '').trim())
      .filter(Boolean);

    const normalized =
      lines.length === 1
        ? lines[0]
            .split(/(?:\s*•\s*)|(?:\s*-\s*)/g)
            .map((s) => String(s || '').trim())
            .filter(Boolean)
            .slice(0, 6)
        : lines.slice(0, 6);

    const toBulletRow = (content) => ({
      type: 'box',
      layout: 'horizontal',
      spacing: 'sm',
      contents: [
        { type: 'text', text: '•', size: 'sm', color: '#64748B', flex: 0 },
        content,
      ],
    });

    const line1 = normalized[0] || '';
    const m1 = line1.match(
      /^(.+?)\s*ใช้ไป\s+(฿-?[\d,]+)\s*(?:•|\|)\s*รับ\s+(฿-?[\d,]+)\s*(?:•|\|)\s*สุทธิ\s+(฿-?[\d,]+)\s*(?:•|\|)\s*(\d+)\s*รายการ$/
    );
    const line1Content = m1
      ? (() => {
          const dateLabel = String(m1[1] || '').trim();
          const expText = String(m1[2] || '').trim();
          const incText = String(m1[3] || '').trim();
          const netText = String(m1[4] || '').trim();
          const txText = String(m1[5] || '').trim();
          const netNeg = /฿-/.test(netText);
          // Force vertical layout (each metric on its own line) to avoid wrap mixing.
          return {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            flex: 1,
            contents: [
              {
                type: 'text',
                size: 'sm',
                color: '#0F172A',
                wrap: true,
                contents: [
                  { type: 'span', text: dateLabel, weight: 'bold' },
                ],
              },
              {
                type: 'text',
                size: 'sm',
                color: '#0F172A',
                wrap: true,
                contents: [
                  { type: 'span', text: 'ใช้ไป ' },
                  { type: 'span', text: expText, weight: 'bold' },
                ],
              },
              {
                type: 'text',
                size: 'sm',
                color: '#0F172A',
                wrap: true,
                contents: [
                  { type: 'span', text: 'รับ ' },
                  { type: 'span', text: incText, weight: 'bold' },
                ],
              },
              {
                type: 'text',
                size: 'sm',
                color: '#0F172A',
                wrap: true,
                contents: [
                  { type: 'span', text: 'สุทธิ ' },
                  { type: 'span', text: netText, weight: 'bold', color: netNeg ? '#DC2626' : '#16A34A' },
                ],
              },
              {
                type: 'text',
                size: 'sm',
                color: '#0F172A',
                wrap: true,
                contents: [
                  { type: 'span', text: txText, weight: 'bold' },
                  { type: 'span', text: ' รายการ' },
                ],
              },
            ],
          };
        })()
      : {
          type: 'text',
          text: line1,
          size: 'sm',
          color: '#0F172A',
          wrap: true,
        };

    const formatOtherLine = (ln) => {
      const s = String(ln || '').trim();
      if (!s) return null;
      const split = s.split(/\s*[:：]\s*/);
      if (split.length >= 2) {
        const head = String(split[0] || '').trim();
        const tail = String(split.slice(1).join(':') || '').trim();
        return {
          type: 'text',
          size: 'sm',
          color: '#0F172A',
          wrap: true,
          contents: [
            { type: 'span', text: head, weight: 'bold' },
            { type: 'span', text: ': ' },
            { type: 'span', text: tail },
          ],
        };
      }
      return { type: 'text', text: s, size: 'sm', color: '#0F172A', wrap: true };
    };

    const otherRows = normalized
      .slice(1, 6)
      .map((ln) => formatOtherLine(ln))
      .filter(Boolean)
      .map((c) => toBulletRow(c));

    return {
      type: 'box',
      layout: 'vertical',
      spacing: 'sm',
      margin: 'lg',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          spacing: 'sm',
          contents: [
            { type: 'text', text: '🤖', size: 'md', color: '#0F172A', flex: 0 },
            { type: 'text', text: 'สรุปโดย AI', size: 'sm', weight: 'bold', color: '#0F172A', flex: 1, wrap: true },
          ],
        },
        {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          paddingAll: '14px',
          cornerRadius: '18px',
          backgroundColor: '#F1F5F9',
          contents: [toBulletRow(line1Content), ...otherRows],
        },
      ],
    };
  };

  const safeLabel = String(label || '').trim();
  const pillText = safeLabel.length > 22 ? `${safeLabel.slice(0, 22)}…` : safeLabel;
  const safeIncome = Number(income) || 0;
  const safeExpense = Number(expense) || 0;
  const safeRemaining = Number(remaining) || 0;
  const safeTxCount = Number(txCount) || 0;

  const remainingColor = safeRemaining < 0 ? '#DC2626' : '#16A34A';
  const headerBg = safeRemaining < 0 ? '#FEF2F2' : '#ECFDF5';

  const dateHint = range?.start ? formatThaiDate(range.start) : '';
  const dateHint2 = range?.end ? formatThaiDate(new Date(new Date(range.end).getTime() - 1)) : '';
  const periodHint = dateHint && dateHint2 && dateHint !== dateHint2 ? `${dateHint} - ${dateHint2}` : (dateHint || '');

  const budgetSection =
    Number.isFinite(Number(budgetTotal)) && Number(budgetTotal) > 0
      ? [
          { type: 'separator', color: '#E5E7EB', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'lg',
            contents: [
              { type: 'text', text: 'งบประมาณ', size: 'sm', weight: 'bold', color: '#0F172A' },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ตั้งไว้', size: 'sm', color: '#64748B', flex: 1 },
                  { type: 'text', text: formatThb(budgetTotal), size: 'sm', weight: 'bold', color: '#0F172A', flex: 0 },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'ใช้ไป', size: 'sm', color: '#64748B', flex: 1 },
                  { type: 'text', text: formatThb(safeExpense), size: 'sm', weight: 'bold', color: '#0F172A', flex: 0 },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: 'เหลือจากงบ', size: 'sm', color: '#64748B', flex: 1 },
                  {
                    type: 'text',
                    text: formatThb(budgetRemaining),
                    size: 'sm',
                    weight: 'bold',
                    color: (Number(budgetRemaining) || 0) < 0 ? '#DC2626' : '#16A34A',
                    flex: 0,
                  },
                ],
              },
            ],
          },
        ]
      : [];

  const topExpenseSection =
    Array.isArray(topExpenses) && topExpenses.length > 0
      ? [
          { type: 'separator', color: '#E5E7EB', margin: 'lg' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            margin: 'lg',
            contents: [
              { type: 'text', text: 'หมวดรายจ่ายสูงสุด', size: 'sm', weight: 'bold', color: '#0F172A' },
              ...topExpenses.slice(0, 3).map((r) => ({
                type: 'box',
                layout: 'horizontal',
                contents: [
                  { type: 'text', text: `${String(r?.icon || '•')} ${String(r?.name || 'อื่นๆ')}`, size: 'sm', color: '#334155', flex: 1, wrap: true },
                  { type: 'text', text: formatThb(r?.total), size: 'sm', weight: 'bold', color: '#0F172A', flex: 0 },
                ],
              })),
            ],
          },
        ]
      : [];

  const aiSummaryText = String(aiSummary || '').trim();
  const aiBox = buildAiSummaryBox(aiSummaryText);
  const aiSection = aiBox ? [{ type: 'separator', color: '#E5E7EB', margin: 'lg' }, aiBox] : [];

  return {
    type: 'flex',
    altText: safeLabel ? `สรุปการเงิน (${safeLabel})` : 'สรุปการเงิน',
    quickReply: {
      items: [
        {
          type: 'action',
          action: { type: 'postback', label: 'จดรายการ', data: 'action=quick_note' },
        },
      ],
    },
    contents: {
      type: 'bubble',
      styles: {
        header: { backgroundColor: headerBg },
        body: { backgroundColor: '#FFFFFF' },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        spacing: 'sm',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'sm',
            contents: [
              { type: 'text', text: 'สถานะการเงิน', weight: 'bold', size: 'xl', color: '#0F172A', flex: 1, wrap: true },
              {
                type: 'box',
                layout: 'vertical',
                paddingAll: '6px',
                paddingStart: '12px',
                paddingEnd: '12px',
                cornerRadius: '999px',
                backgroundColor: '#E2E8F0',
                flex: 0,
                contents: [{ type: 'text', text: pillText || '-', size: 'xs', weight: 'bold', color: '#334155', align: 'center' }],
              },
            ],
          },
          ...(periodHint
            ? [{ type: 'text', text: periodHint, size: 'sm', color: '#64748B', wrap: true }]
            : []),
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        spacing: 'md',
        contents: [
          { type: 'text', text: 'คงเหลือ (สุทธิ)', size: 'sm', color: '#64748B' },
          { type: 'text', text: formatThb(safeRemaining), size: 'xxl', weight: 'bold', color: remainingColor, wrap: true },
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: 'รายจ่าย', size: 'xs', color: '#94A3B8' },
                  { type: 'text', text: formatThb(safeExpense), size: 'md', weight: 'bold', color: '#0F172A', wrap: true },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                flex: 1,
                contents: [
                  { type: 'text', text: 'รายรับ', size: 'xs', color: '#94A3B8' },
                  { type: 'text', text: formatThb(safeIncome), size: 'md', weight: 'bold', color: '#0F172A', wrap: true },
                ],
              },
              {
                type: 'box',
                layout: 'vertical',
                flex: 0,
                contents: [
                  { type: 'text', text: 'รายการ', size: 'xs', color: '#94A3B8' },
                  { type: 'text', text: String(safeTxCount), size: 'md', weight: 'bold', color: '#0F172A' },
                ],
              },
            ],
          },
          ...aiSection,
          ...topExpenseSection,
          ...budgetSection,
        ],
      },
    },
  };
}

function buildQuickNoteFlexMessage() {
  return {
    type: 'flex',
    altText: 'เพิ่มรายการ',
    contents: {
      type: 'bubble',
      styles: {
        header: { backgroundColor: '#10B981' },
        body: { backgroundColor: '#FFFFFF' },
      },
      header: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        spacing: 'sm',
        contents: [
          { type: 'text', text: 'เพิ่มรายการ', weight: 'bold', size: 'xl', color: '#FFFFFF', wrap: true },
          { type: 'text', text: 'พิมพ์ข้อความ แล้วผมจะบันทึกให้', size: 'sm', color: '#CBD5E1', wrap: true },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              { type: 'text', text: 'ตัวอย่าง (พิมพ์ได้เลย):', size: 'sm', weight: 'bold', color: '#0F172A' },
              { type: 'text', text: '• ข้าวมันไก่ 50\n• กาแฟ 65\n• เงินเดือน 20000\n• ค่าน้ำ 180', size: 'sm', color: '#334155', wrap: true },
            ],
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              { type: 'text', text: 'ทิป', size: 'sm', weight: 'bold', color: '#0F172A' },
              { type: 'text', text: '• พิมพ์หลายรายการได้ (ขึ้นบรรทัดใหม่)\n• ใส่จำนวนเงินท้ายประโยคจะเดาได้แม่นขึ้น', size: 'sm', color: '#475569', wrap: true },
            ],
          },
        ],
      },
    },
  };
}

function buildAnnounceFlexMessage() {
  // Opens the "ประกาศ" (LINE VOOM) profile link.
  const profileUrl = 'https://linevoom.line.me/user/_dSs5kG-khi7BnuX1n_8YC2waG8f69Rq3sXRBcHg';
  return { type: 'text', text: 'พี่กดโปรไฟล์จิ๋วเพื่อติดตามการประกาศข่าวสารได้เลยนะครับ', quickReply: { items: [{ type: 'action', action: { type: 'uri', label: 'กดโปรไฟล์จิ๋ว', uri: profileUrl } }] } };
}

async function sumCategoryTotalForMonth({ userId, categoryId, type, when } = {}) {
  if (!userId || !categoryId) return null;
  const range = getBangkokMonthRange(when || new Date());
  if (!range) return null;

  const rows = await Transaction.aggregate([
    {
      $match: {
        userId,
        categoryId,
        type: type === 'income' ? 'income' : 'expense',
        datetime: { $gte: range.start, $lt: range.end },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]).catch(() => []);

  const total = rows && rows[0] && typeof rows[0].total === 'number' ? rows[0].total : null;
  return Number.isFinite(total) ? total : null;
}

function pickCategoryIconDisplay(categoryIcon) {
  const raw = String(categoryIcon || '').trim();
  if (!raw) return { kind: 'emoji', value: '🤖' };
  // If user stored an emoji in DB, show it directly.
  if (!/^[a-z0-9_ -]+$/i.test(raw) && raw.length <= 8) return { kind: 'emoji', value: raw };
  const key = raw.toLowerCase().replace(/\s+/g, '_');
  const iconMap = {
    food: '🍜',
    drink: '☕️',
    transport: '🚆',
    bills: '🧾',
    shopping: '🛍️',
    health: '🩺',
    salary: '💼',
    bonus: '🎁',
    gift: '🎁',
    money: '💰',
    refund: '💸',
    investment: '📈',
    other: '📌',
    misc: '📌',
  };
  if (iconMap[key]) return { kind: 'emoji', value: iconMap[key] };
  return { kind: 'emoji', value: '🤖' };
}

function buildRecordedSuccessFlexMessage({
  txId,
  type,
  amount,
  categoryTotal,
  note,
  categoryName,
  categoryIcon,
  when,
  sourceLabel,
}) {
  const safeType = type === 'income' ? 'income' : 'expense';
  const typeLabel = safeType === 'income' ? 'รายรับ' : 'รายจ่าย';
  const typePill = safeType === 'income'
    ? { bg: '#D1FAE5', text: '#047857' }
    : { bg: '#FCE7E7', text: '#DC2626' };

  const safeAmount = Number(amount) || 0;
  const safeCategoryTotal = Number.isFinite(Number(categoryTotal)) ? Number(categoryTotal) : safeAmount;
  const safeNote = String(note || '').trim() || '-';
  const safeCategory = String(categoryName || '').trim() || 'อื่นๆ';
  const isCategoryUnknown = safeCategory === 'อื่นๆ';
  const whenText = formatThaiDateTime(when) || '';
  const safeSource = String(sourceLabel || '').trim();

  const iconDisplay = pickCategoryIconDisplay(categoryIcon);

  return {
    type: 'flex',
    altText: 'บันทึกสำเร็จ',
    contents: {
      type: 'bubble',
      styles: {
        header: { backgroundColor: '#ECFDF5' },
        body: { backgroundColor: '#FFFFFF' },
      },
      header: {
        type: 'box',
        layout: 'horizontal',
        paddingAll: '18px',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'vertical',
            flex: 1,
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                spacing: 'sm',
                contents: [
                  { type: 'text', text: 'บันทึกสำเร็จ', weight: 'bold', size: 'xl', color: '#0F172A', flex: 0 },
                  {
                    type: 'box',
                    layout: 'vertical',
                    width: '22px',
                    height: '22px',
                    cornerRadius: '999px',
                    backgroundColor: '#22C55E',
                    contents: [{ type: 'text', text: '✓', align: 'center', gravity: 'center', color: '#FFFFFF', size: 'sm', weight: 'bold' }],
                  },
                ],
              },
              {
                type: 'text',
                text: 'อย่าลืมตรวจสอบรายละเอียด',
                size: 'sm',
                color: '#64748B',
                margin: 'sm',
                wrap: true,
              },
            ],
          },
          
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        paddingAll: '18px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            spacing: 'md',
            alignItems: 'center',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: typePill.bg,
                cornerRadius: '999px',
                paddingAll: '6px',
                paddingStart: '14px',
                paddingEnd: '14px',
                flex: 0,
                contents: [
                  { type: 'text', text: typeLabel, size: 'sm', weight: 'bold', color: typePill.text, align: 'center' },
                ],
              },
              { type: 'text', text: `- ${isCategoryUnknown ? 'อื่นๆ' : safeCategory}`, size: 'md', weight: 'bold', color: '#0F172A', flex: 1, wrap: true },
              {
                type: 'text',
                text: '↗',
                size: 'lg',
                color: '#94A3B8',
                flex: 0,
                action: { type: 'postback', label: 'open', data: 'action=web_login' },
              },
            ],
          },

          ...(whenText
            ? [
                {
                  type: 'text',
                  text: whenText,
                  size: 'sm',
                  color: '#94A3B8',
                  margin: 'md',
                },
              ]
            : []),

          {
            type: 'text',
            text: safeNote,
            size: 'lg',
            weight: 'bold',
            color: '#0F172A',
            wrap: true,
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'horizontal',
            alignItems: 'center',
            spacing: 'sm',
            contents: [
              { type: 'text', text: formatThb(safeAmount), size: 'xl', weight: 'bold', color: '#22C55E', flex: 1, align: 'end' },
            ],
          },

          { type: 'separator', color: '#E5E7EB', margin: 'lg' },

          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: `รวมหมวด ${isCategoryUnknown ? 'อื่นๆ' : safeCategory}`, size: 'md', weight: 'bold', color: '#0F172A', flex: 1, wrap: true },
              { type: 'text', text: formatThb(safeCategoryTotal), size: 'md', weight: 'bold', color: '#22C55E', flex: 0 },
            ],
          },

          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            contents: [
              
                         
            ],
          },

          {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#FEF3C7',
            cornerRadius: '14px',
            paddingAll: '14px',
            margin: 'md',
            contents: [
              {
                type: 'text',
                text: '💡 ระบบช่วยจัดหมวดให้อัตโนมัติ',
                size: 'sm',
                color: '#92400E',
                wrap: true,
              },
            ],
          },

          ...(safeSource
            ? [
                {
                  type: 'text',
                  text: `ที่มา: ${safeSource}`,
                  size: 'xs',
                  color: '#CBD5E1',
                  wrap: true,
                },
              ]
            : []),
        ],
      },
    },
  };
}

// simple parser: returns { type: 'income'|'expense', amount, note }
function parseTransactionText(text) {
  const normalizeDigits = (s) => String(s || '').replace(/[๐-๙]/g, (ch) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(ch)));
  const makeBangkokDateTime = ({ year, month, day, hour = 12, minute = 0 } = {}) => {
    const y = Number(year);
    const m = Number(month);
    const d = Number(day);
    const hh = Number(hour);
    const mm = Number(minute);
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const safeH = Number.isFinite(hh) ? Math.max(0, Math.min(23, hh)) : 12;
    const safeM = Number.isFinite(mm) ? Math.max(0, Math.min(59, mm)) : 0;
    const pad2 = (n) => String(n).padStart(2, '0');
    const iso = `${y}-${pad2(m)}-${pad2(d)}T${pad2(safeH)}:${pad2(safeM)}:00.000+07:00`;
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return null;
    return dt;
  };

  const now = new Date();
  const todayBkk = makeBangkokDateTime({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
    hour: now.getHours(),
    minute: now.getMinutes(),
  });

  const consumeBarePrefix = (raw, barePrefix) => {
    const target = String(barePrefix || '');
    if (!target) return String(raw || '').trim();
    const src = String(raw || '');
    let out = '';
    let i = 0;
    while (i < src.length && out.length < target.length) {
      const ch = src[i];
      if (!THAI_TONE_MARK_RE.test(ch)) out += ch;
      i += 1;
    }
    if (out === target) return src.slice(i).trim();
    return src.trim();
  };

  const extractWhenPrefix = (input) => {
    const raw = normalizeDigits(input).trim();
    const rawBare = normalizeThaiCommand(raw);
    let rest = raw;
    let when = null;

    const consume = (len) => {
      rest = raw.slice(len).trim();
    };

    // Keywords: วันนี้ / เมื่อวาน
    if (rawBare.startsWith('วันนี')) {
      when = todayBkk || new Date();
      rest = consumeBarePrefix(raw, 'วันนี');
      return { when, rest };
    }
    if (rawBare.startsWith('เมื่อวานนี')) {
      const base = todayBkk || new Date();
      const dt = new Date(base);
      dt.setDate(dt.getDate() - 1);
      when = makeBangkokDateTime({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), hour: dt.getHours(), minute: dt.getMinutes() }) || dt;
      rest = consumeBarePrefix(raw, 'เมื่อวานนี');
      return { when, rest };
    }
    if (rawBare.startsWith('เมื่อวาน')) {
      const base = todayBkk || new Date();
      const dt = new Date(base);
      dt.setDate(dt.getDate() - 1);
      // keep time roughly same; normalize to Bangkok offset via ISO rebuild
      when = makeBangkokDateTime({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), hour: dt.getHours(), minute: dt.getMinutes() }) || dt;
      rest = consumeBarePrefix(raw, 'เมื่อวาน');
      return { when, rest };
    }

    // Relative days: "ย้อนหลัง 3 วัน", "3 วันก่อน"
    const rel = raw.match(/^(?:ย้อนหลัง\s*)?(\d{1,3})\s*วัน(?:ก่อน|ที่แล้ว)?(?:\s|$)/i);
    if (rel) {
      const n = Number(rel[1]);
      const base = todayBkk || new Date();
      const dt = new Date(base);
      if (Number.isFinite(n) && n >= 0 && n <= 3650) dt.setDate(dt.getDate() - n);
      when = makeBangkokDateTime({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), hour: dt.getHours(), minute: dt.getMinutes() }) || dt;
      consume(rel[0].length);
      return { when, rest };
    }

    // Date formats: YYYY-MM-DD or DD/MM/YYYY (B.E. supported)
    const d1 = raw.match(/^(?:วันที่\s*)?(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?(?:\s|$)/);
    if (d1) {
      const y = Number(d1[1]);
      const mo = Number(d1[2]);
      const da = Number(d1[3]);
      const hh = d1[4] != null ? Number(d1[4]) : 12;
      const mm = d1[5] != null ? Number(d1[5]) : 0;
      when = makeBangkokDateTime({ year: y, month: mo, day: da, hour: hh, minute: mm });
      if (when) {
        consume(d1[0].length);
        return { when, rest };
      }
    }

    const d2 = raw.match(/^(?:วันที่\s*)?(\d{1,2})[\\/\\-](\d{1,2})[\\/\\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?(?:\s|$)/);
    if (d2) {
      const day = Number(d2[1]);
      const month = Number(d2[2]);
      let year = Number(d2[3]);
      const hh = d2[4] != null ? Number(d2[4]) : 12;
      const mm = d2[5] != null ? Number(d2[5]) : 0;
      if (year < 100) year = year <= 50 ? 2000 + year : 1900 + year;
      if (year >= 2400) year = year - 543; // Buddhist year -> Gregorian
      when = makeBangkokDateTime({ year, month, day, hour: hh, minute: mm });
      if (when) {
        consume(d2[0].length);
        return { when, rest };
      }
    }

    return { when: null, rest: raw };
  };

  const { when, rest } = extractWhenPrefix(text);
  const t = String(rest || '').trim();
  const tl = t.toLowerCase();

  const tlBareCompact = normalizeThaiCommand(tl);
  if (tlBareCompact === normalizeThaiCommand('ยอดวันนี้') || tlBareCompact === normalizeThaiCommand('วันนี้')) {
    return { command: 'status_day', when: todayBkk || new Date(), queryText: t };
  }
  if (
    tlBareCompact === normalizeThaiCommand('ยอดเมื่อวาน') ||
    tlBareCompact === normalizeThaiCommand('ยอดเมื่อวานนี้') ||
    tlBareCompact === normalizeThaiCommand('เมื่อวาน') ||
    tlBareCompact === normalizeThaiCommand('เมื่อวานนี้')
  ) {
    const base = todayBkk || new Date();
    const dt = new Date(base);
    dt.setDate(dt.getDate() - 1);
    const yWhen = makeBangkokDateTime({ year: dt.getFullYear(), month: dt.getMonth() + 1, day: dt.getDate(), hour: dt.getHours(), minute: dt.getMinutes() }) || dt;
    return { command: 'status_day', when: yWhen, queryText: t };
  }
  if (
    tlBareCompact === normalizeThaiCommand('ยอดเดือนนี้') ||
    tlBareCompact === normalizeThaiCommand('เดือนนี้')
  ) {
    return { command: 'status_month', monthText: 'เดือนนี้', queryText: t };
  }
  if (
    tlBareCompact === normalizeThaiCommand('ยอดเดือนที่แล้ว') ||
    tlBareCompact === normalizeThaiCommand('เดือนที่แล้ว') ||
    tlBareCompact === normalizeThaiCommand('เดือนก่อน')
  ) {
    return { command: 'status_month', monthText: 'เดือนที่แล้ว', queryText: t };
  }
  // commands: help, สรุปวันนี้, สรุปเดือนนี้, export
  if (/^help$/i.test(t) || /^ช่วยเหลือ$/i.test(t)) return { command: 'help' };
  if (/^สรุปวันนี้$/i.test(t)) return { command: 'status_day', when };
  if (/^สรุปเดือนนี้$/i.test(t)) return { command: 'status_month', monthText: t };
  if (/^export(\s+.*)?$/i.test(t)) return { command: 'export' };
  if (/^\s*จด(รายการ(บันทึก)?)\s*$/i.test(t)) return { command: 'quick_note' };
  if (/^\s*จด\s*$/i.test(t)) return { command: 'quick_note' };
  if (/^(สถานะการเงิน|ภาพรวม(การเงิน)?|สรุปการเงิน)$/i.test(t)) return { command: 'status_month', monthText: 'เดือนนี้', queryText: t };

  // finance/status queries (today/month)
  const isQuestion = /(เท่าไหร่|เท่าไร|กี่บาท|ยังไง|ไหม|\?)/i.test(t);
  const wantsBalance = /(ยอดคงเหลือ|คงเหลือ|เหลือเงิน|เหลือเท่าไหร่|เหลือเท่าไร)/i.test(t);
  const wantsSpent = /(วันนี้\s*)?(ใช้ไป|จ่ายไป|ใช้จ่าย|รายจ่าย)/i.test(t);
  const wantsIncome = /(รายรับ|รายได้|รับมา|ได้เงิน)/i.test(t);
  const mentionsMonth =
    /(เดือนนี้|เดือนที่แล้ว|เดือนก่อน|เดือนหน้า|เดือนถัดไป)/i.test(t) ||
    MONTH_NAMES_TH.some((m) => t.includes(m)) ||
    /\d{4}\s*-\s*\d{1,2}/.test(t) ||
    /\d{1,2}\s*\/\s*\d{4}/.test(t);

  if ((wantsBalance || wantsSpent || wantsIncome) && (isQuestion || wantsBalance)) {
    if (when) return { command: 'status_day', when, queryText: t };
    if (mentionsMonth) return { command: 'status_month', monthText: t, queryText: t };
    // default to current month if no explicit time specified
    return { command: 'status_month', monthText: 'เดือนนี้', queryText: t };
  }

  // transaction: จ่าย 120 ข้าวมันไก่  OR  รับ 500 เงินลูกค้า
  const m = t.match(/^(จ่าย|จ่่าย|จ|จ\.?)\s*([0-9,\.]+)\s*(.*)$/i) || t.match(/^(รับ|เรีัย|ร)\s*([0-9,\.]+)\s*(.*)$/i);
  if (m) {
    const verb = m[1];
    const amountStr = m[2];
    const note = (m[3] || '').trim();
    const amount = parseFloat(amountStr.replace(/,/g, '')) || 0;
    const type = /^(รับ|r|เรีัย|ร)$/i.test(verb) ? 'income' : 'expense';
    return { type, amount, note, typeExplicit: true, when };
  }

  // Income keyword inference for inputs like: "เงินเดือน 20000", "โบนัส 5000"
  const incomeKeywords = [
    'เงินเดือน', 'โบนัส', 'รายได้', 'รายรับ', 'ค่าคอม', 'คอมมิชชั่น',
    'ทุน', 'ทุนการศึกษา', 'สวัสดิการ', 'เบิก', 'ชดเชย',
    'พ่อแม่', 'พ่อ', 'แม่', 'ครอบครัว', 'เงินให้ใช้', 'ค่าขนม',
    'commission', 'salary', 'bonus', 'income', 'allowance', 'parents', 'scholarship', 'reimburse', 'benefit',
  ];
  const inferredIncome = incomeKeywords.some((k) => tl.includes(k));

  // fallback: try to extract numbers
  const mm = t.match(/([0-9,\.]+)\s*(บาท|฿)?/);
  if (mm) {
    const amount = parseFloat(mm[1].replace(/,/g, '')) || 0;
    return { type: inferredIncome ? 'income' : 'expense', amount, note: t, typeExplicit: false, when };
  }

  return { command: 'unknown' };
}

function classifyCategoryFromNote(note, type) {
  const raw = String(note || '');
  const t = raw.toLowerCase();
  const has = (...keys) => keys.some((k) => t.includes(k));

  if (type === 'income') {
    if (has('พ่อแม่', 'พ่อ', 'แม่', 'ครอบครัว', 'เงินให้ใช้', 'ค่าขนม', 'allowance', 'parents')) {
      return { name: 'เงินสนับสนุน/ครอบครัว', icon: 'wallet' };
    }
    if (has('เงินเดือน', 'salary', 'ค่าจ้าง', 'wage')) return { name: 'เงินเดือน/ประจำ', icon: 'briefcase' };
    if (has('โบนัส', 'bonus')) return { name: 'เงินเดือน/ประจำ', icon: 'briefcase' };
    if (has('ฟรีแลนซ์', 'รับจ้าง', 'งานเสริม', 'ค่าคอม', 'คอมมิชชั่น', 'commission', 'freelance')) return { name: 'งานเสริม/ฟรีแลนซ์', icon: 'work' };
    if (has('ทุน', 'ทุนการศึกษา', 'สวัสดิการ', 'เบิก', 'ชดเชย', 'reimburse', 'benefit', 'scholarship')) return { name: 'ทุน/สวัสดิการ', icon: 'landmark' };
    if (has('คืนเงิน', 'รีฟันด์', 'refund', 'cashback', 'rebate')) return { name: 'คืนเงิน/รีฟันด์', icon: 'piggybank' };
    if (has('ดอกเบี้ย', 'ปันผล', 'dividend', 'interest', 'ผลตอบแทน')) return { name: 'ดอกเบี้ย/ผลตอบแทน', icon: 'trendingup' };
    if (has('ลงทุน', 'หุ้น', 'คริป', 'crypto', 'investment')) return { name: 'ดอกเบี้ย/ผลตอบแทน', icon: 'trendingup' };
    return null;
  }

  // expense
  if (has('ค่าเทอม', 'ค่าเรียน', 'ค่าโรงเรียน', 'มหาลัย', 'มหาวิทยาลัย', 'หนังสือเรียน', 'อุปกรณ์เรียน', 'คอร์ส', 'ติว', 'ค่าสอบ', 'tuition', 'course', 'education')) {
    return { name: 'การศึกษา', icon: 'education' };
  }
  if (has('ข้าว', 'ก๋วยเตี๋ยว', 'อาหาร', 'ข้าวมันไก่', 'หมูปิ้ง', 'ข้าวเหนียว', 'ส้มตำ', 'ผัด', 'แกง', 'ไก่', 'หมู', 'ปลา', 'กะเพรา', 'กระเพรา')) {
    return { name: 'อาหาร', icon: 'food' };
  }
  if (has('กาแฟ', 'ชา', 'น้ำ', 'น้ำอัดลม', 'โค้ก', 'pepsi', 'coffee', 'cafe')) {
    return { name: 'เครื่องดื่ม', icon: 'drink' };
  }
  if (has('ของใช้', 'ของใช้ส่วนตัว', 'ของใช้ในบ้าน', 'แชมพู', 'ยาสระผม', 'ครีมนวด', 'สบู่', 'ยาสีฟัน', 'แปรงสีฟัน', 'ทิชชู่', 'ผ้าอนามัย', 'ครีม', 'โลชั่น', 'shampoo', 'conditioner', 'soap', 'toothpaste')) {
    return { name: 'ช้อปปิ้ง', icon: 'shopping' };
  }
  if (has('grab', 'bolt', 'แท็กซี่', 'taxi', 'bts', 'mrt', 'รถเมล์', 'bus', 'train', 'เดินทาง', 'ค่าน้ำมัน', 'เติมน้ำมัน', 'parking', 'จอดรถ')) {
    return { name: 'เดินทาง', icon: 'transport' };
  }
  if (has('ค่าเช่า', 'หอ', 'คอนโด', 'บ้าน', 'ซ่อมบ้าน', 'เฟอร์', 'rent', 'apartment')) {
    return { name: 'ที่พัก/บ้าน', icon: 'home' };
  }
  if (has('ค่าไฟ', 'ค่าน้ำ', 'อินเตอร์เน็ต', 'เน็ตทรู', 'ais', 'dtac', 'true', 'wifi', 'โทรศัพท์', 'มือถือ', 'บิล', 'bill')) {
    return { name: 'บิล/สาธารณูปโภค', icon: 'bills' };
  }
  if (has('shopee', 'lazada', '7-11', 'เซเว่น', 'ซื้อของ', 'ช้อป', 'shopping')) {
    return { name: 'ช้อปปิ้ง', icon: 'shopping' };
  }
  if (has('ยา', 'หมอ', 'โรงพยาบาล', 'คลินิก', 'health')) {
    return { name: 'สุขภาพ', icon: 'health' };
  }
  if (has('netflix', 'spotify', 'ดูหนัง', 'หนัง', 'โรงหนัง', 'เกม', 'เที่ยว', 'ท่องเที่ยว', 'movie', 'game', 'entertainment')) {
    return { name: 'บันเทิง/ไลฟ์สไตล์', icon: 'music' };
  }
  if (has('ผ่อน', 'ดอกเบี้ย', 'บัตรเครดิต', 'สินเชื่อ', 'กยศ', 'loan', 'installment', 'credit card')) {
    return { name: 'หนี้/ผ่อน/ดอกเบี้ย', icon: 'creditcard' };
  }
  if (has('ของขวัญ', 'ทำบุญ', 'บริจาค', 'donate', 'donation', 'gift')) {
    return { name: 'ของขวัญ/ทำบุญ', icon: 'gift' };
  }

  return null;
}

function looksLikeTransferPayment(noteText) {
  const t = String(noteText || '').toLowerCase();
  return (
    /(โอน|ชำระ|ชำระเงิน|พร้อมเพย์|promptpay|transfer|pay(ment)?|qr)/i.test(t) ||
    /(โอนเงิน|โอนเข้|โอนออก|ตัดบัตร|บัตรเครดิต|credit\s*card|debit)/i.test(t)
  );
}

function looksLikeNonTransferExpense(noteText) {
  // If the note clearly looks like a purchase category (food/shopping/health/etc),
  // treat it as non-transfer even if the slip contains "โอนเงินสำเร็จ".
  try {
    const hint = classifyCategoryFromNote(noteText, 'expense');
    return Boolean(hint && hint.name);
  } catch {
    return false;
  }
}

function normalizeThaiForMatch(text) {
  const normalizeDigits = (s) => String(s || '').replace(/[๐-๙]/g, (ch) => String('๐๑๒๓๔๕๖๗๘๙'.indexOf(ch)));
  return normalizeDigits(String(text || ''))
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // remove numbers/currency tokens for matching category names
    .replace(/[0-9]/g, '')
    .replace(/บาท|฿/g, '')
    // keep Thai/English letters; drop punctuation/spaces
    .replace(/[^a-z\u0E00-\u0E7F]+/g, '');
}

async function findUserCategoryIdByAliases({ userId, type, aliases, iconHint } = {}) {
  if (!userId) return null;
  const safeType = type === 'income' ? 'income' : 'expense';
  const aliasList = Array.isArray(aliases) ? aliases.map((x) => String(x || '').trim()).filter(Boolean) : [];
  const aliasNorms = aliasList.map((a) => normalizeThaiCommand(a).toLowerCase()).filter(Boolean);
  if (aliasNorms.length === 0) return null;

  const cats = await Category.find({ userId, type: safeType })
    .select({ _id: 1, name: 1, icon: 1 })
    .limit(300)
    .lean()
    .catch(() => []);
  if (!Array.isArray(cats) || cats.length === 0) return null;

  const iconNorm = iconHint ? normalizeThaiCommand(String(iconHint)).toLowerCase() : '';

  let best = null;
  let bestScore = -1;
  for (const c of cats) {
    const name = String(c?.name || '').trim();
    if (!name) continue;
    const n = normalizeThaiCommand(name).toLowerCase();
    if (!n) continue;

    let score = 0;
    if (aliasNorms.includes(n)) score = 200;
    else if (aliasNorms.some((a) => a && (n.includes(a) || a.includes(n)))) score = 120 + Math.min(60, n.length);
    else continue;

    if (iconNorm) {
      const ci = normalizeThaiCommand(String(c?.icon || '')).toLowerCase();
      if (ci && ci === iconNorm) score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best?._id || null;
}

function aliasesForInferredCategory(cat) {
  const name = String(cat?.name || '').trim();
  const icon = String(cat?.icon || '').trim();
  if (!name) return { aliases: [], iconHint: icon };
  if (name === 'ช้อปปิ้ง') return { aliases: ['ช้อปปิ้ง', 'ช็อปปิ้ง', 'shopping', 'ของใช้', 'ซื้อของ'], iconHint: icon || 'shopping' };
  if (name === 'เครื่องดื่ม') return { aliases: ['เครื่องดื่ม', 'กาแฟ', 'ชา', 'drink', 'coffee'], iconHint: icon || 'drink' };
  if (name === 'อาหาร') return { aliases: ['อาหาร', 'ข้าว', 'กับข้าว', 'food'], iconHint: icon || 'food' };
  if (name === 'การศึกษา') return { aliases: ['การศึกษา', 'ค่าเทอม', 'ค่าเรียน', 'โรงเรียน', 'มหาลัย', 'มหาวิทยาลัย', 'คอร์ส', 'ติว', 'หนังสือเรียน', 'tuition', 'course', 'education'], iconHint: icon || 'education' };
  if (name === 'สุขภาพ') return { aliases: ['สุขภาพ', 'หมอ', 'ยา', 'health', 'medical'], iconHint: icon || 'health' };
  if (name === 'เดินทาง') return { aliases: ['เดินทาง', 'รถ', 'รถไฟ', 'bts', 'mrt', 'grab', 'transport'], iconHint: icon || 'transport' };
  if (name === 'บิล/สาธารณูปโภค') return { aliases: ['บิล', 'ค่าน้ำ', 'ค่าไฟ', 'อินเตอร์เน็ต', 'utilities'], iconHint: icon || 'bills' };
  if (name === 'ที่พัก/บ้าน') return { aliases: ['ที่พัก', 'บ้าน', 'ค่าเช่า', 'หอ', 'คอนโด', 'ซ่อมบ้าน', 'rent', 'home'], iconHint: icon || 'home' };
  if (name === 'บันเทิง/ไลฟ์สไตล์') return { aliases: ['บันเทิง', 'ไลฟ์สไตล์', 'ดูหนัง', 'หนัง', 'เกม', 'netflix', 'spotify', 'เที่ยว', 'movie', 'game', 'entertainment'], iconHint: icon || 'music' };
  if (name === 'หนี้/ผ่อน/ดอกเบี้ย') return { aliases: ['หนี้', 'ผ่อน', 'ดอกเบี้ย', 'บัตรเครดิต', 'สินเชื่อ', 'กยศ', 'loan', 'credit', 'installment', 'interest'], iconHint: icon || 'creditcard' };
  if (name === 'ของขวัญ/ทำบุญ') return { aliases: ['ของขวัญ', 'ทำบุญ', 'บริจาค', 'donate', 'donation', 'gift'], iconHint: icon || 'gift' };

  // Income-side common groups
  if (name === 'เงินสนับสนุน/ครอบครัว') return { aliases: ['เงินจากพ่อแม่', 'เงินจากพ่อ', 'เงินจากแม่', 'พ่อแม่โอน', 'แม่โอน', 'พ่อโอน', 'ครอบครัว', 'เงินให้ใช้', 'ค่าขนม', 'allowance', 'parents'], iconHint: icon || 'wallet' };
  if (name === 'เงินเดือน/ประจำ') return { aliases: ['เงินเดือน', 'salary', 'ค่าจ้าง', 'wage', 'รายได้ประจำ'], iconHint: icon || 'briefcase' };
  if (name === 'งานเสริม/ฟรีแลนซ์') return { aliases: ['งานเสริม', 'ฟรีแลนซ์', 'รับจ้าง', 'ค่าคอม', 'คอมมิชชั่น', 'commission', 'freelance'], iconHint: icon || 'work' };
  if (name === 'ทุน/สวัสดิการ') return { aliases: ['ทุน', 'ทุนการศึกษา', 'สวัสดิการ', 'เบิก', 'ชดเชย', 'reimburse', 'benefit', 'scholarship'], iconHint: icon || 'landmark' };
  if (name === 'คืนเงิน/รีฟันด์') return { aliases: ['คืนเงิน', 'รีฟันด์', 'refund', 'cashback', 'rebate'], iconHint: icon || 'piggybank' };
  if (name === 'ดอกเบี้ย/ผลตอบแทน') return { aliases: ['ดอกเบี้ย', 'ปันผล', 'dividend', 'interest', 'ผลตอบแทน'], iconHint: icon || 'trendingup' };
  return { aliases: [name], iconHint: icon };
}

async function findBestUserCategoryMatch({ userId, noteText, preferredType }) {
  if (!userId) return null;
  const needle = normalizeThaiForMatch(noteText);
  if (!needle) return null;

  const safePreferredType = preferredType === 'income' || preferredType === 'expense' ? preferredType : '';
  const cats = await Category.find({
    userId,
    ...(safePreferredType ? { type: safePreferredType } : { type: { $in: ['income', 'expense'] } }),
  })
    .select({ _id: 1, name: 1, type: 1 })
    .lean()
    .catch(() => []);

  let best = null;
  let bestScore = 0;
  for (const c of cats || []) {
    const name = String(c?.name || '').trim();
    if (!name) continue;
    const norm = normalizeThaiForMatch(name);
    if (!norm) continue;
    const hit = needle.includes(norm) || norm.includes(needle);
    if (!hit) continue;
    const score = norm.length;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

async function ensureUserCategory({ userId, type, name, icon }) {
  const safeType = type === 'income' ? 'income' : 'expense';
  const safeName = String(name || '').trim();
  if (!safeName) return null;
  const safeIcon = String(icon || '').trim() || 'other';

  const existing = await Category.findOne({ userId, type: safeType, name: safeName });
  if (existing) return existing;

  try {
    return await Category.create({
      userId,
      type: safeType,
      name: safeName,
      icon: safeIcon,
      isDefault: false,
    });
  } catch (e) {
    // Unique index race: try again
    const fallback = await Category.findOne({ userId, type: safeType, name: safeName });
    if (fallback) return fallback;
    throw e;
  }
}

function canAutoCreateInferredCategory({ type, name } = {}) {
  const safeType = type === 'income' ? 'income' : 'expense';
  const n = String(name || '').trim();
  if (!n || n === 'อื่นๆ') return false;

  const expenseAllowed = new Set([
    'อาหาร',
    'เครื่องดื่ม',
    'ช้อปปิ้ง',
    'เดินทาง',
    'ที่พัก/บ้าน',
    'บิล/สาธารณูปโภค',
    'สุขภาพ',
    'การศึกษา',
    'บันเทิง/ไลฟ์สไตล์',
    'หนี้/ผ่อน/ดอกเบี้ย',
    'ของขวัญ/ทำบุญ',
  ]);

  const incomeAllowed = new Set([
    'เงินสนับสนุน/ครอบครัว',
    'เงินเดือน/ประจำ',
    'งานเสริม/ฟรีแลนซ์',
    'ทุน/สวัสดิการ',
    'คืนเงิน/รีฟันด์',
    'ดอกเบี้ย/ผลตอบแทน',
  ]);

  return safeType === 'income' ? incomeAllowed.has(n) : expenseAllowed.has(n);
}

async function ensureOtherCategoryId({ userId, type } = {}) {
  if (!userId) return null;
  const safeType = type === 'income' ? 'income' : 'expense';
  const doc = await ensureUserCategory({ userId, type: safeType, name: 'อื่นๆ', icon: 'other' });
  return doc?._id || null;
}

async function suggestExistingCategoryIdWithAi({ userId, type, noteText } = {}) {
  try {
    if (!userId) return null;
    const safeType = type === 'income' ? 'income' : 'expense';
    const note = String(noteText || '').trim();
    if (!note) return null;

    // If the user has no categories (or only "อื่นๆ"), skip AI and fall back to "อื่นๆ".
    const cats = await Category.find({ userId, type: safeType })
      .select({ _id: 1, name: 1, icon: 1 })
      .limit(120)
      .lean()
      .catch(() => []);
    if (!Array.isArray(cats) || cats.length === 0) return null;

    const allowTransferCategory =
      safeType === 'expense' &&
      looksLikeTransferPayment(note) &&
      !looksLikeNonTransferExpense(note);
    const transferNames = new Set(['โอนเงิน/ชำระเงิน', 'โอนเงิน', 'ชำระเงิน', 'โอน']);
    const candidateCats = allowTransferCategory
      ? cats
      : cats.filter((c) => !transferNames.has(String(c?.name || '').trim()));
    if (!candidateCats.length) return null;

    const otherCat = candidateCats.find((c) => String(c?.name || '').trim() === 'อื่นๆ');
    const withoutOther = candidateCats.filter((c) => String(c?.name || '').trim() !== 'อื่นๆ');
    if (withoutOther.length === 0) return otherCat?._id || null;

    const pickedId = await suggestCategoryIdFromNote({
      language: 'th',
      type: safeType,
      noteText: note,
      categories: candidateCats,
    });
    if (!pickedId) return null;
    const match = candidateCats.find((c) => String(c?._id || '') === String(pickedId));
    // If AI picked something not in list or empty, fall back to "อื่นๆ".
    if (!match?._id) return otherCat?._id || null;
    return match._id;
  } catch {
    return null;
  }
}

async function fetchLineMessagingProfile(lineMessagingUserId, source) {
  if (!lineMessagingUserId) return null;

  // Try the simplest API first (works for 1:1 chat).
  try {
    ensureClient();
    return await client.getProfile(lineMessagingUserId);
  } catch {
    // fall through
  }

  // In group/room contexts, profile must be fetched with member-profile endpoints.
  const t = source && source.type;
  try {
    ensureClient();
    if (t === 'group' && source.groupId) {
      return await client.getGroupMemberProfile(source.groupId, lineMessagingUserId);
    }
    if (t === 'room' && source.roomId) {
      return await client.getRoomMemberProfile(source.roomId, lineMessagingUserId);
    }
  } catch {
    // ignore
  }

  return null;
}

async function resolveMessagingUser(lineMessagingUserId, source) {
  if (!lineMessagingUserId) return { user: null };

  const [userByMessagingId, userByLegacyLineId] = await Promise.all([
    findUserByMessagingIdOrAlias(lineMessagingUserId),
    // Backwards compat: some installs may have stored messaging userId in lineUserId
    User.findOne({ lineUserId: lineMessagingUserId }),
  ]);

  // Deterministic unify: for LIFF/LINE Login, the userId is often the same string (starts with "U...").
  // If we have both a Messaging user and an OAuth user (lineUserId) for the same id, merge into one record
  // so transactions show up consistently across LINE chat and web.
  if (userByMessagingId && userByLegacyLineId && String(userByMessagingId._id) !== String(userByLegacyLineId._id)) {
    try {
      const [mTx, mCat, mBud, oTx, oCat, oBud] = await Promise.all([
        Transaction.countDocuments({ userId: userByMessagingId._id }).catch(() => 0),
        Category.countDocuments({ userId: userByMessagingId._id }).catch(() => 0),
        Budget.countDocuments({ userId: userByMessagingId._id }).catch(() => 0),
        Transaction.countDocuments({ userId: userByLegacyLineId._id }).catch(() => 0),
        Category.countDocuments({ userId: userByLegacyLineId._id }).catch(() => 0),
        Budget.countDocuments({ userId: userByLegacyLineId._id }).catch(() => 0),
      ]);

      const messagingScore = (Number(mTx) || 0) + (Number(mCat) || 0) + (Number(mBud) || 0);
      const oauthScore = (Number(oTx) || 0) + (Number(oCat) || 0) + (Number(oBud) || 0);

      // Prefer keeping the record that already has user data (transactions/categories/budgets).
      const toUser = messagingScore >= oauthScore ? userByMessagingId : userByLegacyLineId;
      const fromUser = toUser === userByMessagingId ? userByLegacyLineId : userByMessagingId;

      const fromEmail = String(fromUser?.email || '');
      const safeToDelete =
        !fromUser?.password &&
        (fromEmail.endsWith('@local') || fromEmail.endsWith('@line.local') || /^line_/i.test(fromEmail) || /^line_msg_/i.test(fromEmail));

      await mergeUsers({ fromUserId: fromUser._id, toUserId: toUser._id, deleteSource: safeToDelete });
      const unified = await User.findById(toUser._id);
      return { user: unified || toUser, userByMessagingId, userByLegacyLineId };
    } catch (e) {
      console.error('resolveMessagingUser deterministic unify failed', e);
      // fall through to best-effort behavior
    }
  }

  // If we found a legacy record that stored Messaging userId in `lineUserId`,
  // migrate it to the correct field so future lookups are consistent.
  if (!userByMessagingId && userByLegacyLineId && !userByLegacyLineId.lineMessagingUserId) {
    try {
      userByLegacyLineId.lineMessagingUserId = String(lineMessagingUserId);
      const email = String(userByLegacyLineId.email || '');
      // If this looks like a bot-created placeholder account, detach legacy `lineUserId`
      // to avoid confusing it with LINE Login (OAuth) ids.
      if (
        String(userByLegacyLineId.lineUserId || '') === String(lineMessagingUserId) &&
        email &&
        !email.endsWith('@line.local') &&
        (/^line_/i.test(email) || /^line_msg_/i.test(email))
      ) {
        userByLegacyLineId.lineUserId = undefined;
      }
      await userByLegacyLineId.save();
    } catch (e) {
      // ignore migration errors
    }
  }

  let user = userByMessagingId || userByLegacyLineId;

  if (!user) {
    let profile = null;
    try {
      profile = await fetchLineMessagingProfile(lineMessagingUserId, source);
    } catch (e) {
      // profile fetch may fail if CHANNEL_TOKEN not configured or permission denied - continue
    }

    try {
      user = await findUserByMessagingIdOrAlias(lineMessagingUserId);
      if (!user) {
        // If we have a profile hint, try to attach this messaging id as an alias of an existing user
        // (prevents duplicates when LIFF and bot return different `userId` values).
        const hintName = String(profile?.displayName || '').trim();
        if (hintName) {
          const since = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
          const candidates = await User.find({
            name: hintName,
            lineMessagingUserId: { $exists: true, $ne: '' },
            createdAt: { $gte: since },
          }).sort({ createdAt: -1 }).limit(10);

          const scored = await Promise.all((candidates || []).map(async (u) => {
            const [t, c, b] = await Promise.all([
              Transaction.countDocuments({ userId: u._id }).catch(() => 0),
              Category.countDocuments({ userId: u._id }).catch(() => 0),
              Budget.countDocuments({ userId: u._id }).catch(() => 0),
            ]);
            const score = (Number(t) || 0) + (Number(c) || 0) + (Number(b) || 0);
            return { u, score };
          }));

          // Prefer exactly one candidate that already has user data.
          const withData = scored.filter((s) => s.score > 0);
          let pick = withData.length === 1 ? withData[0].u : null;

          // If no data exists yet, only pick when the choice is unambiguous AND very recent placeholder.
          if (!pick && scored.length === 1) {
            const only = scored[0].u;
            if (looksLikePlaceholderUser(only) && isVeryRecent(only, 10 * 60 * 1000)) pick = only;
          }

          if (pick) {
            await ensureMessagingAlias({ aliasId: String(lineMessagingUserId), userId: pick._id, source: 'heuristic' }).catch(() => {});
            return { user: pick, userByMessagingId: pick, userByLegacyLineId };
          }
        }

        const placeholderEmail = `line_msg_${lineMessagingUserId}@local`;
        try {
          user = await User.create({
            lineMessagingUserId: String(lineMessagingUserId),
            name: (profile && profile.displayName) ? profile.displayName : '',
            profilePic: (profile && profile.pictureUrl) ? profile.pictureUrl : '',
            email: placeholderEmail
          });
        } catch (createErr) {
          if (createErr && createErr.code === 11000) {
            // race: another process created a user with the same placeholder or a null-email collision
            user = await User.findOne({ lineMessagingUserId });
          } else {
            console.error('Failed to create user', createErr);
            throw createErr;
          }
        }
      }
    } catch (finalErr) {
      console.error('user creation/upsert final error', finalErr);
      throw finalErr;
    }
  }

  // Best-effort: if we created (or found) a placeholder without displayName/profilePic,
  // update it when the profile is available later (e.g., after adding the bot, or in 1:1 chat).
  try {
    const needName = !String(user?.name || '').trim();
    const needPic = !String(user?.profilePic || '').trim();
    if (user && (needName || needPic)) {
      const profile = await fetchLineMessagingProfile(lineMessagingUserId, source);
      let updated = false;
      if (needName && profile?.displayName) { user.name = profile.displayName; updated = true; }
      if (needPic && profile?.pictureUrl) { user.profilePic = profile.pictureUrl; updated = true; }
      if (updated) {
        await user.save().catch(() => {});
      }
    }
  } catch {
    // ignore
  }

  // Auto-unify: if a web OAuth user was created first (lineUserId exists) and the bot user
  // was created shortly after (lineMessagingUserId exists), try to merge the "empty" OAuth users
  // into the messaging user.
  //
  // We can’t deterministically map lineUserId <-> lineMessagingUserId, so we only merge candidates
  // that look like fresh LINE-login-only accounts and have no user data yet.
  try {
    const messagingName = String(user?.name || '').trim();
    const hasLineUserIdAlready = Boolean(String(user?.lineUserId || '').trim());
    if (messagingName && !hasLineUserIdAlready) {
      const since = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
      const candidates = await User.find({
        name: messagingName,
        lineUserId: { $exists: true, $ne: '' },
        lineMessagingUserId: { $exists: false },
        password: { $in: ['', null] },
        email: { $regex: /@line\.local$/i },
        createdAt: { $gte: since },
      }).sort({ createdAt: -1 }).limit(10);

      for (const oauthUser of candidates) {
        if (!oauthUser?._id || String(oauthUser._id) === String(user?._id)) continue;

        const [txCount, catCount, budCount] = await Promise.all([
          Transaction.countDocuments({ userId: oauthUser._id }).catch(() => 0),
          Category.countDocuments({ userId: oauthUser._id }).catch(() => 0),
          Budget.countDocuments({ userId: oauthUser._id }).catch(() => 0),
        ]);
        const hasAnyData = (Number(txCount) + Number(catCount) + Number(budCount)) > 0;

        // Only merge if the OAuth user is empty to avoid accidental merges.
        if (!hasAnyData) {
          await mergeUsers({ fromUserId: oauthUser._id, toUserId: user._id, deleteSource: true });
          user = await User.findById(user._id) || user;
        }
      }
    }
  } catch (e) {
    console.warn('LINE auto-unify oauth->messaging skipped:', e?.message || e);
  }

  return { user, userByMessagingId, userByLegacyLineId };
}

async function handleTextEvent(event) {
  const rawText = (event.message && event.message.text) ? event.message.text : '';
  // normalize: remove invisible/zero-width characters and soft-hyphens, then trim
  const text = rawText.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').trim();
  const parsed = parseTransactionText(text);
  const lineMessagingUserId = event.source && event.source.userId;

  // Diagnostic logging to help debug why some inputs fall through to unknown
  try {
    // Log a compact representation of the event for debugging real webhook payloads
    try {
      const shortEvent = {
        type: event.type,
        messageType: event.message && event.message.type,
        messageText: event.message && event.message.text,
        userId: event.source && event.source.userId,
        replyToken: event.replyToken ? 'present' : 'missing'
      };
      console.log('LINE full event:', JSON.stringify(shortEvent));
    } catch (e) {
      // continue
    }
    console.log('LINE incoming rawText:', rawText);
    console.log('LINE cleaned text:', text);
    console.log('LINE parsed:', parsed);
    console.log('LINE event.userId:', lineMessagingUserId, 'replyToken:', event.replyToken ? 'present' : 'missing');
  } catch (e) {
    // ignore logging errors
  }

  // Quick-note UI: only when user explicitly triggers the command (e.g., "จด", "จดรายการ")
  if (parsed && parsed.command === 'quick_note') {
    return sendReply(event.replyToken, buildQuickNoteFlexMessage());
  }

  // If user types 'ประกาศ', send a quick-reply URI that opens the LINE profile when tapped.
  // NOTE: the server cannot force the client to open a link automatically — user must tap the quick-reply button.
  const isAnnounce = /^\s*ประกาศ\s*$/i.test(text);
  if (isAnnounce) {
    // Do not send any message bubble. Use the rich menu "ประกาศ" (URI action) to open the VOOM/profile link.
    return null;
  }

  if (!lineMessagingUserId) {
    // cannot map to user
    return sendReply(event.replyToken, { type: 'text', text: 'ไม่พบ userId จาก LINE' });
  }

  const { user, userByMessagingId, userByLegacyLineId } = await resolveMessagingUser(lineMessagingUserId, event.source);

  console.log('LINE resolved user mapping:', {
    lineMessagingUserId: String(lineMessagingUserId || ''),
    userByMessagingId: userByMessagingId ? String(userByMessagingId._id) : null,
    userByLegacyLineId: userByLegacyLineId ? String(userByLegacyLineId._id) : null,
    selectedUserId: user ? String(user._id) : null,
    selectedEmail: user?.email || null,
  });

  // Quick debug command: show which backend user this LINE account maps to.
  const isWhoAmI = /^\s*(whoami|บัญชี|account)\s*$/i.test(text);
  if (isWhoAmI) {
    return sendReply(event.replyToken, {
      type: 'text',
      text: `บัญชีที่ผูกกับแชท LINE นี้\nuserId: ${String(user?._id || '-')}\nemail: ${String(user?.email || '-')}\nlineMessagingUserId: ${String(lineMessagingUserId || '-')}`,
    });
  }

  // Link flow: generate short code to connect this LINE chat to the current web account.
  const isLink = /^\s*(เชื่อมบัญชี|เชื่อมเว็บ|link)\s*$/i.test(text);
  if (isLink) {
    const code = createLinkCode();
    const codeHash = hashLinkCode(code);
    const expiresAt = new Date(Date.now() + LINK_TTL_MS);
    try {
      await LineMessagingLinkSession.create({ codeHash, lineMessagingUserId: String(lineMessagingUserId), expiresAt });
    } catch (e) {
      console.error('LineMessagingLinkSession create failed', e);
      return sendReply(event.replyToken, { type: 'text', text: 'ขออภัย ระบบสร้างโค้ดเชื่อมบัญชีไม่สำเร็จ ลองใหม่อีกครั้ง' });
    }

    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const linkUrl = `${frontend}/profile?linkCode=${encodeURIComponent(code)}`;
    return sendReply(event.replyToken, {
      type: 'text',
      text: `โค้ดเชื่อมบัญชี: ${code} (หมดอายุ 10 นาที)\n\nเปิดเว็บแล้วกดลิงก์นี้เพื่อเชื่อมอัตโนมัติ:\n${linkUrl}\n\nหรือไปหน้าโปรไฟล์แล้วกรอกโค้ดนี้ก็ได้`,
    });
  }

  // Send a one-tap link to open the web dashboard as the same LINE user
  // (useful when the user is logged in on the web with a different account).
  const isWebLogin = /^\s*(เข้าเว็บ|เว็บ|dashboard|login)\s*$/i.test(text);
  if (isWebLogin) {
    const backendBase = process.env.BACKEND_URL || 'http://localhost:5050';
    const rawToken = createSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    try {
      await LineLoginSession.create({
        tokenHash,
        userId: user._id,
        lineUserId: String(lineMessagingUserId),
        expiresAt,
      });
    } catch (e) {
      console.error('LineLoginSession create failed', e);
      return sendReply(event.replyToken, { type: 'text', text: 'ขออภัย ระบบสร้างลิงก์เข้าเว็บไม่สำเร็จ ลองใหม่อีกครั้ง' });
    }

    const redirectUrl = `${backendBase}/webhooks/line/session-login?token=${encodeURIComponent(rawToken)}`;
    return sendReply(event.replyToken, {
      type: 'template',
      altText: 'เข้าเว็บ (ลิงก์หมดอายุใน 10 นาที)',
      template: {
        type: 'buttons',
        text: 'เข้าเว็บด้วยบัญชีเดียวกับ LINE (ลิงก์หมดอายุใน 10 นาที)',
        actions: [{ type: 'uri', label: 'เข้าเว็บเลย', uri: redirectUrl }],
      },
    });
  }

  // One-tap deep links (auto login -> jump to specific page)
  const isOpenBudget = /^\s*(งบ|งบประมาณ|budget)\s*$/i.test(text);
  const isOpenCategories = /^\s*(หมวด|หมวดหมู่|category|categories)\s*$/i.test(text);
  const deepLinkNext = (isOpenBudget || isOpenCategories) ? '/budget' : '';
  if (deepLinkNext) {
    const backendBase = process.env.BACKEND_URL || 'http://localhost:5050';
    const rawToken = createSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    try {
      await LineLoginSession.create({
        tokenHash,
        userId: user._id,
        lineUserId: String(lineMessagingUserId),
        expiresAt,
      });
    } catch (e) {
      console.error('LineLoginSession create failed', e);
      return sendReply(event.replyToken, { type: 'text', text: 'ขออภัย ระบบสร้างลิงก์เข้าเว็บไม่สำเร็จ ลองใหม่อีกครั้ง' });
    }

    const redirectUrl = `${backendBase}/webhooks/line/session-login?token=${encodeURIComponent(rawToken)}&next=${encodeURIComponent(deepLinkNext)}`;
    const label = isOpenBudget ? 'งบประมาณ/หมวดงบ' : 'หมวด/งบประมาณ';
    return sendReply(event.replyToken, {
      type: 'template',
      altText: `เปิดหน้า${label} (ลิงก์หมดอายุใน 10 นาที)`,
      template: {
        type: 'buttons',
        text: `เปิดหน้า${label}ในเว็บทันที (ลิงก์หมดอายุใน 10 นาที)`,
        actions: [{ type: 'uri', label: 'เปิดเลย', uri: redirectUrl }],
      },
    });
  }

  if (parsed.command === 'help') {
    const helpText = [
      'คำสั่งตัวอย่าง:',
      '- จ่าย 120 ข้าวมันไก่',
      '- รับ 500 เงินลูกค้า',
      '',
      'ถามสถานะการเงิน:',
      '- วันนี้ใช้ไปเท่าไหร่',
      '- ยอดเดือนนี้',
      '- เมื่อวานใช้ไปเท่าไหร่',
      '- เดือนนี้ใช้ไปเท่าไหร่',
      '- ยอดคงเหลือเดือนนี้เท่าไหร่',
      '- ยอดคงเหลือ มีนาคม 2569',
      '',
      'บันทึกย้อนหลังได้:',
      '- เมื่อวาน จ่าย 50 กาแฟ',
      '- ย้อนหลัง 3 วัน รับ 2000 เงินลูกค้า',
      '- 01/03/2569 จ่าย 120 อาหาร',
      '- 2026-03-01 20:30 จ่าย 120 อาหาร',
      '',
      'สรุป:',
      '- สรุปวันนี้',
      '- สรุปเดือนนี้',
      '',
      'เปิดหน้าในเว็บ:',
      '- งบ',
      '- หมวด',
      '- export',
    ].join('\n');
    return sendReply(event.replyToken, { type: 'text', text: helpText });
  }

  const buildPeriodStatusReply = async ({ range, label, monthLabelForBudget, includeAiSummary, aiDateLabel } = {}) => {
    if (!range?.start || !range?.end) return { type: 'text', text: 'ขออภัย ผมหาช่วงวันที่ไม่เจอ' };

    const txAgg = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          datetime: { $gte: range.start, $lt: range.end },
        },
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]).catch(() => []);

    const income = (txAgg || []).find((r) => r?._id === 'income')?.total || 0;
    const expense = (txAgg || []).find((r) => r?._id === 'expense')?.total || 0;
    const txCount = (txAgg || []).reduce((s, r) => s + (Number(r?.count) || 0), 0);
    const remaining = (Number(income) || 0) - (Number(expense) || 0);

    const topExpenses = await getTopExpenseCategories({ userId: user._id, range, limit: 3 });

    let budgetTotal = null;
    let budgetRemaining = null;
    if (monthLabelForBudget) {
      budgetTotal = await getMonthBudgetTotal({ userId: user._id, monthLabel: monthLabelForBudget });
      if (Number.isFinite(Number(budgetTotal))) budgetRemaining = (Number(budgetTotal) || 0) - (Number(expense) || 0);
    }

    let aiSummary = '';
    if (includeAiSummary) {
      try {
        const dateLabel = String(aiDateLabel || label || '').trim() || formatThaiDate(range.start) || 'วันนี้';
        aiSummary = await summarizeFinanceDay({
          language: 'th',
          dateLabel,
          income,
          expense,
          remaining,
          txCount,
          topExpenses,
        });
      } catch (e) {
        aiSummary = `AI ยังไม่พร้อม: ${buildAiUserErrorMessage(e)}`;
      }
    }

    return buildFinanceStatusFlexMessage({
      label,
      range,
      income,
      expense,
      remaining,
      txCount,
      topExpenses,
      budgetTotal,
      budgetRemaining,
      aiSummary,
    });
  };

  if (parsed.command === 'status_day') {
    const when = parsed?.when instanceof Date && !Number.isNaN(parsed.when.getTime()) ? parsed.when : new Date();
    const range = getBangkokDayRange(when);
    const msgBare = normalizeThaiCommand(String(event?.message?.text || '')).toLowerCase();
    const labelBase = /เมื่อวาน/i.test(msgBare)
      ? 'เมื่อวาน'
      : 'วันนี้';
    const label = `ยอด${labelBase}`;
    return sendReply(event.replyToken, await buildPeriodStatusReply({ range, label, includeAiSummary: true, aiDateLabel: label }));
  }

  if (parsed.command === 'status_month') {
    const spec = parseMonthSpecifierFromText(parsed?.monthText || event?.message?.text || '');
    let range = null;
    let label = 'เดือนนี้';
    let budgetMonthLabel = null;

    if (spec?.kind === 'absolute') {
      const d = new Date(`${spec.year}-${String(spec.monthIndex + 1).padStart(2, '0')}-01T12:00:00+07:00`);
      range = getBangkokMonthRange(d);
      label = `${MONTH_NAMES_TH[spec.monthIndex] || ''} ${spec.year + 543}`;
      budgetMonthLabel = label;
    } else {
      const offset = spec?.kind === 'relative' ? (Number(spec.offset) || 0) : 0;
      const now = new Date();
      const bangkokMs = now.getTime() + 7 * 60 * 60 * 1000;
      const bd = new Date(bangkokMs);
      const year = bd.getUTCFullYear();
      const month = bd.getUTCMonth() + offset;
      const pivot = new Date(Date.UTC(year, month, 15, 12, 0, 0, 0) - 7 * 60 * 60 * 1000);
      range = getBangkokMonthRange(pivot);
      const b2 = new Date(pivot.getTime() + 7 * 60 * 60 * 1000);
      const y2 = b2.getUTCFullYear();
      const m2 = b2.getUTCMonth();
      const ymLabel = `${MONTH_NAMES_TH[m2] || ''} ${y2 + 543}`;
      label = offset === -1 ? `เดือนที่แล้ว (${ymLabel})` : offset === 1 ? `เดือนหน้า (${ymLabel})` : ymLabel;
      budgetMonthLabel = ymLabel;
    }

    const labelWithTotal = String(label || '').startsWith('ยอด') ? String(label) : `ยอด${label}`;
    return sendReply(
      event.replyToken,
      await buildPeriodStatusReply({
        range,
        label: labelWithTotal,
        monthLabelForBudget: budgetMonthLabel,
        includeAiSummary: true,
        aiDateLabel: labelWithTotal,
      })
    );
  }

  if (parsed.command === 'export') {
    // create a log entry and reply (actual file generation can be implemented separately)
    await ImportExportLog.create({ userId: user._id, type: 'export', status: 'done', range: 'auto', meta: { triggerText: text } });
    return sendReply(event.replyToken, { type: 'text', text: 'กำลังสร้างไฟล์ export ให้ คุณจะได้รับลิงก์เมื่อพร้อม (feature ระยะถัดไป)' });
  }

  if (parsed.type && parsed.amount) {
    console.log('Parsed transaction:', parsed);
    console.log('LINE will save transaction for user _id:', String(user?._id || ''), 'lineMessagingUserId:', String(lineMessagingUserId || ''));
    // ensure we save note into the same field existing docs use (`notes`) and keep `note` for compatibility
    const notesText = parsed.note || parsed.notes || '';
    // auto-categorize from note keywords (create category if missing)
    let categoryId = null;
    // 1) Prefer matching an existing user-defined category name (works for custom income categories)
    try {
      const preferredType = parsed?.typeExplicit ? parsed.type : '';
      const matched = await findBestUserCategoryMatch({ userId: user._id, noteText: notesText, preferredType });
      if (matched?._id) {
        categoryId = matched._id;
        // Only override the parsed type when the user didn't explicitly say "จ่าย/รับ".
        if (!parsed?.typeExplicit && (matched?.type === 'income' || matched?.type === 'expense')) parsed.type = matched.type;
      }
    } catch (e) {
      console.warn('LINE category name match failed:', e?.message || e);
    }

    // 2) Otherwise, auto-categorize from keywords
    try {
      if (!categoryId) {
        const cat = classifyCategoryFromNote(notesText, parsed.type);
        if (cat && cat.name) {
          const { aliases, iconHint } = aliasesForInferredCategory(cat);
          categoryId = await findUserCategoryIdByAliases({ userId: user._id, type: parsed.type, aliases, iconHint });

          // If the user has no categories yet (or only "อื่นๆ"), auto-create a sensible inferred category.
          // This makes the first LINE message feel correct without manual setup.
          if (!categoryId && canAutoCreateInferredCategory({ type: parsed.type, name: cat?.name })) {
            const existing = await Category.find({ userId: user._id, type: parsed.type })
              .select({ name: 1 })
              .limit(80)
              .lean()
              .catch(() => []);
            const nonOtherCount = (existing || []).filter((c) => String(c?.name || '').trim() && String(c?.name || '').trim() !== 'อื่นๆ').length;
            if (nonOtherCount === 0) {
              const created = await ensureUserCategory({
                userId: user._id,
                type: parsed.type,
                name: String(cat?.name || '').trim(),
                icon: iconHint || String(cat?.icon || '').trim() || 'other',
              });
              if (created?._id) categoryId = created._id;
            }
          }
        }
      }
    } catch (e) {
      console.warn('LINE auto-categorize failed:', e?.message || e);
    }

    // 2.5) If still unknown: ask AI to pick from existing categories (no auto-create).
    try {
      if (!categoryId && String(notesText || '').trim()) {
        const aiId = await suggestExistingCategoryIdWithAi({ userId: user._id, type: parsed.type, noteText: notesText });
        if (aiId) categoryId = aiId;
      }
    } catch {
      // ignore
    }

    // 3) Fallback: always map to "อื่นๆ" instead of leaving category blank (uncategorized)
    try {
      if (!categoryId) {
        categoryId = await ensureOtherCategoryId({ userId: user._id, type: parsed.type });
      }
    } catch (e) {
      console.warn('LINE other-category fallback failed:', e?.message || e);
    }
    // save transaction
    const txWhen = parsed?.when instanceof Date && !Number.isNaN(parsed.when.getTime()) ? parsed.when : new Date();
    const tx = new Transaction({
      userId: user._id,
      type: parsed.type,
      amount: parsed.amount,
      notes: notesText,
      note: notesText,
      categoryId,
      datetime: txWhen,
      source: 'text',
      rawMessage: event
    });
    await tx.save();
    let categoryName = '';
    let categoryIcon = '';
    try {
      if (categoryId) {
        const catDoc = await Category.findById(categoryId).select('name icon').lean();
        categoryName = String(catDoc?.name || '').trim();
        categoryIcon = String(catDoc?.icon || '').trim();
      }
    } catch {
      // ignore
    }
    if (!categoryName) categoryName = 'อื่นๆ';
    if (!categoryIcon) categoryIcon = 'other';

		    const flexMessage = buildRecordedSuccessFlexMessage({
		      txId: tx?._id,
		      type: parsed.type,
		      amount: parsed.amount,
		      categoryTotal: await sumCategoryTotalForMonth({ userId: user._id, categoryId, type: parsed.type, when: tx?.datetime || txWhen }),
		      note: notesText,
		      categoryName,
		      categoryIcon,
		      when: tx?.datetime || txWhen,
		      sourceLabel: 'ข้อความ',
		    });

    return sendReply(event.replyToken, flexMessage);
  }

  // unknown
  return sendReply(event.replyToken, { type: 'text', text: 'ขอโทษครับ ผมไม่เข้าใจคำสั่ง พิมพ์ help เพื่อดูคำสั่งตัวอย่าง' });
}

function bufferFromStream(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

function guessAudioExt(contentType) {
  const t = String(contentType || '').toLowerCase();
  if (t.includes('mpeg')) return '.mp3';
  if (t.includes('wav')) return '.wav';
  if (t.includes('ogg')) return '.ogg';
  if (t.includes('opus')) return '.opus';
  if (t.includes('m4a')) return '.m4a';
  if (t.includes('mp4')) return '.m4a';
  if (t.includes('aac')) return '.aac';
  return '.m4a';
}

function parseSlipDateTimeToDate({ date, time } = {}) {
  const d = String(date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const t = String(time || '').trim();
  const hhmm = /^\d{2}:\d{2}$/.test(t) ? t : '00:00';
  const dt = new Date(`${d}T${hhmm}:00.000+07:00`);
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

async function handleImageEvent(event) {
  const lineMessagingUserId = event.source && event.source.userId;
  const pushTargetId = getPushTargetId(event.source);
  const messageId = event.message && event.message.id;
  if (!lineMessagingUserId || !pushTargetId || !messageId) {
    return sendReply(event.replyToken, { type: 'text', text: 'อ่านรูปไม่สำเร็จ (missing user/message id)' });
  }

  // Ack quickly, then OCR + save transaction asynchronously (replyToken can be used only once).
  await sendReply(event.replyToken, { type: 'text', text: 'รับรูปแล้วครับ จิ๋วกำลังอ่านสลิปให้ พี่รอสักครูนะค๊าบบ..' });

  (async () => {
    try {
      ensureClient();
      const { user } = await resolveMessagingUser(lineMessagingUserId, event.source);
      if (!user) {
        await pushToUser(pushTargetId, { type: 'text', text: 'ไม่พบบัญชีผู้ใช้ของคุณ' });
        return;
      }

      const resp = await client.getMessageContent(messageId);
      // SDKs differ: sometimes returns a stream, sometimes { data, headers }.
      const stream = (resp && typeof resp.on === 'function')
        ? resp
        : (resp && resp.data && typeof resp.data.on === 'function')
          ? resp.data
          : null;
      if (!stream) {
        throw new Error('Unsupported getMessageContent response');
      }

      const contentType = (resp && resp.headers && (resp.headers['content-type'] || resp.headers['Content-Type'])) || '';
      const buf = await bufferFromStream(stream);
      const debugParse = String(process.env.LINE_IMAGE_DEBUG || '0') === '1';

      const parsed = await parseSlipImageBuffer({ buffer: buf, mimeType: contentType || 'image/jpeg' });
      const aiAmount = parsed?.amount;
      if (!(Number(aiAmount) > 0)) {
        await pushToUser(pushTargetId, { type: 'text', text: 'AI อ่านรูปได้ แต่ยังจับ “ยอดเงิน” ไม่เจอ ลองส่งรูปที่ชัดขึ้น/เต็มใบอีกครั้ง' });
        return;
      }

      const direction = String(parsed?.direction || 'unknown');
      const type = direction === 'in' ? 'income' : direction === 'out' ? 'expense' : 'expense';
      const whenFromSlip = parseSlipDateTimeToDate({ date: parsed?.date, time: parsed?.time });

      let note = String(parsed?.notes || '').trim() || 'สลิปโอนเงิน';
      // If notes contain generic status words + a memo, move the memo to the front.
      // This improves auto-categorization (e.g. "ค่าของใช้ส่วนตัว ยาสระผม").
      if (/โอนเงินสำเร็จ/i.test(note) && note.length > 16) {
        const cleaned = note.replace(/โอนเงินสำเร็จ/gi, '').replace(/[•\-\|]+/g, ' ').replace(/\s+/g, ' ').trim();
        if (cleaned) note = cleaned;
      }
      const sender = String(parsed?.sender_name || '').trim();
      const recipient = String(parsed?.recipient_name || '').trim();
      const ref = String(parsed?.reference || '').trim();
      const noteBits = [
        note,
        sender ? `ผู้โอน: ${sender}` : null,
        recipient ? `ผู้รับ: ${recipient}` : null,
        ref ? `อ้างอิง: ${ref}` : null,
      ].filter(Boolean);
      note = noteBits.join(' • ').slice(0, 280);

      let categoryId = null;
      try {
        const cat = classifyCategoryFromNote(note, type);
        if (cat && cat.name) {
          // Do NOT auto-create categories from LINE messages.
          // If the category doesn't exist, fall back to "อื่นๆ".
          const { aliases, iconHint } = aliasesForInferredCategory(cat);
          categoryId = await findUserCategoryIdByAliases({ userId: user._id, type, aliases, iconHint });
        }
      } catch (e) {
        console.warn('LINE slip AI auto-categorize failed:', e?.message || e);
      }

      // If still unknown: ask AI to pick from existing categories.
      try {
        if (!categoryId && String(note || '').trim()) {
          const aiId = await suggestExistingCategoryIdWithAi({ userId: user._id, type, noteText: note });
          if (aiId) categoryId = aiId;
        }
      } catch {
        // ignore
      }

      try {
        if (!categoryId) {
          const catName = type === 'income' ? 'รับโอน/เงินเข้า' : 'โอนเงิน/ชำระเงิน';
          // Only use this fallback if the note looks like a transfer/payment.
          if (looksLikeTransferPayment(note) && !looksLikeNonTransferExpense(note)) {
            const doc = await Category.findOne({ userId: user._id, type, name: String(catName).trim() })
              .select({ _id: 1 })
              .lean();
            categoryId = doc?._id || null;
          }
        }
      } catch (e) {
        console.warn('LINE slip AI category create failed:', e?.message || e);
      }

      try {
        if (!categoryId) {
          categoryId = await ensureOtherCategoryId({ userId: user._id, type });
        }
      } catch (e) {
        console.warn('LINE slip AI other-category fallback failed:', e?.message || e);
      }

      const tx = new Transaction({
        userId: user._id,
        type,
        amount: Number(aiAmount),
        notes: note,
        note,
        categoryId,
        datetime: whenFromSlip || new Date(),
        source: 'slip_ai',
        rawMessage: { event, parsed },
      });
      await tx.save();

      let categoryName = '';
      let categoryIcon = '';
      try {
        if (categoryId) {
          const catDoc = await Category.findById(categoryId).select('name icon').lean();
          categoryName = String(catDoc?.name || '').trim();
          categoryIcon = String(catDoc?.icon || '').trim();
        }
      } catch {
        // ignore
      }
      if (!categoryName) categoryName = 'อื่นๆ';
      if (!categoryIcon) categoryIcon = 'other';

	      const flexMessage = buildRecordedSuccessFlexMessage({
	        txId: tx?._id,
	        type,
	        amount: Number(aiAmount),
	        categoryTotal: await sumCategoryTotalForMonth({ userId: user._id, categoryId, type, when: tx?.datetime || new Date() }),
	        note,
	        categoryName,
	        categoryIcon,
	        when: tx?.datetime || new Date(),
	        sourceLabel: 'รูปภาพ (AI)',
	      });

      await pushToUser(pushTargetId, flexMessage);
      if (debugParse) {
        await pushToUser(pushTargetId, {
          type: 'text',
          text: `DEBUG(AI)\namount=${aiAmount} date=${parsed?.date || '-'} time=${parsed?.time || '-'} dir=${direction}`,
        });
      }
    } catch (e) {
      console.error('handleImageEvent error', e);
      const msg = buildAiUserErrorMessage(e);
      await pushToUser(pushTargetId, { type: 'text', text: `ขออภัย AI อ่านรูปไม่สำเร็จ: ${msg}\nแนะนำ: รูปชัด/ไม่เอียง/เต็มใบ` });
    }
  })();
}

async function handleAudioEvent(event) {
  const lineMessagingUserId = event.source && event.source.userId;
  const pushTargetId = getPushTargetId(event.source);
  const messageId = event.message && event.message.id;
  if (!lineMessagingUserId || !pushTargetId || !messageId) {
    return sendReply(event.replyToken, { type: 'text', text: 'ถอดเสียงไม่สำเร็จ (missing user/message id)' });
  }

  // Ack quickly, then transcribe + save transaction asynchronously.
  (async () => {
    try {
      ensureClient();
      const { user } = await resolveMessagingUser(lineMessagingUserId, event.source);
      if (!user) {
        await pushToUser(pushTargetId, { type: 'text', text: 'ไม่พบบัญชีผู้ใช้ของคุณ' });
        return;
      }

      const resp = await client.getMessageContent(messageId);
      const stream = (resp && typeof resp.on === 'function')
        ? resp
        : (resp && resp.data && typeof resp.data.on === 'function')
          ? resp.data
          : null;
      if (!stream) throw new Error('Unsupported getMessageContent response');

      const contentType = (resp && resp.headers && (resp.headers['content-type'] || resp.headers['Content-Type'])) || '';
      const ext = guessAudioExt(contentType);

      const uploadDir = path.join(__dirname, '../uploads/line/audio');
      try { fs.mkdirSync(uploadDir, { recursive: true }); } catch {}
      const fileName = `line-audio-${Date.now()}-${messageId}${ext}`;
      const filePath = path.join(uploadDir, fileName);

      const buf = await bufferFromStream(stream);
      fs.writeFileSync(filePath, buf);

      const keepAudio = String(process.env.KEEP_LINE_AUDIO || '1') !== '0';
      const backendBase = process.env.BACKEND_URL || 'http://localhost:5050';
      const audioUrl = `${backendBase}/uploads/line/audio/${encodeURIComponent(fileName)}`;
      const durationMs = Number(event?.message?.duration ?? 0) || 0;

      const tr = await transcribeAudioFile({ filePath, mimeType: contentType || 'audio/*', language: 'th' });
      if (!keepAudio) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }

      if (tr?.disabled) {
        const hint = tr?.hint ? `\nวิธีเปิดใช้งาน: ${String(tr.hint)}` : '';
        const msg = keepAudio
          ? `บันทึกเสียงไว้แล้ว แต่ยังถอดเสียงไม่ได้\nไฟล์เสียง: ${audioUrl}${hint}`
          : `ถอดเสียงยังไม่พร้อมใช้งาน${hint}`;
        await pushToUser(pushTargetId, { type: 'text', text: msg });
        return;
      }

      const transcript = String(tr?.text || '').trim();
      if (!transcript) {
        await pushToUser(pushTargetId, { type: 'text', text: 'ถอดเสียงไม่เจอข้อความ ลองอัดใหม่ให้ชัดขึ้นอีกนิดนะ' });
        return;
      }

      const parsed = parseTransactionText(transcript);
      if (!(parsed?.type && parsed?.amount)) {
        await pushToUser(pushTargetId, { type: 'text', text: `ผมได้ยินว่า: "${transcript}"\nแต่ยังจับ “จำนวนเงิน” ไม่ได้ ลองพูดแบบนี้:\n- จ่าย 100 ข้าวมันไก่\n- รับ 20000 เงินเดือน${extra}` });
        return;
      }

      const notesText = parsed.note || parsed.notes || transcript;

      let categoryId = null;
      try {
        const cat = classifyCategoryFromNote(notesText, parsed.type);
        if (cat && cat.name) {
          const { aliases, iconHint } = aliasesForInferredCategory(cat);
          categoryId = await findUserCategoryIdByAliases({ userId: user._id, type: parsed.type, aliases, iconHint });
        }
      } catch (e) {
        console.warn('VOICE auto-categorize failed:', e?.message || e);
      }

      // If still unknown: ask AI to pick from existing categories.
      try {
        if (!categoryId && String(notesText || '').trim()) {
          const aiId = await suggestExistingCategoryIdWithAi({ userId: user._id, type: parsed.type, noteText: notesText });
          if (aiId) categoryId = aiId;
        }
      } catch {
        // ignore
      }

      try {
        if (!categoryId) {
          categoryId = await ensureOtherCategoryId({ userId: user._id, type: parsed.type });
        }
      } catch (e) {
        console.warn('VOICE other-category fallback failed:', e?.message || e);
      }

      const txWhen = parsed?.when instanceof Date && !Number.isNaN(parsed.when.getTime()) ? parsed.when : new Date();
      const tx = new Transaction({
        userId: user._id,
        type: parsed.type,
        amount: parsed.amount,
        notes: notesText,
        note: notesText,
        categoryId,
        datetime: txWhen,
        source: 'voice',
        rawMessage: {
          event,
          transcript,
          stt: { provider: tr.provider, model: tr.model },
          audio: {
            url: keepAudio ? audioUrl : '',
            contentType: String(contentType || ''),
            durationMs,
          },
        },
      });
      await tx.save();
      let categoryName = '';
      let categoryIcon = '';
      try {
        if (categoryId) {
          const catDoc = await Category.findById(categoryId).select('name icon').lean();
          categoryName = String(catDoc?.name || '').trim();
          categoryIcon = String(catDoc?.icon || '').trim();
        }
      } catch {
        // ignore
      }
      if (!categoryName) categoryName = 'อื่นๆ';
      if (!categoryIcon) categoryIcon = 'other';

		      const flexMessage = buildRecordedSuccessFlexMessage({
		        txId: tx?._id,
		        type: parsed.type,
		        amount: parsed.amount,
		        categoryTotal: await sumCategoryTotalForMonth({ userId: user._id, categoryId, type: parsed.type, when: tx?.datetime || txWhen }),
		        note: notesText,
		        categoryName,
		        categoryIcon,
		        when: tx?.datetime || txWhen,
		        sourceLabel: 'เสียง (ถอดเสียง)',
		      });
      await pushToUser(pushTargetId, flexMessage);


    } catch (e) {
      console.error('handleAudioEvent error', e);
      await pushToUser(pushTargetId, { type: 'text', text: 'ขออภัย ถอดเสียงไม่สำเร็จ ลองใหม่อีกครั้ง' });
    }
  })();
}

// handle postback events (from richmenu postback actions)
async function handlePostbackEvent(event) {
  const lineMessagingUserId = event.source && event.source.userId;
  const data = event.postback && event.postback.data ? event.postback.data : '';
  console.log('LINE postback received', { userId: lineMessagingUserId, data });
  if (!lineMessagingUserId) return sendReply(event.replyToken, { type: 'text', text: 'ไม่พบ userId' });

  // if postback is a quick-note trigger, reply with the flex quick-note UI (no user message shown)
  try {
    const rawData = String(data || '');
    console.log('postback raw data:', rawData);
    const params = new URLSearchParams(rawData);
    const action = (params.get('action') || '').trim().toLowerCase();
    const isQuickNote = action === 'quick_note' || rawData.trim().toLowerCase() === 'action=quick_note' || rawData.toLowerCase().includes('action=quick_note');
    if (isQuickNote) {
      return sendReply(event.replyToken, buildQuickNoteFlexMessage());
    }
  } catch (e) {
    console.warn('postback quick_note parse error', e, 'data=', data);
  }
  // determine action value (robust parsing)
  let actionValue = '';
  try {
    const rawData2 = String(data || '');
    actionValue = (new URLSearchParams(rawData2).get('action') || '').trim().toLowerCase();
  } catch (e) {
    actionValue = String(data || '').trim().toLowerCase();
  }
  console.log('postback actionValue resolved:', actionValue);

  const { user } = await resolveMessagingUser(lineMessagingUserId, event.source);
  if (!user) return sendReply(event.replyToken, { type: 'text', text: 'ไม่พบบัญชีผู้ใช้ของคุณ' });

  // handle known postback actions
  // Be strict when detecting the dashboard action to avoid accidental substring matches
  if (actionValue === 'web_login' || actionValue === 'web' || actionValue === 'dashboard' || actionValue === 'open_dashboard' || actionValue === 'open-dashboard') {
    const backendBase = process.env.BACKEND_URL || 'http://localhost:5050';
    const rawToken = createSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    try {
      await LineLoginSession.create({
        tokenHash,
        userId: user._id,
        lineUserId: String(lineMessagingUserId),
        expiresAt,
      });
    } catch (e) {
      console.error('LineLoginSession create failed', e);
      return sendReply(event.replyToken, { type: 'text', text: 'ขออภัย ระบบสร้างลิงก์เข้าเว็บไม่สำเร็จ ลองใหม่อีกครั้ง' });
    }

    const redirectUrl = `${backendBase}/webhooks/line/session-login?token=${encodeURIComponent(rawToken)}`;
    return sendReply(event.replyToken, {
      type: 'template',
      altText: 'เข้าเว็บ (ลิงก์หมดอายุใน 10 นาที)',
      template: {
        type: 'buttons',
        text: 'เข้าเว็บ (ลิงก์หมดอายุใน 10 นาที)',
        actions: [{ type: 'uri', label: 'เข้าเว็บเลย', uri: redirectUrl }],
      },
    });
  }

  if (actionValue === 'budget' || actionValue === 'open_budget' || actionValue === 'categories' || actionValue === 'open_categories') {
    const backendBase = process.env.BACKEND_URL || 'http://localhost:5050';
    const rawToken = createSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    try {
      await LineLoginSession.create({
        tokenHash,
        userId: user._id,
        lineUserId: String(lineMessagingUserId),
        expiresAt,
      });
    } catch (e) {
      console.error('LineLoginSession create failed', e);
      return sendReply(event.replyToken, { type: 'text', text: 'ขออภัย ระบบสร้างลิงก์เข้าเว็บไม่สำเร็จ ลองใหม่อีกครั้ง' });
    }

    const redirectUrl = `${backendBase}/webhooks/line/session-login?token=${encodeURIComponent(rawToken)}&next=${encodeURIComponent('/budget')}`;
    return sendReply(event.replyToken, {
      type: 'template',
      altText: 'ไปหน้า งบประมาณ/หมวด (ลิงก์หมดอายุใน 10 นาที)',
      template: {
        type: 'buttons',
        text: 'ไปหน้า “งบประมาณ/หมวด” ในเว็บทันที (ลิงก์หมดอายุใน 10 นาที)',
        actions: [{ type: 'uri', label: 'เปิดเลย', uri: redirectUrl }],
      },
    });
  }

  if (actionValue === 'summary' || actionValue === 'summary_today') {
    const range = getBangkokDayRange(new Date());
    if (!range) return sendReply(event.replyToken, { type: 'text', text: 'ขออภัย ผมหาช่วงวันที่ไม่เจอ' });

    const txAgg = await Transaction.aggregate([
      { $match: { userId: user._id, datetime: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]).catch(() => []);

    const income = (txAgg || []).find((r) => r?._id === 'income')?.total || 0;
    const expense = (txAgg || []).find((r) => r?._id === 'expense')?.total || 0;
    const txCount = (txAgg || []).reduce((s, r) => s + (Number(r?.count) || 0), 0);
    const remaining = (Number(income) || 0) - (Number(expense) || 0);
    const topExpenses = await getTopExpenseCategories({ userId: user._id, range, limit: 3 });

    let aiSummary = '';
    try {
      const dateLabel = formatThaiDate(range.start) || 'วันนี้';
      aiSummary = await summarizeFinanceDay({
        language: 'th',
        dateLabel,
        income,
        expense,
        remaining,
        txCount,
        topExpenses,
      });
    } catch (e) {
      console.warn('AI daily finance summary failed', e);
      aiSummary = `AI ยังไม่พร้อม: ${buildAiUserErrorMessage(e)}`;
    }

    return sendReply(
      event.replyToken,
      buildFinanceStatusFlexMessage({
        label: 'วันนี้',
        range,
        income,
        expense,
        remaining,
        txCount,
        topExpenses,
        aiSummary,
      })
    );
  }

  if (actionValue === 'summary_month') {
    const now = new Date();
    const range = getBangkokMonthRange(now);
    if (!range) return sendReply(event.replyToken, { type: 'text', text: 'ขออภัย ผมหาช่วงวันที่ไม่เจอ' });

    // Bangkok month label for budget lookup
    const b2 = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    const y2 = b2.getUTCFullYear();
    const m2 = b2.getUTCMonth();
    const monthLabel = `${MONTH_NAMES_TH[m2] || ''} ${y2 + 543}`;

    const txAgg = await Transaction.aggregate([
      { $match: { userId: user._id, datetime: { $gte: range.start, $lt: range.end } } },
      { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]).catch(() => []);

    const income = (txAgg || []).find((r) => r?._id === 'income')?.total || 0;
    const expense = (txAgg || []).find((r) => r?._id === 'expense')?.total || 0;
    const txCount = (txAgg || []).reduce((s, r) => s + (Number(r?.count) || 0), 0);
    const remaining = (Number(income) || 0) - (Number(expense) || 0);
    const topExpenses = await getTopExpenseCategories({ userId: user._id, range, limit: 3 });

    const budgetTotal = await getMonthBudgetTotal({ userId: user._id, monthLabel });
    const budgetRemaining = Number.isFinite(Number(budgetTotal)) ? (Number(budgetTotal) || 0) - (Number(expense) || 0) : null;

    return sendReply(
      event.replyToken,
      buildFinanceStatusFlexMessage({
        label: monthLabel,
        range,
        income,
        expense,
        remaining,
        txCount,
        topExpenses,
        budgetTotal,
        budgetRemaining,
      })
    );
  }

  if (actionValue === 'help') {
    const helpText = 'คำสั่งตัวอย่าง:\n- จ่าย 120 ข้าวมันไก่\n- รับ 500 เงินลูกค้า\n- สรุปวันนี้\n- สรุปเดือนนี้\n- export';
    return sendReply(event.replyToken, { type: 'text', text: helpText });
  }

  if (actionValue === 'txn_delete') {
    let txnId = '';
    try {
      const params = new URLSearchParams(String(data || ''));
      txnId = String(params.get('id') || '').trim();
    } catch {
      txnId = '';
    }

    if (!txnId) return sendReply(event.replyToken, { type: 'text', text: 'ไม่พบรหัสรายการที่ต้องการลบ' });

    const tx = await Transaction.findOne({ _id: txnId, userId: user._id }).select('type amount note notes datetime').lean();
    if (!tx) return sendReply(event.replyToken, { type: 'text', text: 'ไม่พบรายการนี้ หรือคุณไม่มีสิทธิ์ลบ' });

    const noteText = String(tx?.notes || tx?.note || '').trim() || '-';
    const whenText = formatThaiDateTime(tx?.datetime) || '';
    const text = `ต้องการลบรายการนี้ใช่ไหม?\n${tx.type === 'income' ? 'รายรับ' : 'รายจ่าย'} ${formatThb(tx.amount)}\n${noteText}${whenText ? `\n${whenText}` : ''}`;

    return sendReply(event.replyToken, {
      type: 'template',
      altText: 'ยืนยันการลบรายการ',
      template: {
        type: 'confirm',
        text,
        actions: [
          { type: 'postback', label: 'ยืนยันลบ', data: `action=txn_delete_confirm&id=${encodeURIComponent(String(txnId))}` },
          { type: 'postback', label: 'ยกเลิก', data: 'action=txn_delete_cancel' },
        ],
      },
    });
  }

  if (actionValue === 'txn_delete_cancel') {
    return sendReply(event.replyToken, { type: 'text', text: 'ยกเลิกการลบแล้ว' });
  }

  if (actionValue === 'txn_delete_confirm') {
    let txnId = '';
    try {
      const params = new URLSearchParams(String(data || ''));
      txnId = String(params.get('id') || '').trim();
    } catch {
      txnId = '';
    }
    if (!txnId) return sendReply(event.replyToken, { type: 'text', text: 'ไม่พบรหัสรายการที่ต้องการลบ' });

    const deleted = await Transaction.findOneAndDelete({ _id: txnId, userId: user._id }).lean();
    if (!deleted) return sendReply(event.replyToken, { type: 'text', text: 'ไม่พบรายการนี้ หรือถูกลบไปแล้ว' });

    return sendReply(event.replyToken, { type: 'text', text: 'ลบรายการเรียบร้อยแล้ว' });
  }

  if (actionValue === 'announce' || actionValue === 'ประกาศ') {
    // No reply message (avoid sending chat text). Prefer using Rich Menu URI actions for announcements.
    return null;
  }

  // unknown/unsupported postback: respond minimally for debugging
  console.log('Unhandled postback action:', actionValue, 'raw data:', data);
  return sendReply(event.replyToken, { type: 'text', text: `ไม่รองรับการกระทำ: ${actionValue || data}` });
}

// Legacy redirect endpoint - generates JWT and redirects to dashboard.
// Prefer `/webhooks/line/open-dashboard` for the one-time-session flow.
// Usage: /webhooks/line/dashboard-redirect?uid=<base64(lineMessagingUserId)>
router.get('/dashboard-redirect', async (req, res) => {
  try {
    const signedUid = req.query.uid;
    if (!signedUid) return res.status(400).send('Missing uid parameter');

    // decode base64 uid (simple obfuscation - use proper signing in production)
    let lineMessagingUserId;
    try {
      lineMessagingUserId = Buffer.from(signedUid, 'base64').toString('utf8');
    } catch (e) {
      return res.status(400).send('Invalid uid parameter');
    }

    const { user } = await resolveMessagingUser(String(lineMessagingUserId || '').trim());
    if (!user?._id) {
      const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(`${frontend}/login?error=user_not_found`);
    }

    // generate JWT
    const secret = process.env.JWT_SECRET || 'dev-jwt-secret';
    const token = jwt.sign({ userId: user._id, role: user.role || 'user' }, secret, { expiresIn: '7d' });
    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const nextRaw = String(req.query.next || '').trim();
    const nextPath = nextRaw && nextRaw.startsWith('/') ? nextRaw : '';
    const nextParam = nextPath ? `&next=${encodeURIComponent(nextPath)}` : '';
    const profilePic = encodeURIComponent(user.profilePic || '');
    const dashboardUrl = `${frontend}/dashboard?token=${encodeURIComponent(token)}&profilePic=${profilePic}${nextParam}`;

    // redirect to dashboard
    res.redirect(dashboardUrl);
  } catch (err) {
    console.error('dashboard-redirect error', err);
    res.status(500).send('Internal error');
  }
});

// One-tap entrypoint for Rich Menu "URI action" (no extra bot message).
// It creates the same one-time session token used by the postback flow, then redirects to session-login,
// which finally redirects to the frontend with a JWT.
//
// Usage (dev): /webhooks/line/open-dashboard?uid=<base64(lineMessagingUserId)>
// Optional: &next=/budget
router.get('/open-dashboard', async (req, res) => {
  try {
    const signedUid = String(req.query.uid || '').trim();
    if (!signedUid) return res.status(400).send('Missing uid parameter');

    let lineMessagingUserId = '';
    try {
      lineMessagingUserId = Buffer.from(signedUid, 'base64').toString('utf8');
    } catch {
      lineMessagingUserId = '';
    }
    if (!lineMessagingUserId) return res.status(400).send('Invalid uid parameter');

    const nextRaw = String(req.query.next || '').trim();
    const nextPath = nextRaw && nextRaw.startsWith('/') ? nextRaw : '';

    const liffDisplayName = String(req.query.dn || '').trim();
    const liffPictureUrl = String(req.query.pic || '').trim();

    // 1) Try to resolve by the LIFF userId directly (ideal case: LIFF + bot share the same userId space).
    let user = await findUserByMessagingIdOrAlias(lineMessagingUserId);

    // 2) If not found, try to resolve to an existing "real" account using LIFF profile as a hint.
    // This avoids creating a brand-new placeholder user every time when LIFF is configured under
    // a different provider/channel than the bot (which can yield different userId values).
    if (!user && liffDisplayName) {
      const since = new Date(Date.now() - 60 * 60 * 1000); // 1 hour
      const candidates = await User.find({
        name: liffDisplayName,
        lineMessagingUserId: { $exists: true, $ne: '' },
        createdAt: { $gte: since },
      }).sort({ createdAt: -1 }).limit(10);

      const scored = await Promise.all((candidates || []).map(async (u) => {
        const [t, c, b] = await Promise.all([
          Transaction.countDocuments({ userId: u._id }).catch(() => 0),
          Category.countDocuments({ userId: u._id }).catch(() => 0),
          Budget.countDocuments({ userId: u._id }).catch(() => 0),
        ]);
        const score = (Number(t) || 0) + (Number(c) || 0) + (Number(b) || 0);
        return { u, score };
      }));

      const withData = scored.filter((s) => s.score > 0);
      if (withData.length === 1) {
        user = withData[0].u;
      } else if (!user) {
        // If nobody has data yet, only pick when the choice is unambiguous (exactly 1 candidate),
        // and it looks like a fresh placeholder.
        if (scored.length === 1) {
          const only = scored[0].u;
          if (looksLikePlaceholderUser(only) && isVeryRecent(only, 10 * 60 * 1000)) user = only;
        }
      }
    }

    // 3) If still not found, fall back to creating/resolving a Messaging user record for this uid.
    if (!user) {
      const resolved = await resolveMessagingUser(lineMessagingUserId);
      user = resolved?.user || null;
    }

    if (!user?._id) return res.status(404).send('User not found');

    // Ensure this LIFF userId can always resolve to the canonical user.
    // (Even if it's a different id-space than Messaging API userId.)
    if (String(user.lineMessagingUserId || '') !== String(lineMessagingUserId)) {
      await ensureMessagingAlias({ aliasId: String(lineMessagingUserId), userId: user._id, source: 'liff' }).catch(() => {});
    }

    // Best-effort: LIFF can provide profile even when Messaging API profile fetch fails.
    // Populate missing fields to reduce "blank profile" placeholders.
    try {
      const needName = !String(user?.name || '').trim();
      const needPic = !String(user?.profilePic || '').trim();
      let updated = false;
      if (needName && liffDisplayName) { user.name = liffDisplayName; updated = true; }
      if (needPic && liffPictureUrl) { user.profilePic = liffPictureUrl; updated = true; }
      if (updated) await user.save().catch(() => {});
    } catch {
      // ignore
    }

    // Cleanup: if a placeholder user exists for this LIFF uid (from past runs) but we resolved to a different
    // canonical user, merge the placeholder into the canonical user (best-effort) so it doesn't keep appearing.
    try {
      const placeholder = await User.findOne({ lineMessagingUserId }).catch(() => null);
      if (placeholder && String(placeholder._id) !== String(user._id)) {
        const [t, c, b] = await Promise.all([
          Transaction.countDocuments({ userId: placeholder._id }).catch(() => 0),
          Category.countDocuments({ userId: placeholder._id }).catch(() => 0),
          Budget.countDocuments({ userId: placeholder._id }).catch(() => 0),
        ]);
        const placeholderHasAny = (Number(t) + Number(c) + Number(b)) > 0;
        if (!placeholderHasAny) {
          const fromEmail = String(placeholder?.email || '');
          const safeToDelete =
            !placeholder?.password &&
            (fromEmail.endsWith('@local') || fromEmail.endsWith('@line.local') || /^line_/i.test(fromEmail) || /^line_msg_/i.test(fromEmail));
          await mergeUsers({ fromUserId: placeholder._id, toUserId: user._id, deleteSource: safeToDelete });
          user = (await User.findById(user._id)) || user;
        }
      }
    } catch (e) {
      console.warn('open-dashboard cleanup merge skipped:', e?.message || e);
    }

    const backendBase = process.env.BACKEND_URL || 'http://localhost:5050';
    const rawToken = createSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    await LineLoginSession.create({
      tokenHash,
      userId: user._id,
      lineUserId: String(lineMessagingUserId),
      expiresAt,
    });

    const nextParam = nextPath ? `&next=${encodeURIComponent(nextPath)}` : '';
    const redirectUrl = `${backendBase}/webhooks/line/session-login?token=${encodeURIComponent(rawToken)}${nextParam}`;
    return res.redirect(redirectUrl);
  } catch (err) {
    console.error('open-dashboard error', err);
    return res.status(500).send('Internal error');
  }
});

// LIFF landing page (Rich Menu URI-friendly): no uid/token in the URL the user taps.
// The LIFF JS gets the LINE userId, then redirects to `/webhooks/line/open-dashboard`.
//
// Usage: /webhooks/line/liff-dashboard?next=/budget
router.get('/liff-dashboard', (req, res) => {
  try {
    const liffId = String(process.env.LIFF_ID || process.env.LINE_LIFF_ID || '').trim();
    if (!liffId) return res.status(500).send('LIFF_ID not configured');

    const filePath = path.join(__dirname, '../public/liff-dashboard.html');
    let html = fs.readFileSync(filePath, 'utf8');
    html = html.replace('{{LIFF_ID}}', liffId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error('liff-dashboard error', err);
    return res.status(500).send('Internal error');
  }
});

// signature verification middleware (safe for local testing)
const crypto = require('crypto');

function createSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

function hashSessionToken(token) {
  const secret = process.env.SESSION_TOKEN_SECRET || process.env.JWT_SECRET || CHANNEL_SECRET || 'dev-session-secret';
  return crypto.createHmac('sha256', String(secret)).update(String(token)).digest('hex');
}

function createLinkCode() {
  return String(Math.floor(Math.random() * 900000) + 100000);
}

function hashLinkCode(code) {
  return hashSessionToken(code);
}

function verifySignature(req, res, next) {
  if (!CHANNEL_SECRET) return next();
  const signature = req.get('x-line-signature');
  if (!signature) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('No X-Line-Signature header — allowing in non-production for testing');
      return next();
    }
    return res.status(400).send('no signature');
  }
  const raw = req.rawBody || '';
  const hash = crypto.createHmac('sha256', CHANNEL_SECRET).update(raw).digest('base64');
  if (hash !== signature) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Invalid X-Line-Signature — allowing in non-production for testing');
      return next();
    }
    return res.status(401).send('invalid signature');
  }
  return next();
}

// richmenu upload helpers
const multer = require('multer');
const sharp = require('sharp');
const richUploadDir = path.join(__dirname, '../uploads/richmenu');
try { fs.mkdirSync(richUploadDir, { recursive: true }); } catch (e) { /* ignore */ }
const upload = multer({ dest: richUploadDir });

function clampArea(area, maxW, maxH) {
  const x = Math.max(0, Math.min(maxW - 1, Number(area?.x) || 0));
  const y = Math.max(0, Math.min(maxH - 1, Number(area?.y) || 0));
  const wRaw = Number(area?.width) || 0;
  const hRaw = Number(area?.height) || 0;
  const width = Math.max(1, Math.min(maxW - x, wRaw));
  const height = Math.max(1, Math.min(maxH - y, hRaw));
  return { x, y, width, height };
}

function buildBalanzDefaultRichMenuAreas({ backendBase } = {}) {
  const base = String(backendBase || '').trim() || 'http://localhost:5050';
  const liffId = String(process.env.LIFF_ID || process.env.LINE_LIFF_ID || '').trim();
  // Prefer launching via the official LIFF entry URL so LINE carries query params via `liff.state`.
  const liffEntry = liffId ? `https://liff.line.me/${encodeURIComponent(liffId)}` : '';
  const liffBase = `${base}/webhooks/line/liff-dashboard`;
  const liffUri = (nextPath) => {
    const next = String(nextPath || '').trim();
    if (!next.startsWith('/')) return liffBase;
    // LINE often wraps incoming params into `liff.state`. Make it explicit to avoid losing `next`.
    // Keep it simple: `liff.state=?next=%2Fbudget`
    if (liffEntry) return `${liffEntry}?liff.state=${encodeURIComponent(`?next=${encodeURIComponent(next)}`)}`;
    return `${liffBase}?next=${encodeURIComponent(next)}`;
  };
  const size = { width: 2500, height: 1686 };

  // Coordinates tuned for `backend/uploads/richmenu/menuline.png` (2500x1686).
  // Goal: make "หมวด/งบ" open the web `/budget` page in one tap via LIFF (no postback).
  const rawAreas = [
    // Big left panel: quick note UI in chat
    // Note: omit `displayText` so tapping won't insert a chat bubble.
    { bounds: { x: 0, y: 0, width: 1520, height: 900 }, action: { type: 'postback', data: 'action=quick_note' } },

    // Top-right buttons (URI -> LIFF -> auto-login -> next)
    { bounds: { x: 1515, y: 62, width: 515, height: 527 }, action: { type: 'uri', uri: liffUri('/budget') } }, // หมวด/งบ
    { bounds: { x: 1956, y: 63, width: 515, height: 527 }, action: { type: 'uri', uri: liffUri('/dashboard') } }, // สรุป

    // Mid-right buttons
    { bounds: { x: 1460, y: 509, width: 550, height: 631 }, action: { type: 'uri', uri: liffUri('/analytics') } }, // วิเคราะห์
    { bounds: { x: 1960, y: 509, width: 500, height: 627 }, action: { type: 'uri', uri: liffUri('/transactions') } }, // รายการ

    // Bottom buttons (in-chat)
    // "ประกาศ": open LINE VOOM profile directly (no bot message)
    { bounds: { x: 60, y: 870, width: 1540, height: 490 }, action: { type: 'uri', uri: 'https://linevoom.line.me/user/_dSs5kG-khi7BnuX1n_8YC2waG8f69Rq3sXRBcHg' } },
    // Note: omit `displayText` so tapping won't insert a chat bubble.
    { bounds: { x: 1600, y: 870, width: 840, height: 490 }, action: { type: 'postback', data: 'action=help' } },
  ];

  return rawAreas.map((a) => ({
    bounds: clampArea(a.bounds, size.width, size.height),
    action: a.action,
  }));
}

// Health endpoint for debugging config (do not expose secrets)
router.get('/health', (req, res) => {
  const hasToken = Boolean(process.env.LINE_CHANNEL_ACCESS_TOKEN);
  const hasSecret = Boolean(process.env.LINE_CHANNEL_SECRET);
  res.json({
    ok: true,
    env: process.env.NODE_ENV || 'development',
    channelToken: hasToken ? 'present' : 'missing',
    channelSecret: hasSecret ? 'present' : 'missing',
    webhookPath: '/webhooks/line',
  });
});

// One-time session login redirect (created from LINE chat)
// Usage: /webhooks/line/session-login?token=<one-time-token>
router.get('/session-login', async (req, res) => {
  try {
    const token = String(req.query.token || '').trim();
    const nextRaw = String(req.query.next || '').trim();
    const nextPath = nextRaw && nextRaw.startsWith('/') ? nextRaw : '';
    if (!token) return res.status(400).send('Missing token');

    const tokenHash = hashSessionToken(token);
    const session = await LineLoginSession.findOne({ tokenHash });
    if (!session) return res.status(404).send('Session not found');
    if (session.usedAt) return res.status(410).send('Session already used');
    if (session.expiresAt && session.expiresAt.getTime() < Date.now()) return res.status(410).send('Session expired');

    session.usedAt = new Date();
    await session.save();

    const user = await User.findById(session.userId);
    if (!user) return res.status(404).send('User not found');

    const secret = process.env.JWT_SECRET || 'dev-jwt-secret';
    const jwtToken = jwt.sign({ userId: user._id, role: user.role || 'user' }, secret, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

    const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
    const profilePic = encodeURIComponent(user.profilePic || '');
    const nextParam = nextPath ? `&next=${encodeURIComponent(nextPath)}` : '';
    return res.redirect(`${frontend}/dashboard?token=${encodeURIComponent(jwtToken)}&profilePic=${profilePic}${nextParam}`);
  } catch (err) {
    console.error('session-login error', err);
    return res.status(500).send('Internal error');
  }
});

// Install the default Balanz rich menu (uses the bundled `menuline.png`).
// This makes "หมวด/งบ" open the web `/budget` page in one tap (URI -> LIFF).
//
// Usage:
// - POST /webhooks/line/richmenu/install-default
// Optional JSON body:
// - setDefault: true|false (default true)
// - chatBarText: string (default "เมนู")
// - userId: string (LINE Messaging userId) to link this rich menu to a user (optional)
// - forceRelink: true|false (default false) when userId provided, unlink any existing rich menu from that user before linking
router.post('/richmenu/install-default', async (req, res) => {
  try {
    ensureClient();
    if (!CHANNEL_TOKEN) return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' });

    const backendBase = process.env.BACKEND_URL || 'http://localhost:5050';
    const chatBarText = String(req.body?.chatBarText || 'เมนู');
    const setDefault = req.body?.setDefault === false ? false : true;
    const forceRelink = req.body?.forceRelink === true;

    const richMenuObject = {
      size: { width: 2500, height: 1686 },
      selected: false,
      name: 'balanz-default',
      chatBarText,
      areas: buildBalanzDefaultRichMenuAreas({ backendBase }),
    };

    const richMenuId = await client.createRichMenu(richMenuObject);

    const imagePath = path.join(__dirname, '../uploads/richmenu/menuline.png');
    const imgBuf = await sharp(imagePath).resize(2500, 1686, { fit: 'cover' }).png().toBuffer();
    await client.setRichMenuImage(richMenuId, imgBuf);

    const warnings = [];
    if (setDefault) {
      try {
        await client.setDefaultRichMenu(richMenuId);
      } catch (e) {
        warnings.push({ op: 'setDefault', error: e?.message || 'setDefault failed' });
      }
    }

    const linkUserId = String(req.body?.userId || '').trim();
    if (linkUserId) {
      try {
        if (forceRelink) {
          try {
            // If a rich menu is already linked to this user, default rich menu won't override it.
            // Unlink first so the new one takes effect immediately.
            await client.getRichMenuIdOfUser(linkUserId);
            await client.unlinkRichMenuFromUser(linkUserId);
          } catch (e) {
            // Ignore "not found" etc. We'll still attempt to link the new one.
          }
        }
        await client.linkRichMenuToUser(linkUserId, richMenuId);
      } catch (e) {
        warnings.push({ op: 'linkUser', userId: linkUserId, error: e?.message || 'linkRichMenuToUser failed' });
      }
    }

    return res.json({ success: true, richMenuId, warnings });
  } catch (err) {
    console.error('richmenu/install-default error', err && err.response ? err.response.data : err);
    const responseError = (err && err.response && err.response.data) ? err.response.data : (err && err.message ? err.message : 'error');
    const status = (err && err.response && err.response.status) ? err.response.status : 500;
    return res.status(status).json({ error: responseError });
  }
});

router.post('/', verifySignature, async (req, res) => {
  try {
    const events = req.body.events || [];
    await Promise.all(events.map(async (ev) => {
      try {
        if (ev.type === 'message' && ev.message && ev.message.type === 'text') return handleTextEvent(ev);
        if (ev.type === 'message' && ev.message && ev.message.type === 'image') return handleImageEvent(ev);
        if (ev.type === 'message' && ev.message && ev.message.type === 'audio') return handleAudioEvent(ev);
        if (ev.type === 'postback') return handlePostbackEvent(ev);
        // ignore other events for now
      } catch (err) {
        console.error('handle event error', err);
      }
    }));
    res.status(200).send('OK');
  } catch (err) {
    console.error('webhook error', err);
    res.status(500).send('error');
  }
});

// Create a rich menu and upload an image. Accepts multipart/form-data with field `image`.
// Optional form fields:
// - chatBarText: string
// - name: string
// - areas: JSON string representing the areas array (optional)
// - setDefault: '1'|'true' to set as default rich menu
// - userId: line userId to link this richmenu to
router.post('/richmenu/create', upload.single('image'), async (req, res) => {
  try {
    ensureClient();
    if (!CHANNEL_TOKEN) return res.status(500).json({ error: 'LINE_CHANNEL_ACCESS_TOKEN not configured' });

    // log incoming request fields for debugging
    console.log('richmenu/create request body:', Object.keys(req.body).reduce((o,k)=>{ o[k]=req.body[k]; return o; },{}));
    console.log('richmenu/create file:', req.file ? { originalname: req.file.originalname, path: req.file.path, size: req.file.size } : null);

    const chatBarText = req.body.chatBarText || 'เมนู';
    const name = req.body.name || 'custom-richmenu';
    let areas = [];
    if (req.body.areas) {
      try { areas = JSON.parse(req.body.areas); } catch (e) { areas = []; }
    }

    // default size for single image rich menu (adjustable)
    const richMenuObject = {
      size: { width: 2500, height: 1686 },
      selected: false,
      name: name,
      chatBarText: chatBarText,
      areas: areas
    };

    let richMenuId;
    try {
      richMenuId = await client.createRichMenu(richMenuObject);
      console.log('richmenu created id=', richMenuId);
    } catch (createErr) {
      console.error('createRichMenu failed', createErr && createErr.response ? createErr.response.data : createErr);
      throw createErr;
    }

    // upload image if provided (resize to LINE required size first)
    if (req.file && req.file.path) {
      const filePath = req.file.path;
      try {
        // try to resize to LINE richmenu size (2500x1686)
        try {
          const buf = await sharp(filePath).resize(2500, 1686, { fit: 'cover' }).toBuffer();
          console.log('resized image buffer length', buf.length);
          await client.setRichMenuImage(richMenuId, buf);
          console.log('setRichMenuImage succeeded');
        } catch (resizeErr) {
          console.warn('sharp resize failed or upload failed, trying original image as fallback', resizeErr && (resizeErr.response ? resizeErr.response.data : resizeErr));
          await client.setRichMenuImage(richMenuId, fs.createReadStream(filePath));
          console.log('setRichMenuImage succeeded with original file');
        }
      } finally {
        // remove temp file
        try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
      }
    }

    // set default if requested (non-fatal)
    const warnings = [];
    if (req.body.setDefault === '1' || String(req.body.setDefault).toLowerCase() === 'true') {
      try {
        await client.setDefaultRichMenu(richMenuId);
      } catch (e) {
        console.error('setDefaultRichMenu failed', e && e.response ? e.response.data : e);
        warnings.push({ op: 'setDefault', error: (e && e.response && e.response.data) ? e.response.data : (e && e.message) });
      }
    }

    // link to a specific user if provided (non-fatal)
    if (req.body.userId) {
      try {
        await client.linkRichMenuToUser(req.body.userId, richMenuId);
      } catch (e) {
        console.error('linkRichMenuToUser failed', e && e.response ? e.response.data : e);
        warnings.push({ op: 'linkUser', userId: req.body.userId, error: (e && e.response && e.response.data) ? e.response.data : (e && e.message) });
      }
    }

    res.json({ success: true, richMenuId, warnings });
  } catch (err) {
    // if LINE SDK / axios returned a response body, include it for debugging
    try {
      console.error('richmenu create error', err && err.response ? err.response.data : err);
    } catch (e) {
      console.error('richmenu create error', err);
    }
    const responseError = (err && err.response && err.response.data) ? err.response.data : (err && err.message ? err.message : 'error');
    const status = (err && err.response && err.response.status) ? err.response.status : 500;
    return res.status(status).json({ error: responseError });
  }
});

module.exports = router;
