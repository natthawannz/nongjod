const express = require('express');
const session = require('express-session');
const passport = require('passport');
const LineStrategy = require('passport-line').Strategy;
const line = require('@line/bot-sdk');
const jwt = require('jsonwebtoken');
const { User, Transaction, Category, Budget, ReminderSetting, BudgetAlertState, MonthlyReportState } = require('./models');
const { mergeUsers } = require('./utils/mergeUsers');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { summarizeFinanceDay } = require('./utils/openaiFinanceSummary');
// Load environment variables as early as possible so required modules can read them.
// Use an explicit path so starting the server from the repo root still loads `backend/.env`.
dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || path.join(__dirname, '.env') });
const authRoutes = require('./routes/auth');
const transactionRoutes = require('./routes/transactions');
const categoryRoutes = require('./routes/categories'); // เปลี่ยนจาก Categories
const budgetRoutes = require('./routes/budget'); // แก้ไขการพิมพ์ผิด
const notificationsRouter = require('./routes/notifications');
const ocrRoutes = require('./routes/ocr'); // OCR routes
const aiRoutes = require('./routes/ai'); // OpenAI (slip + transcription)
const lineWebhookRouter = require('./routes/line');
const debugRoutes = require('./routes/debug');
const leaderboardRoutes = require('./routes/leaderboard');
const reminderRoutes = require('./routes/reminders');
const notificationSettingsRoutes = require('./routes/notificationSettings');
const app = express();

function normalizeBaseUrl(raw, fallback) {
  const s = String(raw || '').trim();
  const base = s || String(fallback || '').trim();
  return base.replace(/\/+$/, '');
}

const PORT = Number(process.env.PORT || 5050);
const BACKEND_URL = normalizeBaseUrl(process.env.BACKEND_URL, `http://localhost:${PORT}`);

// Basic health endpoints (useful for Render uptime checks / quick verification)
app.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    service: 'balanz-backend',
    uptimeSec: Math.floor(process.uptime()),
  });
});
app.get('/healthz', (req, res) => {
  res.status(200).json({ ok: true });
});

async function findBotPlaceholderCandidate({ displayName, profilePic, excludeUserId } = {}) {
  if (!displayName) return null;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const q = {
    _id: excludeUserId ? { $ne: excludeUserId } : undefined,
    lineUserId: { $exists: false },
    lineMessagingUserId: { $exists: true, $ne: '' },
    name: displayName,
    profilePic: profilePic ? String(profilePic) : undefined,
    email: { $regex: /^line_msg_.*@local$/i },
    createdAt: { $gte: since },
  };
  if (!q._id) delete q._id;
  if (!q.profilePic) delete q.profilePic;

  // Multiple placeholder users with the same displayName can exist (tests / retries).
  // Only auto-select when the choice is unambiguous:
  // - exactly one candidate has any transactions, OR
  // - all have zero tx and there's only one candidate, OR
  // - all have zero tx and the freshest is "very fresh" while the next is clearly older.
  const candidates = await User.find(q).sort({ createdAt: -1 }).limit(10);
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  const enriched = await Promise.all(candidates.map(async (u) => {
    const [txCount, lastTx] = await Promise.all([
      Transaction.countDocuments({ userId: u._id }).catch(() => 0),
      Transaction.findOne({ userId: u._id })
        .sort({ datetime: -1, createdAt: -1, _id: -1 })
        .select({ datetime: 1, createdAt: 1 })
        .lean()
        .catch(() => null),
    ]);
    const lastAt = lastTx?.datetime || lastTx?.createdAt || null;
    return { u, txCount: Number(txCount) || 0, lastAt: lastAt ? new Date(lastAt) : null };
  }));

  const withTx = enriched.filter((e) => e.txCount > 0);
  if (withTx.length === 1) return withTx[0].u;
  if (withTx.length > 1) {
    // Ambiguous: more than one placeholder account has activity.
    return null;
  }

  // No transactions on any candidate: allow only if it's clearly a fresh, new placeholder.
  const sortedByCreated = [...enriched].sort((a, b) => new Date(b.u.createdAt) - new Date(a.u.createdAt));
  const freshest = sortedByCreated[0];
  const second = sortedByCreated[1];
  const freshestAgeMs = Date.now() - new Date(freshest.u.createdAt).getTime();
  const secondAgeMs = Date.now() - new Date(second.u.createdAt).getTime();
  const veryFresh = freshestAgeMs >= 0 && freshestAgeMs <= 60 * 60 * 1000; // 1 hour
  const secondClearlyOlder = secondAgeMs >= 24 * 60 * 60 * 1000; // 24 hours
  if (veryFresh && secondClearlyOlder) return freshest.u;

  return null;
}

async function countUserData(userId) {
  const [txCount, catCount, budCount] = await Promise.all([
    Transaction.countDocuments({ userId }).catch(() => 0),
    Category.countDocuments({ userId }).catch(() => 0),
    Budget.countDocuments({ userId }).catch(() => 0),
  ]);
  return {
    txCount: Number(txCount) || 0,
    catCount: Number(catCount) || 0,
    budCount: Number(budCount) || 0,
  };
}

async function autoUnifyMessagingUserOnLineLogin({ oauthUser, lineId, displayName, profilePic, email } = {}) {
  if (!oauthUser || !lineId || !displayName) return oauthUser;
  if (oauthUser.lineMessagingUserId) return oauthUser;

  // Deterministic unify: when LINE Login userId matches Messaging userId exactly, merge immediately.
  try {
    const placeholder = await User.findOne({ lineMessagingUserId: String(lineId) });
    if (placeholder && String(placeholder._id) !== String(oauthUser._id)) {
      const oauthCounts = await countUserData(oauthUser._id);
      const oauthHasAny = (oauthCounts.txCount + oauthCounts.catCount + oauthCounts.budCount) > 0;

      const placeholderCounts = await countUserData(placeholder._id);
      const placeholderHasAny = (placeholderCounts.txCount + placeholderCounts.catCount + placeholderCounts.budCount) > 0;

      // If the OAuth user is empty, keep the placeholder as canonical (keeps tx _id stable).
      if (!oauthHasAny || placeholderHasAny) {
        placeholder.lineUserId = String(lineId);
        if (profilePic) placeholder.profilePic = profilePic;
        if (email) placeholder.email = email;
        await placeholder.save().catch(() => {});

        const otherEmail = String(oauthUser.email || '');
        const safeToDelete =
          !oauthUser.password &&
          (otherEmail.endsWith('@line.local') || otherEmail.endsWith('@local') || /^line_/i.test(otherEmail) || /^line_msg_/i.test(otherEmail));
        await mergeUsers({ fromUserId: oauthUser._id, toUserId: placeholder._id, deleteSource: safeToDelete });
        return (await User.findById(placeholder._id)) || placeholder;
      }

      // Otherwise merge placeholder into OAuth user.
      const otherEmail = String(placeholder.email || '');
      const safeToDelete =
        !placeholder.password &&
        (otherEmail.endsWith('@local') || /^line_/i.test(otherEmail) || /^line_msg_/i.test(otherEmail));
      await mergeUsers({ fromUserId: placeholder._id, toUserId: oauthUser._id, deleteSource: safeToDelete });
      return (await User.findById(oauthUser._id)) || oauthUser;
    }
  } catch (e) {
    // ignore and fall back to heuristic unify
  }

  const candidate = await findBotPlaceholderCandidate({ displayName, profilePic, excludeUserId: oauthUser._id });
  if (!candidate) return oauthUser;
  if (candidate.lineUserId) return oauthUser;

  const oauthCounts = await countUserData(oauthUser._id);
  const oauthHasAny = (oauthCounts.txCount + oauthCounts.catCount + oauthCounts.budCount) > 0;

  // If the OAuth user is "empty", prefer the bot-created user as the single canonical record,
  // attach `lineUserId` to it, and delete the empty OAuth user. This keeps transactions on the same _id.
  if (!oauthHasAny) {
    try {
      oauthUser.lineUserId = undefined;
      await oauthUser.save();
    } catch {
      // ignore: we'll still attempt to attach below
    }

    candidate.lineUserId = lineId;
    if (profilePic) candidate.profilePic = profilePic;
    if (email) candidate.email = email;
    try {
      await candidate.save();
      await User.deleteOne({ _id: oauthUser._id }).catch(() => {});
      return candidate;
    } catch (e) {
      if (e && e.code === 11000) {
        const existing = await User.findOne({ lineUserId: lineId });
        if (existing) return existing;
      }
      throw e;
    }
  }

  // Otherwise, merge the bot user into the OAuth user (keep `lineUserId` stable).
  const otherEmail = String(candidate.email || '');
  const safeToDelete =
    !candidate.password &&
    (otherEmail.endsWith('@local') || /^line_/i.test(otherEmail) || /^line_msg_/i.test(otherEmail));
  await mergeUsers({ fromUserId: candidate._id, toUserId: oauthUser._id, deleteSource: safeToDelete });
  return (await User.findById(oauthUser._id)) || oauthUser;
}

// LINE Login configuration
const LINE_LOGIN_CHANNEL_ID =
  String(process.env.LINE_LOGIN_CHANNEL_ID || process.env.LINE_CHANNEL_ID || '').trim();
const LINE_LOGIN_CHANNEL_SECRET =
  String(process.env.LINE_LOGIN_CHANNEL_SECRET || process.env.LINE_CHANNEL_SECRET || '').trim();
const LINE_CALLBACK_URL = String(process.env.LINE_CALLBACK_URL || `${BACKEND_URL}/callback`).trim();

if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET) {
  console.warn('[line-login] Missing LINE login config. Set LINE_LOGIN_CHANNEL_ID and LINE_LOGIN_CHANNEL_SECRET.');
} else {
  passport.use(new LineStrategy({
    channelID: LINE_LOGIN_CHANNEL_ID,
    channelSecret: LINE_LOGIN_CHANNEL_SECRET,
    callbackURL: LINE_CALLBACK_URL,
    scope: ['profile', 'openid', 'email'],
  }, async (accessToken, refreshToken, params, profile, done) => {
  try {
    // LINE profile: profile.id, profile.displayName, profile.emails
    const lineId = profile.id;
    const profilePic = profile._json && profile._json.pictureUrl ? profile._json.pictureUrl : '';
    const displayName = profile.displayName || '';
    // Prefer linking by lineUserId. If a user with this LINE id exists, use it.
    let user = await User.findOne({ lineUserId: lineId });
    if (user) {
      let updated = false;
      if (profile.displayName && user.name !== profile.displayName) { user.name = profile.displayName; updated = true; }
      if (profilePic && user.profilePic !== profilePic) { user.profilePic = profilePic; updated = true; }
      if (updated) await user.save();
      user = await autoUnifyMessagingUserOnLineLogin({ oauthUser: user, lineId, displayName, profilePic });
      return done(null, user);
    }

    // Otherwise, try to find by email if available and attach lineUserId
    const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
    if (email) {
      user = await User.findOne({ email });
      if (user) {
        user.lineUserId = lineId;
        if (profile.displayName) user.name = profile.displayName;
        if (profilePic) user.profilePic = profilePic;
        await user.save();
        user = await autoUnifyMessagingUserOnLineLogin({ oauthUser: user, lineId, displayName, profilePic, email });
        return done(null, user);
      }
    }

    // Heuristic: if the user already used the bot (LINE Messaging API) very recently,
    // there may be a bot-created placeholder user (email like `line_msg_<id>@local`)
    // with the same displayName. Auto-attach the LINE Login `lineUserId` to that record
    // to avoid creating a duplicate web-only user.
    //
    // Safety constraints:
    // - only placeholder bot accounts
    // - must have a Messaging user id
    // - must NOT already have lineUserId
    // - must match displayName exactly
    // - must be created recently
    if (displayName) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const candidates = await User.find({
        lineUserId: { $exists: false },
        lineMessagingUserId: { $exists: true, $ne: '' },
        name: displayName,
        email: { $regex: /^line_msg_.*@local$/i },
        createdAt: { $gte: since },
      }).sort({ createdAt: -1 }).limit(2);

      if (candidates.length === 1) {
        const candidate = candidates[0];
        candidate.lineUserId = lineId;
        if (profilePic) candidate.profilePic = profilePic;
        // Prefer real email from LINE Login if present; otherwise keep placeholder.
        if (email) candidate.email = email;
        try {
          await candidate.save();
          return done(null, candidate);
        } catch (e) {
          // In case of a duplicate-key race, fall back to the now-linked record.
          if (e && e.code === 11000) {
            const existing = await User.findOne({ lineUserId: lineId });
            if (existing) return done(null, existing);
          }
          throw e;
        }
      }
    }

    // Fallback: create a new user and set lineUserId
    const newEmail = email || `${lineId}@line.local`;
    user = new User({
      email: newEmail,
      password: '',
      name: profile.displayName || '',
      profilePic,
      role: 'user',
      lineUserId: lineId
    });
    try {
      await user.save();
      user = await autoUnifyMessagingUserOnLineLogin({ oauthUser: user, lineId, displayName, profilePic, email });
      return done(null, user);
    } catch (e) {
      // Handle race or duplicate key on email: attach lineUserId to existing user
      if (e && e.code === 11000) {
        const existing = await User.findOne({ email: newEmail });
        if (existing) {
          existing.lineUserId = lineId;
          if (profile.displayName) existing.name = profile.displayName;
          if (profilePic) existing.profilePic = profilePic;
          await existing.save();
          const unified = await autoUnifyMessagingUserOnLineLogin({ oauthUser: existing, lineId, displayName, profilePic, email });
          return done(null, unified);
        }
      }
      throw e;
    }
  } catch (err) {
    return done(err);
  }
  }));
}

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});
// Middleware - Enhanced CORS configuration
const FRONTEND_URL = normalizeBaseUrl(process.env.FRONTEND_URL, 'http://localhost:3000');
const corsOrigins = (() => {
  const extra = String(process.env.CORS_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
  // Always allow local dev defaults.
  const defaults = ['http://localhost:3000', 'http://localhost:3001'];
  const all = [FRONTEND_URL, ...extra, ...defaults].filter(Boolean);
  return Array.from(new Set(all));
})();
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Preserve raw body for LINE signature verification middleware
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));

// Session and Passport middleware
// Render/Vercel run behind proxies; enable secure cookies when HTTPS is used.
app.set('trust proxy', 1);
app.use(session({
  secret: String(process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-session-secret'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
}));
app.use(passport.initialize());
app.use(passport.session());

// LINE Login routes
app.get('/auth/line', (req, res, next) => {
  if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET) {
    return res.status(500).json({ error: 'LINE Login not configured (missing LINE_LOGIN_CHANNEL_ID/SECRET)' });
  }
  return passport.authenticate('line')(req, res, next);
});
// If LINE auth fails, Passport redirects to `/login`. This backend doesn't implement a login page,
// so forward users to the frontend with an error flag instead of showing "Cannot GET /login".
app.get('/login', (req, res) => {
  return res.redirect(`${FRONTEND_URL}/?error=line_login_failed`);
});
app.get('/callback', (req, res, next) => {
  if (!LINE_LOGIN_CHANNEL_ID || !LINE_LOGIN_CHANNEL_SECRET) {
    return res.redirect(`${FRONTEND_URL}/?error=line_login_failed&reason=${encodeURIComponent('LINE Login not configured')}`);
  }
  return passport.authenticate('line', { session: true }, (err, user, info) => {
    if (err || !user) {
      const reason =
        String(info?.message || info?.error || err?.message || 'unknown').slice(0, 120);
      console.error('[line-login] callback failed:', { reason });
      return res.redirect(`${FRONTEND_URL}/?error=line_login_failed&reason=${encodeURIComponent(reason)}`);
    }
    req.logIn(user, (loginErr) => {
      if (loginErr) {
        const reason = String(loginErr?.message || 'login_failed').slice(0, 120);
        console.error('[line-login] req.logIn failed:', { reason });
        return res.redirect(`${FRONTEND_URL}/?error=line_login_failed&reason=${encodeURIComponent(reason)}`);
      }
      return next();
    });
  })(req, res, next);
}, (req, res) => {
  // Successful authentication
  // Generate JWT token for the user
  const user = req.user;
  const jwtSecret = String(process.env.JWT_SECRET || 'dev-jwt-secret');
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    jwtSecret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  // Redirect to frontend with token and profilePic as query params
  const profilePic = encodeURIComponent(user.profilePic || '');
  res.redirect(`${FRONTEND_URL}/dashboard?token=${encodeURIComponent(token)}&profilePic=${profilePic}`);
});
//
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes); // เปลี่ยนจาก Categories
app.use('/api/budgets', budgetRoutes); // แก้ไขการพิมพ์ผิด
app.use('/api', notificationsRouter); // ใช้ /api/notifications
app.use('/api/ocr', ocrRoutes); // OCR routes
app.use('/api/ai', aiRoutes); // OpenAI routes (slip + transcription)
app.use('/api/reminders', reminderRoutes);
app.use('/api/notification-settings', notificationSettingsRoutes);
// Serve uploaded files (use absolute path so it works regardless of process cwd)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Dev debug endpoints
app.use('/api/debug', debugRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// LINE Messaging API webhook
app.use('/webhooks/line', lineWebhookRouter);

function getBangkokNowParts() {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const map = {};
    parts.forEach((p) => { if (p?.type) map[p.type] = p.value; });
    const yyyy = String(map.year || '').trim();
    const mm = String(map.month || '').trim();
    const dd = String(map.day || '').trim();
    const hh = String(map.hour || '').trim().padStart(2, '0');
    const mi = String(map.minute || '').trim().padStart(2, '0');
    const dateKey = `${yyyy}-${mm}-${dd}`;
    const hhmm = `${hh}:${mi}`;
    return { dateKey, hhmm };
  } catch {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return { dateKey: `${yyyy}-${mm}-${dd}`, hhmm: `${hh}:${mi}` };
  }
}

let reminderClient = null;
let reminderClientToken = '';
function ensureReminderClient() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  const secret = process.env.LINE_CHANNEL_SECRET || '';
  if (!token) {
    reminderClient = null;
    reminderClientToken = '';
    return null;
  }
  if (!reminderClient || reminderClientToken !== token) {
    reminderClientToken = token;
    reminderClient = new line.Client({ channelAccessToken: token, channelSecret: secret });
  }
  return reminderClient;
}

async function pushLineText(toUserId, text) {
  const userId = String(toUserId || '').trim();
  if (!userId) return null;
  const t = String(text || '').trim();
  if (!t) return null;
  const c = ensureReminderClient();
  if (!c) {
    console.log('Daily reminder push skipped (no LINE_CHANNEL_ACCESS_TOKEN).', userId, t);
    return null;
  }
  try {
    return await c.pushMessage(userId, { type: 'text', text: t });
  } catch (e) {
    const detail =
      e?.originalError?.response?.data ||
      e?.response?.data ||
      e?.originalError?.response ||
      e?.response ||
      null;
    console.error('Daily reminder push error', detail || e);
    return null;
  }
}

async function pushLineMessage(toUserId, message) {
  const userId = String(toUserId || '').trim();
  if (!userId) return null;
  const msg = message && typeof message === 'object' ? message : null;
  if (!msg || !msg.type) return null;
  const c = ensureReminderClient();
  if (!c) {
    console.log('Daily reminder push skipped (no LINE_CHANNEL_ACCESS_TOKEN).', userId, msg);
    return null;
  }
  try {
    return await c.pushMessage(userId, msg);
  } catch (e) {
    const detail =
      e?.originalError?.response?.data ||
      e?.response?.data ||
      e?.originalError?.response ||
      e?.response ||
      null;
    console.error('Daily reminder push error', detail || e);
    return null;
  }
}

function buildDailyReminderFlexMessage({ timeHHMM } = {}) {
  const timeLabel = String(timeHHMM || '').trim();
  const title = 'เตือนจดรายรับรายจ่ายประจำวัน';
  const subtitle = timeLabel ? `วันนี้เวลา ${timeLabel} อย่าลืมจดนะ` : 'อย่าลืมจดนะ';
  return {
    type: 'flex',
    altText: title,
    contents: {
      type: 'bubble',
      styles: {
        header: { backgroundColor: '#ECFDF5' },
        body: { backgroundColor: '#FFFFFF' },
        footer: { backgroundColor: '#FFFFFF' },
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
              { type: 'text', text: title, weight: 'bold', size: 'lg', color: '#0F172A', wrap: true, flex: 1 },
              {
                type: 'box',
                layout: 'vertical',
                width: '22px',
                height: '22px',
                cornerRadius: '999px',
                backgroundColor: '#10B981',
                contents: [{ type: 'text', text: '⏰', align: 'center', gravity: 'center', color: '#FFFFFF', size: 'sm', weight: 'bold' }],
              },
            ],
          },
          { type: 'text', text: subtitle, size: 'sm', color: '#64748B', wrap: true },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '18px',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: 'พิมพ์รายการสั้นๆได้เลย เช่น',
            size: 'sm',
            color: '#0F172A',
            weight: 'bold',
            wrap: true,
          },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              { type: 'text', text: '• ผัดกระเพรา 20', size: 'sm', color: '#334155', wrap: true },
              { type: 'text', text: '• จ่าย 100 ข้าวมันไก่', size: 'sm', color: '#334155', wrap: true },
              { type: 'text', text: '• รับ 20000 เงินเดือน', size: 'sm', color: '#334155', wrap: true },
            ],
          },
          {
            type: 'text',
            text: 'หรือถาม “วันนี้ใช้ไปเท่าไหร่” ',
            size: 'sm',
            color: '#64748B',
            wrap: true,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '16px',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'link',
            action: { type: 'postback', label: 'เปิดในเว็บ', data: 'action=web_login' },
          },
        ],
      },
    },
  };
}

	function formatThb(amount) {
	  const n = Number(amount) || 0;
	  return `฿${n.toLocaleString('th-TH', { maximumFractionDigits: 0 })}`;
	}

	function iconKeyToEmoji(iconKey) {
	  const raw = String(iconKey || '').trim();
	  if (!raw) return '📌';
	  if (!/^[a-z0-9_ -]+$/i.test(raw) && raw.length <= 8) return raw;
	  const key = raw.toLowerCase().replace(/\s+/g, '_');
	  const map = {
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
	    home: '🏠',
	    fuel: '⛽️',
	    education: '🎓',
	    work: '💼',
	    pet: '🐾',
	  };
	  return map[key] || '📌';
	}

const BANGKOK_TZ = 'Asia/Bangkok';
const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

function getBangkokYearMonthIndex(dateInput) {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;
  try {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: BANGKOK_TZ, year: 'numeric', month: '2-digit' }).formatToParts(d);
    const map = {};
    parts.forEach((p) => { if (p?.type) map[p.type] = p.value; });
    const year = Number(map.year);
    const month = Number(map.month);
    if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
    return { year, monthIndex: month - 1 };
  } catch {
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  }
}

function toThaiMonthLabel(dateInput) {
  const p = getBangkokYearMonthIndex(dateInput);
  if (!p) return '';
  const monthName = MONTH_NAMES_TH[p.monthIndex] || '';
  const buddhistYear = p.year + 543;
  if (!monthName || !Number.isFinite(buddhistYear)) return '';
  return `${monthName} ${buddhistYear}`;
}

function getBangkokMonthRange(dateInput) {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(d.getTime())) return null;

  const bangkokMs = d.getTime() + 7 * 60 * 60 * 1000;
  const bd = new Date(bangkokMs);
  const year = bd.getUTCFullYear();
  const month = bd.getUTCMonth();
  const startUtcMs = Date.UTC(year, month, 1, 0, 0, 0, 0) - 7 * 60 * 60 * 1000;
  const endUtcMs = Date.UTC(year, month + 1, 1, 0, 0, 0, 0) - 7 * 60 * 60 * 1000;
  return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
}

	function buildCategoryBudgetOverFlexMessage({ monthLabel, categoryName, categoryIcon, spent, budgetTotal, overAmount, pct } = {}) {
	  const safeMonth = String(monthLabel || '').trim();
	  const safeCategory = String(categoryName || '').trim() || 'หมวดหมู่';
	  const safeIcon = iconKeyToEmoji(categoryIcon);
	  const safeSpent = Number(spent) || 0;
	  const safeBudget = Number(budgetTotal) || 0;
	  const safeOver = Number(overAmount) || 0;
	  const safePct = Math.max(0, Math.round(Number(pct) || 0));

  const pctClamped = Math.max(0, Math.min(160, safePct));
  const barFill = Math.max(1, Math.min(100, pctClamped));
  const barRest = Math.max(1, 100 - Math.min(100, barFill));

  return {
    type: 'flex',
    altText: `เกินงบหมวด ${safeCategory} (${safeMonth || 'เดือนนี้'})`,
    contents: {
      type: 'bubble',
      styles: {
        header: { backgroundColor: '#FEF2F2' },
        body: { backgroundColor: '#FFFFFF' },
        footer: { backgroundColor: '#FFFFFF' },
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
              { type: 'text', text: `${safeIcon} เกินงบแล้ว`, size: 'lg', weight: 'bold', color: '#991B1B', flex: 1, wrap: true },
              {
                type: 'box',
                layout: 'vertical',
                paddingAll: '6px',
                paddingStart: '12px',
                paddingEnd: '12px',
                cornerRadius: '999px',
                backgroundColor: '#FEE2E2',
                flex: 0,
                contents: [{ type: 'text', text: `${safePct}%`, size: 'xs', weight: 'bold', color: '#991B1B', align: 'center' }],
              },
            ],
          },
          ...(safeMonth ? [{ type: 'text', text: safeMonth, size: 'sm', color: '#64748B', wrap: true }] : []),
          { type: 'text', text: safeCategory, size: 'md', weight: 'bold', color: '#0F172A', wrap: true },
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
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'ใช้งบไป', size: 'sm', color: '#64748B', flex: 1 },
              { type: 'text', text: formatThb(safeSpent), size: 'sm', weight: 'bold', color: '#0F172A', flex: 0 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'งบที่ตั้งไว้', size: 'sm', color: '#64748B', flex: 1 },
              { type: 'text', text: formatThb(safeBudget), size: 'sm', weight: 'bold', color: '#0F172A', flex: 0 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              { type: 'text', text: 'เกินงบ', size: 'sm', color: '#DC2626', flex: 1, weight: 'bold' },
              { type: 'text', text: formatThb(safeOver), size: 'sm', weight: 'bold', color: '#DC2626', flex: 0 },
            ],
          },
          {
            type: 'box',
            layout: 'horizontal',
            height: '10px',
            cornerRadius: '999px',
            backgroundColor: '#E2E8F0',
            contents: [
              { type: 'box', layout: 'vertical', flex: barFill, backgroundColor: '#EF4444', cornerRadius: '999px', contents: [] },
              { type: 'box', layout: 'vertical', flex: barRest, backgroundColor: '#00000000', contents: [] },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        paddingAll: '14px',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            action: { type: 'postback', label: 'ดูสรุปเดือนนี้', data: 'action=summary_month' },
          },
          {
            type: 'button',
            style: 'primary',
            color: '#10B981',
            action: { type: 'postback', label: 'เปิดในเว็บ', data: 'action=web_login' },
          },
        ],
      },
    },
  };
}

let budgetAlertTickInFlight = false;
setInterval(async () => {
  if (budgetAlertTickInFlight) return;
  budgetAlertTickInFlight = true;
  try {
    const monthLabel = toThaiMonthLabel(Date.now());
    if (!monthLabel) return;

    const monthRange = getBangkokMonthRange(new Date());
    if (!monthRange?.start || !monthRange?.end) return;

    // Only alert for expense category budgets in the current month.
    const budgets = await Budget.find({ month: monthLabel, total: { $gt: 0 } })
      .select({ userId: 1, category: 1, categoryId: 1, total: 1 })
      .lean()
      .catch(() => []);
    if (!Array.isArray(budgets) || budgets.length === 0) return;

    const userIds = Array.from(new Set(budgets.map((b) => String(b?.userId || '')).filter(Boolean)));
    const catIds = Array.from(new Set(budgets.map((b) => String(b?.category || b?.categoryId || '')).filter(Boolean)));
    if (userIds.length === 0 || catIds.length === 0) return;

    const [users, cats] = await Promise.all([
      User.find({
        _id: { $in: userIds },
        lineMessagingUserId: { $exists: true, $ne: '' },
        lineBudgetAlertsEnabled: { $ne: false },
      })
        .select({ _id: 1, lineMessagingUserId: 1, name: 1 })
        .lean()
        .catch(() => []),
      Category.find({ _id: { $in: catIds } })
        .select({ _id: 1, name: 1, icon: 1, type: 1 })
        .lean()
        .catch(() => []),
    ]);

    const pushIdByUserId = new Map((users || []).map((u) => [String(u._id), String(u?.lineMessagingUserId || '').trim()]));
    const catById = new Map((cats || []).map((c) => [String(c._id), c]));

    // Aggregate month spending by user+category (expense only).
    const spendRows = await Transaction.aggregate([
      {
        $match: {
          userId: { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) },
          type: 'expense',
          datetime: { $gte: monthRange.start, $lt: monthRange.end },
          categoryId: { $in: catIds.map((id) => new mongoose.Types.ObjectId(id)) },
        },
      },
      {
        $group: {
          _id: { userId: '$userId', categoryId: '$categoryId' },
          total: { $sum: '$amount' },
        },
      },
    ]).catch(() => []);

    const spentMap = new Map(
      (spendRows || []).map((r) => [`${String(r?._id?.userId)}_${String(r?._id?.categoryId)}`, Number(r?.total) || 0])
    );

    const states = await BudgetAlertState.find({ userId: { $in: userIds }, month: monthLabel })
      .select({ userId: 1, categoryId: 1, lastStage: 1 })
      .lean()
      .catch(() => []);
    const stateMap = new Map((states || []).map((s) => [`${String(s.userId)}_${String(s.categoryId)}`, Number(s?.lastStage) || 0]));

    const toNotify = [];
    for (const b of budgets) {
      const uid = String(b?.userId || '');
      const pushId = pushIdByUserId.get(uid);
      if (!pushId) continue;

      const catId = String(b?.category || b?.categoryId || '');
      if (!catId) continue;
      const cat = catById.get(catId);
      if (cat && String(cat.type || '').toLowerCase() !== 'expense') continue;

      const budgetTotal = Number(b?.total) || 0;
      if (!(budgetTotal > 0)) continue;

      const spent = spentMap.get(`${uid}_${catId}`) || 0;
      const pct = budgetTotal > 0 ? (spent / budgetTotal) * 100 : 0;
      if (pct < 100) continue; // only "over budget" notifications

      const lastStage = stateMap.get(`${uid}_${catId}`) || 0;
      const stage = 100;
      if (lastStage >= stage) continue;

      toNotify.push({
        userId: uid,
        pushId,
        monthLabel,
        categoryId: catId,
        categoryName: String(cat?.name || '').trim() || 'หมวดหมู่',
        categoryIcon: String(cat?.icon || '').trim(),
        spent,
        budgetTotal,
        overAmount: Math.max(0, spent - budgetTotal),
        pct,
        stage,
      });
    }

    if (toNotify.length === 0) return;

    // Send and persist state.
    for (const n of toNotify.slice(0, 200)) {
      try {
        const flex = buildCategoryBudgetOverFlexMessage(n);
        const sent = await pushLineMessage(n.pushId, flex);
        if (!sent) continue;
        await BudgetAlertState.updateOne(
          { userId: n.userId, month: monthLabel, categoryId: n.categoryId },
          { $set: { lastStage: n.stage, lastSentAt: new Date() } },
          { upsert: true }
        ).catch(() => {});
      } catch (e) {
        console.error('Budget alert push error', e);
      }
    }
  } catch (e) {
    console.error('Budget alert tick error', e);
  } finally {
    budgetAlertTickInFlight = false;
  }
}, 60 * 1000);

let reminderTickInFlight = false;
setInterval(async () => {
  if (reminderTickInFlight) return;
  reminderTickInFlight = true;
  try {
    const { dateKey, hhmm } = getBangkokNowParts();
    if (!dateKey || !hhmm) return;

    const due = await ReminderSetting.find({
      enabled: true,
      timeHHMM: hhmm,
      lastSentDate: { $ne: dateKey },
    }).limit(500).lean();
    if (!Array.isArray(due) || due.length === 0) return;

	    for (const s of due) {
	      try {
	        const user = await User.findById(s.userId).select({ lineMessagingUserId: 1, name: 1 }).lean();
	        const pushId = String(user?.lineMessagingUserId || '').trim();
	        if (!pushId) continue;

        const flex = buildDailyReminderFlexMessage({ timeHHMM: s?.timeHHMM });
        const sentFlex = await pushLineMessage(pushId, flex);
        const sent = sentFlex || (await pushLineText(pushId, flex?.altText || 'เตือนจดรายรับรายจ่ายประจำวัน'));
        if (!sent) continue;

        await ReminderSetting.updateOne(
          { _id: s._id },
          { $set: { lastSentDate: dateKey, lastSentAt: new Date() } }
        ).catch(() => {});
      } catch (e) {
        console.error('Daily reminder tick item error', e);
      }
    }
  } catch (e) {
    console.error('Daily reminder tick error', e);
  } finally {
    reminderTickInFlight = false;
  }
}, 20 * 1000);

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
