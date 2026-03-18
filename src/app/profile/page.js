"use client";
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import LoadingMascot from '@/components/LoadingMascot';
import {
	  User,
	  LogOut,
	  ChevronRight,
	  ChevronDown,
	  Check,
	  Trophy,
	  Moon,
	  BellRing,
	  Brain,
	  Languages,
  Trash2,
  LayoutGrid,
  Pencil,
  Flame,
} from 'lucide-react';

// Use same-origin requests in the browser and rely on Next.js `rewrites()` to reach the backend.
const API_BASE = '';
const BANGKOK_TZ = 'Asia/Bangkok';
const LEVEL_DAYS = 7;
const USAGE_STATS_CACHE_KEY = 'balanz_usage_stats_cache_v1';

const buildTimeOptions = (stepMinutes = 15) => {
  const step = Math.max(1, Math.min(60, Number(stepMinutes) || 15));
  const out = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += step) {
      out.push(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`);
    }
  }
  return out;
};

const I18N = {
  th: {
    loading: 'กำลังโหลดข้อมูล...',
    user_fallback: 'ผู้ใช้งาน',
    usage_stats: 'สถิติการใช้งาน',
    savings_goal: 'เป้าหมายการออม',
    streak_days: '{count} วันต่อเนื่อง',
    stats_calculating: 'กำลังคำนวณสถิติ...',
    stats_failed: 'โหลดสถิติไม่สำเร็จ',
    stats_logged_today: 'วันนี้จดแล้ว เยี่ยมมาก',
    stats_log_today: 'จดวันนี้เพื่อรักษาสถิติ',
    next_daily_log: 'สถิติการจดรายวันถัดไป',
    next_level_in_days: 'เลเวลต่อไปใน {count} วัน',
    updated_at: 'อัปเดตล่าสุด {time}',
    dark_mode: 'โหมดกลางคืน',
    reminder: 'เตือนจดประจำวัน',
    budget_alerts: 'แจ้งเตือนเกินงบ',
    language: 'ภาษา',
    categories: 'ตั้งค่าหมวด',
    clear_all: 'ลบรายการทั้งหมด',
    reminder_on: 'เปิด {time}',
    budget_alerts_on: 'เปิด',
    lang_th: 'ไทย',
    lang_en: 'English',
    logout: 'ออกจากระบบ',

    modal_reminder: 'เตือนจดประจำวัน',
    modal_budget_alerts: 'แจ้งเตือนเกินงบ',
    modal_autocat: 'จัดหมวดด้วยความจำ',
    modal_language: 'ภาษา',
    modal_clear_all: 'ลบรายการทั้งหมด',
    modal_categories: 'ตั้งค่าหมวด',

	    enable_daily_reminder: 'เปิดการเตือนรายวัน',
	    reminder_time: 'เวลาเตือน',
	    reminder_selected_time: 'เวลาที่เลือก',
	    reminder_presets: 'เวลาแนะนำ',
	    reminder_pick_step: 'เลือกเวลา (ทุก {minutes} นาที)',
	    reminder_custom_time: 'กำหนดเอง',
	    cancel: 'ยกเลิก',
	    save: 'บันทึก',

    enable_budget_alerts: 'เปิดแจ้งเตือนเกินงบ',
    budget_alerts_desc: 'ส่งแจ้งเตือนเข้า LINE เมื่อใช้จ่ายเกินงบที่ตั้งไว้ (เฉพาะหมวดรายจ่าย)',

    enable_autocat: 'เปิดจัดหมวดอัตโนมัติจากข้อความ/จำนวน',
    autocat_desc: 'เมื่อเปิด ระบบจะพยายามเดาหมวดหมู่จากหมายเหตุและจำนวนเงิน',

    language_desc: 'ตั้งค่าภาษาสำหรับแอป (บันทึกไว้ในเครื่องนี้)',

    clear_all_warning: 'การลบนี้จะลบ “รายการทั้งหมด” ของคุณแบบถาวร และไม่สามารถกู้คืนได้',
    type_delete_to_confirm: 'พิมพ์คำว่า DELETE เพื่อยืนยัน',
    deleting: 'กำลังลบ...',
    delete_all_btn: 'ลบทั้งหมด',

    categories_desc: 'จัดการหมวดหมู่ของคุณ (เพิ่ม/แก้ไข/ลบ)',
    close: 'ปิด',
    go_to_categories: 'ไปที่หมวดหมู่',

    leaderboard_title: 'อันดับการจดต่อเนื่อง',
    leaderboard_loading: 'กำลังโหลดอันดับ...',
    leaderboard_empty: 'ยังไม่มีข้อมูลอันดับ',
    days: '{count} วัน',

    logout_title: 'ออกจากระบบ',
    logout_desc: 'คุณจะถูกออกจากระบบและต้องเข้าสู่ระบบใหม่เพื่อใช้งานต่อ',

    login_required: 'กรุณาเข้าสู่ระบบ',
    login_to_view_profile: 'กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์',
    login_to_link: 'กรุณาเข้าสู่ระบบก่อนเชื่อมบัญชี',
    login_to_view_stats: 'กรุณาเข้าสู่ระบบเพื่อดูสถิติ',
    file_too_large: 'ไฟล์ใหญ่เกินไป (สูงสุด 5MB)',
    avatar_uploaded: 'อัปโหลดรูปภาพสำเร็จ',
    avatar_upload_failed: 'ไม่สามารถอัปโหลดรูปภาพ',
    confirm_delete_avatar: 'คุณต้องการลบรูปโปรไฟล์ใช่หรือไม่?',
    avatar_deleted: 'ลบรูปโปรไฟล์สำเร็จ',
    profile_load_failed: 'ไม่สามารถโหลดข้อมูลโปรไฟล์',
    save_success: 'บันทึกข้อมูลสำเร็จ',
    save_failed: 'ไม่สามารถบันทึกข้อมูล',
    linking_line: 'กำลังเชื่อม LINE...',
    line_linked: 'เชื่อม LINE สำเร็จ',
    link_failed: 'เชื่อมบัญชีไม่สำเร็จ',
    txns_load_failed: 'ไม่สามารถโหลดธุรกรรมได้',
    stats_load_failed: 'ไม่สามารถโหลดสถิติได้',
    leaderboard_missing: 'Backend ยังไม่มี endpoint Leaderboard (ลองรีสตาร์ท server ที่พอร์ต 5050)',
	    leaderboard_failed: 'ไม่สามารถโหลดอันดับได้',
	    reminder_saved: 'บันทึกการเตือนเรียบร้อย',
	    reminder_save_failed: 'บันทึกการเตือนไม่สำเร็จ',
	    reminder_need_link_line: 'ยังไม่ได้เชื่อม LINE (Messaging) — จะส่งเตือนเข้าไลน์ไม่ได้',
	    reminder_saved_but_need_link_line: 'บันทึกแล้ว แต่ยังไม่ได้เชื่อม LINE — ยังส่งเตือนไม่ได้',
      budget_alerts_saved: 'บันทึกการแจ้งเตือนเกินงบเรียบร้อย',
      budget_alerts_save_failed: 'บันทึกการแจ้งเตือนเกินงบไม่สำเร็จ',
      budget_alerts_need_link_line: 'ยังไม่ได้เชื่อม LINE (Messaging) — จะส่งแจ้งเตือนไม่ได้',
      budget_alerts_saved_but_need_link_line: 'บันทึกแล้ว แต่ยังไม่ได้เชื่อม LINE — ยังส่งแจ้งเตือนไม่ได้',
	    autocat_saved: 'บันทึกการจัดหมวดเรียบร้อย',
	    language_saved: 'บันทึกภาษาเรียบร้อย',
	    delete_failed: 'ลบรายการไม่สำเร็จ',
	    deleted_all_success: 'ลบรายการทั้งหมดแล้ว ({count} รายการ)',
	  },
  en: {
    loading: 'Loading…',
    user_fallback: 'User',
    usage_stats: 'Usage stats',
    savings_goal: 'Savings goal',
    streak_days: '{count}-day streak',
    stats_calculating: 'Calculating stats…',
    stats_failed: 'Failed to load stats',
    stats_logged_today: 'Logged today — nice!',
    stats_log_today: 'Log today to keep your streak',
    next_daily_log: 'Next daily logging',
    next_level_in_days: 'Next level in {count} days',
    updated_at: 'Updated {time}',
    dark_mode: 'Dark mode',
    reminder: 'Daily reminder',
    budget_alerts: 'Over-budget alerts',
    language: 'Language',
    categories: 'Categories',
    clear_all: 'Delete all transactions',
    reminder_on: 'On {time}',
    budget_alerts_on: 'On',
    lang_th: 'Thai',
    lang_en: 'English',
    logout: 'Log out',

    modal_reminder: 'Daily reminder',
    modal_budget_alerts: 'Over-budget alerts',
    modal_autocat: 'Auto categorize',
    modal_language: 'Language',
    modal_clear_all: 'Delete all',
    modal_categories: 'Categories',

	    enable_daily_reminder: 'Enable daily reminder',
	    reminder_time: 'Reminder time',
	    reminder_selected_time: 'Selected time',
	    reminder_presets: 'Presets',
	    reminder_pick_step: 'Pick a time (every {minutes} min)',
	    reminder_custom_time: 'Custom',
	    cancel: 'Cancel',
	    save: 'Save',

    enable_budget_alerts: 'Enable over-budget alerts',
    budget_alerts_desc: 'Send a LINE notification when you go over your expense budgets.',

    enable_autocat: 'Enable auto-categorization from text/amount',
    autocat_desc: 'When enabled, we will try to guess the category from notes and amount.',

    language_desc: 'Choose your app language (saved on this device)',

    clear_all_warning: 'This will permanently delete all your transactions and cannot be undone.',
    type_delete_to_confirm: 'Type DELETE to confirm',
    deleting: 'Deleting…',
    delete_all_btn: 'Delete all',

    categories_desc: 'Manage your categories (add/edit/delete)',
    close: 'Close',
    go_to_categories: 'Go to categories',

    leaderboard_title: 'Streak leaderboard',
    leaderboard_loading: 'Loading leaderboard…',
    leaderboard_empty: 'No leaderboard data yet',
    days: '{count} days',

    logout_title: 'Log out',
    logout_desc: 'You will be logged out and need to sign in again to continue.',

    login_required: 'Please sign in',
    login_to_view_profile: 'Please sign in to view your profile',
    login_to_link: 'Please sign in before linking your account',
    login_to_view_stats: 'Please sign in to view stats',
    file_too_large: 'File too large (max 5MB)',
    avatar_uploaded: 'Avatar uploaded',
    avatar_upload_failed: 'Failed to upload avatar',
    confirm_delete_avatar: 'Delete your profile photo?',
    avatar_deleted: 'Profile photo deleted',
    profile_load_failed: 'Failed to load profile',
    save_success: 'Saved successfully',
    save_failed: 'Failed to save',
    linking_line: 'Linking LINE…',
    line_linked: 'LINE linked',
    link_failed: 'Failed to link account',
    txns_load_failed: 'Failed to load transactions',
    stats_load_failed: 'Failed to load stats',
    leaderboard_missing: 'Backend is missing the Leaderboard endpoint (try restarting the server on port 5050).',
	    leaderboard_failed: 'Failed to load leaderboard',
	    reminder_saved: 'Reminder saved',
	    reminder_save_failed: 'Failed to save reminder',
	    reminder_need_link_line: 'LINE not linked — reminders cannot be sent to LINE',
	    reminder_saved_but_need_link_line: 'Saved, but LINE is not linked yet',
      budget_alerts_saved: 'Over-budget alerts saved',
      budget_alerts_save_failed: 'Failed to save over-budget alerts',
      budget_alerts_need_link_line: 'LINE not linked — alerts cannot be sent to LINE',
      budget_alerts_saved_but_need_link_line: 'Saved, but LINE is not linked yet',
	    autocat_saved: 'Auto-categorize saved',
	    language_saved: 'Language saved',
	    delete_failed: 'Delete failed',
	    deleted_all_success: 'Deleted all transactions ({count})',
	  },
};

const formatI18n = (template, vars) => {
  if (!template) return '';
  const text = String(template);
  const data = vars && typeof vars === 'object' ? vars : {};
  return text.replace(/\{(\w+)\}/g, (_, k) => {
    const v = data[k];
    return v === undefined || v === null ? '' : String(v);
  });
};

const toBangkokISODateKey = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en', {
      timeZone: BANGKOK_TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const map = {};
    for (const p of parts) {
      if (p?.type) map[p.type] = p.value;
    }
    const yyyy = map.year;
    const mm = map.month;
    const dd = map.day;
    if (!yyyy || !mm || !dd) return '';
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
};

const shiftBangkokISODateKey = (isoKey, deltaDays) => {
  if (!isoKey) return '';
  const base = new Date(`${isoKey}T00:00:00.000+07:00`);
  if (Number.isNaN(base.getTime())) return '';
  return toBangkokISODateKey(new Date(base.getTime() + deltaDays * 86400000));
};

export default function Profile() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);
  const [rankingOpen, setRankingOpen] = useState(false);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const fileInputId = 'avatar-file-input';
  const [usageStats, setUsageStats] = useState({
    loading: true,
    error: '',
    streakDays: 0,
    loggedToday: false,
    totalLoggedDays: 0,
    level: 1,
    progressPercent: 0,
    nextLevelInDays: LEVEL_DAYS,
  });
  const [usageStatsUpdatedAt, setUsageStatsUpdatedAt] = useState(0);

  const [rankingData, setRankingData] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [rankingError, setRankingError] = useState('');

  // Local feature settings (stored in localStorage)
  const [activeModal, setActiveModal] = useState(null); // 'reminder' | 'budgetAlerts' | 'autocat' | 'language' | 'clearAll' | 'categories'
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('08:00');
  const [reminderCanPush, setReminderCanPush] = useState(true);
  const [reminderTimeMenuOpen, setReminderTimeMenuOpen] = useState(false);
  const [budgetAlertEnabled, setBudgetAlertEnabled] = useState(true);
  const [budgetAlertCanPush, setBudgetAlertCanPush] = useState(true);
  const [autoCategorize, setAutoCategorize] = useState(false);
  const [language, setLanguage] = useState('th'); // 'th' | 'en'
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const reminderTimeOptionsRef = useRef(null);
  if (!reminderTimeOptionsRef.current) reminderTimeOptionsRef.current = buildTimeOptions(15);
  const reminderTimePresetsRef = useRef(null);
  if (!reminderTimePresetsRef.current) reminderTimePresetsRef.current = ['07:00', '08:00', '09:00', '12:00', '18:00', '20:00', '21:00', '22:00'];
  const reminderTimeMenuRootRef = useRef(null);
  const reminderTimeMenuPanelRef = useRef(null);
  const [reminderTimeMenuStyle, setReminderTimeMenuStyle] = useState(() => ({ left: 12, top: 12, width: 280, transform: 'translateY(0)' }));
  const [reminderTimeMenuMaxH, setReminderTimeMenuMaxH] = useState(320);

		  const recomputeReminderTimeMenu = useCallback(() => {
		    if (typeof window === 'undefined') return;
		    const btn = reminderTimeMenuRootRef.current;
		    if (!btn || !btn.getBoundingClientRect) return;
		    const rect = btn.getBoundingClientRect();
		    const vh = window.innerHeight || document.documentElement?.clientHeight || 0;
		    const vw = window.innerWidth || document.documentElement?.clientWidth || 0;
		    if (!vh) return;

		    const margin = 12;
		    const below = Math.max(0, vh - rect.bottom - margin);
		    const above = Math.max(0, rect.top - margin);
		    const minNeeded = 280;
		    const preferUp = below < minNeeded && above > below;
		    const available = preferUp ? above : below;
		    setReminderTimeMenuMaxH(Math.max(220, Math.min(420, Math.floor(available - 8))));

		    const maxWidth = Math.max(0, vw - margin * 2);
		    const width = Math.max(220, Math.min(rect.width || 320, maxWidth || rect.width || 320));
		    const left = Math.min(Math.max(rect.left || margin, margin), Math.max(margin, vw - margin - width));
		    const top = preferUp ? (rect.top - 8) : (rect.bottom + 8);
		    const transform = preferUp ? 'translateY(-100%)' : 'translateY(0)';
		    setReminderTimeMenuStyle({ left, top, width, transform });
		  }, []);

  const t = useCallback((key, vars) => {
    const dict = I18N[language] || I18N.th;
    const template = dict?.[key] ?? I18N.th?.[key] ?? key;
    return formatI18n(template, vars);
  }, [language]);

  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = language === 'en' ? 'en' : 'th';
    } catch {}
  }, [language]);

  // Lock background scroll when any modal is open.
  useEffect(() => {
    const locked = Boolean(activeModal || rankingOpen || confirmLogoutOpen);
    if (!locked) return;

    const body = document.body;
    const prevOverflow = body.style.overflow;
    const prevPaddingRight = body.style.paddingRight;

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPaddingRight;
    };
  }, [activeModal, rankingOpen, confirmLogoutOpen]);

  useEffect(() => {
    try {
      const rEn = localStorage.getItem('reminderEnabled');
      const rTime = localStorage.getItem('reminderTime');
      const bEn = localStorage.getItem('budgetAlertEnabled');
      const aCat = localStorage.getItem('autoCategorize');
      const lang = localStorage.getItem('balanz_lang');
      if (rEn !== null) setReminderEnabled(JSON.parse(rEn));
      if (rTime) setReminderTime(rTime);
      if (bEn !== null) setBudgetAlertEnabled(JSON.parse(bEn));
      if (aCat !== null) setAutoCategorize(JSON.parse(aCat));
      if (lang === 'en' || lang === 'th') setLanguage(lang);
    } catch (e) {}
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/reminders`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (cancelled) return;
        if (typeof data?.enabled === 'boolean') setReminderEnabled(Boolean(data.enabled));
        if (typeof data?.time === 'string' && data.time) setReminderTime(String(data.time));
        if (typeof data?.canPush === 'boolean') setReminderCanPush(Boolean(data.canPush));
      } catch {
        // ignore: fall back to localStorage
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/notification-settings`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (cancelled) return;
        if (typeof data?.budgetOverLineEnabled === 'boolean') setBudgetAlertEnabled(Boolean(data.budgetOverLineEnabled));
        if (typeof data?.canPush === 'boolean') setBudgetAlertCanPush(Boolean(data.canPush));
      } catch {
        // ignore: fall back to localStorage
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!reminderTimeMenuOpen) return;
    recomputeReminderTimeMenu();
    const onKey = (e) => {
      if (e.key === 'Escape') setReminderTimeMenuOpen(false);
    };
    const onDown = (e) => {
      const root = reminderTimeMenuRootRef.current;
      const panel = reminderTimeMenuPanelRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      if (panel && panel.contains && panel.contains(e.target)) return;
      setReminderTimeMenuOpen(false);
    };
    const onResize = () => recomputeReminderTimeMenu();
    const onScroll = () => recomputeReminderTimeMenu();
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('touchstart', onDown, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [reminderTimeMenuOpen, recomputeReminderTimeMenu]);

  useEffect(() => {
    try {
      const v = localStorage.getItem('balanz_theme');
      setTheme(v === 'light' ? 'light' : 'dark');
    } catch {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (!rankingOpen) return;
    let cancelled = false;
    const controller = new AbortController();
    const fetchRanking = async () => {
      try {
        setRankingLoading(true);
        setRankingError('');
        const token = localStorage.getItem('token');
        if (!token) throw new Error(tRef.current('login_required'));

        const res = await fetch(`${API_BASE}/api/leaderboard/streak?limit=10`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (!res.ok) {
          const contentType = String(res.headers.get('content-type') || '');
          const text = await res.text().catch(() => '');
          const looksLikeMissingRoute =
            contentType.includes('text/html') ||
            /Cannot\s+GET\s+\/api\/leaderboard\/streak/i.test(text);
          if (looksLikeMissingRoute) {
            throw new Error(tRef.current('leaderboard_missing'));
          }
          throw new Error(text || tRef.current('leaderboard_failed'));
        }
        const data = await res.json();
        const list = Array.isArray(data?.leaderboard) ? data.leaderboard : [];
        const mapped = list.map((u) => ({
          name: u?.name || tRef.current('user_fallback'),
          days: Number(u?.days ?? u?.streakDays) || 0,
        }));
        if (!cancelled) setRankingData(mapped);
      } catch (err) {
        if (!cancelled && err?.name !== 'AbortError') {
          setRankingError(err?.message ? String(err.message) : tRef.current('leaderboard_failed'));
          setRankingData([]);
        }
      } finally {
        if (!cancelled) setRankingLoading(false);
      }
    };
    fetchRanking();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [rankingOpen]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    try {
      localStorage.setItem('balanz_theme', next);
    } catch {}
    setTheme(next);
    try {
      window.dispatchEvent(new Event('balanz_theme_change'));
    } catch {}
  };

  const openModal = (key) => {
    if (key === 'clearAll') setDeleteConfirmText('');
    setActiveModal(key);
  };
  const closeModal = () => setActiveModal(null);

  const saveReminder = async () => {
    setError('');
    try {
      localStorage.setItem('reminderEnabled', JSON.stringify(reminderEnabled));
      localStorage.setItem('reminderTime', reminderTime);
    } catch {}

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await fetch(`${API_BASE}/api/reminders`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ enabled: reminderEnabled, time: reminderTime }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || t('reminder_save_failed'));
        if (typeof data?.canPush === 'boolean') setReminderCanPush(Boolean(data.canPush));
        if (reminderEnabled && data?.canPush === false) setSuccess(t('reminder_saved_but_need_link_line'));
        else setSuccess(t('reminder_saved'));
      } else {
        setSuccess(t('reminder_saved'));
      }
      setTimeout(() => setSuccess(''), 3000);
      closeModal();
    } catch (e) {
      setError(e?.message ? String(e.message) : t('reminder_save_failed'));
    }
  };

  const saveBudgetAlerts = async () => {
    setError('');
    try {
      localStorage.setItem('budgetAlertEnabled', JSON.stringify(budgetAlertEnabled));
    } catch {}

    try {
      const token = localStorage.getItem('token');
      if (token) {
        const res = await fetch(`${API_BASE}/api/notification-settings`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ budgetOverLineEnabled: budgetAlertEnabled }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || t('budget_alerts_save_failed'));
        if (typeof data?.canPush === 'boolean') setBudgetAlertCanPush(Boolean(data.canPush));
        if (budgetAlertEnabled && data?.canPush === false) setSuccess(t('budget_alerts_saved_but_need_link_line'));
        else setSuccess(t('budget_alerts_saved'));
      } else {
        setSuccess(t('budget_alerts_saved'));
      }
      setTimeout(() => setSuccess(''), 3000);
      closeModal();
    } catch (e) {
      setError(e?.message ? String(e.message) : t('budget_alerts_save_failed'));
    }
  };

  const saveAutoCategorize = () => {
    try {
      localStorage.setItem('autoCategorize', JSON.stringify(autoCategorize));
      setSuccess(t('autocat_saved'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (e) {}
    closeModal();
  };

  const saveLanguage = () => {
    try {
      localStorage.setItem('balanz_lang', language);
    } catch {}
    try {
      document.documentElement.lang = language === 'en' ? 'en' : 'th';
      window.dispatchEvent(new Event('balanz_lang_change'));
    } catch {}
    setSuccess(t('language_saved'));
    setTimeout(() => setSuccess(''), 3000);
    closeModal();
  };

  const deleteAllTransactions = async () => {
    if (deleteAllLoading) return;
    try {
      setDeleteAllLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      if (!token) throw new Error(t('login_required'));
      const res = await fetch(`${API_BASE}/api/transactions/all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || t('delete_failed'));
      }
      setSuccess(t('deleted_all_success', { count: Number(data?.deletedCount) || 0 }));
      setTimeout(() => setSuccess(''), 3500);
      setDeleteConfirmText('');
      closeModal();
    } catch (err) {
      setError(err?.message ? String(err.message) : t('delete_failed'));
    } finally {
      setDeleteAllLoading(false);
    }
  };

  // --- Logic เดิม (Fetch, Upload, Update) ---
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError(tRef.current('login_to_view_profile'));
          setLoading(false);
          return;
        }

        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setUser({ name: data.name, email: data.email });
          if (data.profilePic) {
            setAvatarUrl(data.profilePic);
            try { localStorage.setItem('avatarUrl', data.profilePic); } catch {}
          } else if (data.avatarUrl) {
            setAvatarUrl(data.avatarUrl);
            try { localStorage.setItem('avatarUrl', data.avatarUrl); } catch {}
          } else {
            const localAvatar = localStorage.getItem('avatarUrl');
            if (localAvatar) setAvatarUrl(localAvatar);
          }
        } else {
          setError(data.message || tRef.current('profile_load_failed'));
        }
        setLoading(false);
      } catch (error) {
        setError(tRef.current('profile_load_failed'));
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  // Auto-link LINE chat (Messaging API) to this web account when arriving with ?linkCode=xxxxxx
  useEffect(() => {
    const code = searchParams?.get('linkCode');
    if (!code) return;

    let cancelled = false;
    const controller = new AbortController();

    const run = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) throw new Error(tRef.current('login_to_link'));

        setError('');
        setSuccess(tRef.current('linking_line'));
        const res = await fetch(`${API_BASE}/api/auth/link-line-messaging`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ code }),
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || tRef.current('link_failed'));

        if (!cancelled) {
          setSuccess(tRef.current('line_linked'));
          setTimeout(() => setSuccess(''), 3000);
          // remove linkCode from URL
          try { router.replace('/profile'); } catch {}
        }
      } catch (e) {
        if (!cancelled && e?.name !== 'AbortError') {
          setError(e?.message ? String(e.message) : tRef.current('link_failed'));
          setSuccess('');
          try { router.replace('/profile'); } catch {}
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [searchParams, router]);

  const refreshUsageStats = useCallback(async (signal) => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUsageStats((prev) => ({ ...prev, loading: false, error: tRef.current('login_to_view_stats') }));
      return;
    }

    setUsageStats((prev) => ({ ...prev, loading: true, error: '' }));
    const res = await fetch(`${API_BASE}/api/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(text || tRef.current('txns_load_failed'));
    }
    const transactions = await res.json();
    const list = Array.isArray(transactions) ? transactions : [];

    const dayKeys = new Set();
    for (const t of list) {
      const dt = t?.date || t?.datetime || t?.createdAt;
      const key = dt ? toBangkokISODateKey(dt) : '';
      if (key) dayKeys.add(key);
    }

    const todayKey = toBangkokISODateKey(Date.now());
    const yesterdayKey = shiftBangkokISODateKey(todayKey, -1);
    const loggedToday = Boolean(todayKey && dayKeys.has(todayKey));

    const streakStartKey = loggedToday
      ? todayKey
      : (yesterdayKey && dayKeys.has(yesterdayKey) ? yesterdayKey : '');

    let streakDays = 0;
    if (streakStartKey) {
      let cursor = streakStartKey;
      while (cursor && dayKeys.has(cursor)) {
        streakDays += 1;
        cursor = shiftBangkokISODateKey(cursor, -1);
      }
    }

    const totalLoggedDays = dayKeys.size;
    const level = Math.floor(totalLoggedDays / LEVEL_DAYS) + 1;
    const daysIntoLevel = totalLoggedDays % LEVEL_DAYS;
    const progressPercent = Math.round((daysIntoLevel / LEVEL_DAYS) * 100);
    const nextLevelInDays = daysIntoLevel === 0 ? LEVEL_DAYS : (LEVEL_DAYS - daysIntoLevel);

    const computed = {
      loading: false,
      error: '',
      streakDays,
      loggedToday,
      totalLoggedDays,
      level,
      progressPercent,
      nextLevelInDays,
    };

    setUsageStats(computed);
    const now = Date.now();
    setUsageStatsUpdatedAt(now);
    try {
      localStorage.setItem(USAGE_STATS_CACHE_KEY, JSON.stringify({ updatedAt: now, ...computed }));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(USAGE_STATS_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object' && Number.isFinite(parsed.updatedAt)) {
        setUsageStats((prev) => ({
          ...prev,
          ...parsed,
          loading: true,
          error: '',
        }));
        setUsageStatsUpdatedAt(parsed.updatedAt);
      }
    } catch {}

    const controller = new AbortController();
    refreshUsageStats(controller.signal).catch((err) => {
      setUsageStats((prev) => ({
        ...prev,
        loading: false,
        error: err?.name === 'AbortError' ? '' : (err?.message ? String(err.message) : tRef.current('stats_load_failed')),
      }));
    });

    const onFocus = () => {
      const c = new AbortController();
      refreshUsageStats(c.signal).catch(() => {});
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') onFocus();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controller.abort();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refreshUsageStats]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: user.name }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ name: data.name, email: data.email });
        try { localStorage.setItem('name', data.name); } catch {}
        setSuccess(t('save_success'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || t('save_failed'));
      }
    } catch (error) {
      setError(t('save_failed'));
    }
  };

  const onPickFile = () => {
    const el = document.getElementById(fileInputId);
    if (el) el.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setError(t('file_too_large'));
      return;
    }
    
    try {
      setUploading(true);
      setError('');
      
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setAvatarUrl(reader.result);
      };
      reader.readAsDataURL(file);

      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch(`${API_BASE}/api/auth/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const raw = await res.text();
      let data; 
      try { data = JSON.parse(raw); } catch { data = { message: raw }; }
      
      if (res.ok && data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
        try { localStorage.setItem('avatarUrl', data.avatarUrl); } catch {}
        setSuccess(t('avatar_uploaded'));
        setTimeout(() => setSuccess(''), 3000);
      } else {
        try { localStorage.setItem('avatarUrl', avatarUrl); } catch {}
      }
    } catch (err) {
      console.error('Upload avatar failed', err);
      setError(t('avatar_upload_failed'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm(t('confirm_delete_avatar'))) return;

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      await fetch(`${API_BASE}/api/auth/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});

      setSuccess(t('avatar_deleted'));
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setUploading(false);
      setAvatarUrl('');
      try { localStorage.removeItem('avatarUrl'); } catch {}
    }
  };

  const performLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('avatarUrl');
      localStorage.removeItem('name');
    } catch {}
    window.location.href = '/';
  };

  const handleLogout = () => setConfirmLogoutOpen(true);
  const cancelLogout = () => setConfirmLogoutOpen(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <LoadingMascot label={t('loading')} size={88} />
      </div>
    );
  }

  const displayEmail = user.email && user.email.endsWith('@line.local')
    ? `LINE ID: ${user.email.replace('@line.local', '')}`
    : user.email;

  const streakDays = usageStats.streakDays || 0;
  const progressPercent = Number.isFinite(usageStats.progressPercent) ? usageStats.progressPercent : 0;
  const level = usageStats.level || 1;
  const nextLevelInDays = usageStats.nextLevelInDays || LEVEL_DAYS;

  return (
    <div className="min-h-[100dvh] bg-[var(--app-bg)] text-[color:var(--app-text)]">
      <div className="mx-auto w-full max-w-md lg:max-w-6xl px-3 sm:px-4 lg:px-6 pb-24 pt-8">

        {(error || success) && (
          <div
            className={[
              'mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold',
              error ? 'border-rose-400/20 bg-rose-500/10 text-rose-200' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-200',
            ].join(' ')}
          >
            {error || success}
          </div>
        )}

        <div className="mt-4 lg:mt-6 lg:grid lg:grid-cols-12 lg:gap-6">
          <div className="space-y-4 lg:col-span-5 lg:space-y-6 lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_20px_50px_-30px_rgba(0,0,0,0.25)]">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-[var(--app-surface-2)] ring-2 ring-emerald-400/50 p-0.5">
                    <div className="h-full w-full overflow-hidden rounded-full bg-[var(--app-surface)]">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[color:var(--app-muted)]">
                          <User className="h-7 w-7" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate text-lg font-extrabold text-[color:var(--app-text)]">{user.name || t('user_fallback')}</div>
                  {displayEmail ? (
                    <div className="mt-1 truncate text-xs font-semibold text-[color:var(--app-muted)]">{displayEmail}</div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_18px_40px_-28px_rgba(0,0,0,0.18)]">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('usage_stats')}</div>
              </div>
              <div className="mt-3 text-lg font-extrabold text-[color:var(--app-text)]">{t('savings_goal')}</div>

              <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/20">
                  <Flame className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('streak_days', { count: streakDays })}</div>
                  <div className="mt-0.5 text-xs font-semibold text-[color:var(--app-muted)]">
                    {usageStats.loading
                      ? t('stats_calculating')
                      : usageStats.error
                        ? t('stats_failed')
                        : usageStats.loggedToday
                          ? t('stats_logged_today')
                          : t('stats_log_today')}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-[color:var(--app-muted)]">
                  <span>{t('next_daily_log')}</span>
                  <span className="text-emerald-300">{progressPercent}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-[var(--app-surface-2)] ring-1 ring-[color:var(--app-border)] overflow-hidden">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }} />
                </div>
                <div className="mt-2 text-xs font-semibold text-[color:var(--app-muted-2)]">{t('next_level_in_days', { count: nextLevelInDays })}</div>
                {usageStatsUpdatedAt ? (
                  <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
                    {t('updated_at', { time: new Date(usageStatsUpdatedAt).toLocaleString(language === 'en' ? 'en-US' : 'th-TH') })}
                  </div>
                ) : null}
                {usageStats.error ? (
                  <div className="mt-2 text-[11px] font-semibold text-rose-200/90">
                    {usageStats.error}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-4 lg:col-span-7 lg:mt-0 lg:space-y-6">
            <div className="space-y-3">
              <button
                type="button"
                onClick={toggleTheme}
                className="w-full flex items-center justify-between rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-4 hover:bg-[var(--app-surface-3)] transition"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 text-slate-200">
                    <Moon className="h-5 w-5" />
                  </div>
                  <div className="text-sm font-extrabold">{t('dark_mode')}</div>
                </div>
                <div
                  className={[
                    'relative inline-flex h-7 w-12 items-center rounded-full transition',
                    theme === 'dark' ? 'bg-emerald-500' : 'bg-white/10 ring-1 ring-white/10',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  <span
                    className={[
                      'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
                      theme === 'dark' ? 'translate-x-6' : 'translate-x-1',
                    ].join(' ')}
                  />
                </div>
              </button>

              {[
                { key: 'reminder', label: t('reminder'), icon: BellRing, right: reminderEnabled ? t('reminder_on', { time: reminderTime }) : '', action: () => openModal('reminder') },
                { key: 'budgetAlerts', label: t('budget_alerts'), icon: BellRing, right: budgetAlertEnabled ? t('budget_alerts_on') : '', action: () => openModal('budgetAlerts') },
                { key: 'language', label: t('language'), icon: Languages, right: language === 'en' ? t('lang_en') : t('lang_th'), action: () => openModal('language') },
                { key: 'categories', label: t('categories'), icon: LayoutGrid, right: '', action: () => router.push('/budget') },
                { key: 'clearAll', label: t('clear_all'), icon: Trash2, right: '', action: () => openModal('clearAll') },
              ].map(({ key, label, icon: Icon, right, action }) => (
                <button
                  key={key}
                  type="button"
                  onClick={action}
                  className={[
                    'w-full flex items-center justify-between rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-4 hover:bg-[var(--app-surface-3)] transition',
                    key === 'clearAll' ? 'border-rose-400/25 bg-rose-500/10 hover:bg-rose-500/15' : '',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 text-slate-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-sm font-extrabold">{label}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {right ? <div className="text-xs font-semibold text-[color:var(--app-muted)]">{right}</div> : null}
                    <ChevronRight className="h-5 w-5 text-[color:var(--app-muted)]" />
                  </div>
                </button>
              ))}
            </div>

            <div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full rounded-2xl border border-rose-500/25 bg-rose-500/10 px-4 py-4 text-rose-200 font-extrabold hover:bg-rose-500/15 transition inline-flex items-center justify-center gap-3"
              >
                <LogOut className="h-5 w-5" />
                {t('logout')}
              </button>
              <div className="mt-5 text-center text-xs font-semibold text-[color:var(--app-muted-2)]">
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modals for features (portal to body so it stays above BottomNav/footer) */}
      {mounted && activeModal ? createPortal((
        <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+12px)] sm:pb-0">
          <div className="absolute inset-0 bg-black/50" onClick={closeModal} />
          <div className="bg-[var(--app-surface)] border border-[color:var(--app-border)] rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 w-full sm:max-w-md mx-auto p-5 max-h-[85dvh] sm:max-h-[90vh] overflow-auto text-[color:var(--app-text)]">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-white/10 ring-1 ring-white/10 sm:hidden" aria-hidden="true" />
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-extrabold">
                {activeModal === 'reminder'
                  ? t('modal_reminder')
                  : activeModal === 'budgetAlerts'
                    ? t('modal_budget_alerts')
                  : activeModal === 'autocat'
                    ? t('modal_autocat')
                    : activeModal === 'language'
                      ? t('modal_language')
                      : activeModal === 'clearAll'
                        ? t('modal_clear_all')
                        : t('modal_categories')}
              </h3>
              <button onClick={closeModal} className="text-[color:var(--app-muted)] hover:text-[color:var(--app-text)]">✕</button>
            </div>
            <div className="mt-4">
              {activeModal === 'reminder' && (
                <div className="space-y-4">
		                  <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4 flex items-center justify-between gap-4">
		                    <div className="min-w-0">
		                      <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('enable_daily_reminder')}</div>
		                      <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)] truncate">
		                        {reminderEnabled ? t('reminder_on', { time: reminderTime }) : '—'}
		                      </div>
		                    </div>
		                    <button
		                      type="button"
		                      onClick={() => setReminderEnabled((v) => !v)}
		                      className={[
		                        'relative inline-flex h-8 w-14 items-center rounded-full transition ring-1',
		                        reminderEnabled
		                          ? 'bg-emerald-500 ring-emerald-400/30'
		                          : 'bg-white/10 ring-white/10',
		                      ].join(' ')}
		                      role="switch"
		                      aria-checked={reminderEnabled}
		                      aria-label={t('enable_daily_reminder')}
		                    >
		                      <span
		                        className={[
		                          'inline-block h-6 w-6 transform rounded-full bg-white shadow transition',
		                          reminderEnabled ? 'translate-x-7' : 'translate-x-1',
		                        ].join(' ')}
		                      />
		                    </button>
		                  </div>
		                  {reminderEnabled && !reminderCanPush ? (
		                    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
		                      {t('reminder_need_link_line')}
		                    </div>
		                  ) : null}
		                  <div className={['rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4 space-y-4', reminderEnabled ? '' : 'opacity-60'].join(' ')}>
		                    <div className="flex items-center justify-between gap-3">
		                      <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('reminder_time')}</div>
		                      <div className="inline-flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-1.5">
		                        <div className="text-[11px] font-semibold text-emerald-200">{t('reminder_selected_time')}</div>
		                        <div className="text-sm font-extrabold text-slate-100 tabular-nums">{reminderTime}</div>
		                      </div>
		                    </div>

		                    <div>
		                      <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('reminder_presets')}</div>
		                      <div className="mt-2 grid grid-cols-4 gap-2">
		                        {reminderTimePresetsRef.current.map((v) => {
		                          const active = String(reminderTime) === String(v);
		                          return (
		                            <button
		                              key={v}
		                              type="button"
		                              onClick={() => setReminderTime(v)}
		                              disabled={!reminderEnabled}
		                              className={[
		                                'h-10 rounded-2xl border text-sm font-extrabold transition',
		                                'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
		                                active
		                                  ? 'border-emerald-400/30 bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
		                                  : 'border-white/10 bg-white/5 text-[color:var(--app-text)] hover:bg-white/10',
		                                !reminderEnabled ? 'cursor-not-allowed' : '',
		                              ].join(' ')}
		                              aria-pressed={active}
		                            >
		                              {v}
		                            </button>
		                          );
		                        })}
		                      </div>
		                    </div>

		                    <div className="grid grid-cols-1 gap-3">
			                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
			                        <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">
			                          {t('reminder_pick_step', { minutes: 15 })}
			                        </div>
			                        <div className="mt-2 relative">
			                          <button
			                            type="button"
			                            disabled={!reminderEnabled}
			                            onClick={() => setReminderTimeMenuOpen((v) => !v)}
			                            ref={reminderTimeMenuRootRef}
			                            className={[
			                              'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left',
			                              'outline-none focus:ring-2 focus:ring-emerald-400/30',
			                              'hover:bg-white/10 transition',
			                              !reminderEnabled ? 'cursor-not-allowed opacity-70' : '',
			                            ].join(' ')}
			                            aria-haspopup="listbox"
			                            aria-expanded={reminderTimeMenuOpen}
			                            aria-label={t('reminder_time')}
			                          >
			                            <div className="flex items-center justify-between gap-3">
			                              <div className="min-w-0">
			                                <div className="text-sm font-extrabold text-[color:var(--app-text)] tabular-nums">{reminderTime}</div>
			                                <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">
			                                  {t('reminder_pick_step', { minutes: 15 })}
			                                </div>
			                              </div>
			                              <ChevronDown className={['h-4 w-4 shrink-0 transition text-[color:var(--app-muted)]', reminderTimeMenuOpen ? 'rotate-180' : ''].join(' ')} aria-hidden="true" />
			                            </div>
			                          </button>

			                          {reminderTimeMenuOpen ? createPortal((
			                            <div
			                              ref={reminderTimeMenuPanelRef}
			                              role="listbox"
			                              aria-label={t('reminder_time')}
			                              className="fixed z-[10050] overflow-hidden rounded-3xl border border-white/10 bg-[var(--app-surface)]/95 backdrop-blur shadow-2xl shadow-black/50 ring-1 ring-white/10"
			                              style={{
			                                left: `${Number(reminderTimeMenuStyle?.left ?? 12)}px`,
			                                top: `${Number(reminderTimeMenuStyle?.top ?? 12)}px`,
			                                width: `${Number(reminderTimeMenuStyle?.width ?? 280)}px`,
			                                transform: String(reminderTimeMenuStyle?.transform || 'translateY(0)'),
			                              }}
			                            >
			                              <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-4 py-3">
			                                <div className="min-w-0">
			                                  <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('reminder_time')}</div>
			                                  <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">
			                                    {t('reminder_pick_step', { minutes: 15 })}
			                                  </div>
			                                </div>
			                                <button
			                                  type="button"
			                                  onClick={() => setReminderTimeMenuOpen(false)}
			                                  className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-extrabold text-[color:var(--app-text)] hover:bg-white/10"
			                                >
			                                  {t('close')}
			                                </button>
			                              </div>

			                              <div className="overflow-auto p-3" style={{ maxHeight: `${reminderTimeMenuMaxH}px` }}>
			                                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
			                                  {reminderTimeOptionsRef.current.map((v) => {
			                                    const selected = String(v) === String(reminderTime);
			                                    return (
			                                      <button
			                                        key={v}
			                                        type="button"
			                                        role="option"
			                                        aria-selected={selected}
			                                        onClick={() => {
			                                          setReminderTime(v);
			                                          setReminderTimeMenuOpen(false);
			                                        }}
			                                        className={[
			                                          'group relative h-9 rounded-2xl border px-2 text-xs font-extrabold tabular-nums transition inline-flex items-center justify-center gap-1.5',
			                                          'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
			                                          selected
			                                            ? 'border-emerald-400/30 bg-gradient-to-br from-emerald-400 to-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/25'
			                                            : 'border-white/10 bg-white/5 text-[color:var(--app-text)] hover:bg-white/10 hover:border-white/20',
			                                        ].join(' ')}
			                                      >
			                                        {v}
			                                        {selected ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
			                                      </button>
			                                    );
			                                  })}
			                                </div>
			                              </div>
			                            </div>
			                          ), document.body) : null}
			                        </div>
			                      </div>

		                      <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
		                        <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('reminder_custom_time')}</div>
		                        <input
		                          type="time"
		                          value={reminderTime}
		                          onChange={(e) => setReminderTime(e.target.value)}
		                          disabled={!reminderEnabled}
		                          className={[
		                            'mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-extrabold text-[color:var(--app-text)] outline-none',
		                            'focus:ring-2 focus:ring-emerald-400/30',
		                            !reminderEnabled ? 'cursor-not-allowed' : '',
		                          ].join(' ')}
		                        />
		                      </div>
		                    </div>
		                  </div>
			                  <div className="mt-4 flex gap-2">
			                    <button
			                      type="button"
			                      onClick={closeModal}
			                      className="flex-1 h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-extrabold text-[color:var(--app-text)] hover:bg-white/10"
			                    >
			                      {t('cancel')}
			                    </button>
			                    <button
			                      type="button"
			                      onClick={saveReminder}
			                      className="flex-1 h-11 rounded-2xl bg-emerald-500 px-4 text-sm font-extrabold text-slate-950 hover:brightness-95 shadow-sm shadow-emerald-500/15"
			                    >
			                      {t('save')}
			                    </button>
			                  </div>
		                </div>
		              )}

              {activeModal === 'budgetAlerts' && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('enable_budget_alerts')}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">
                          {t('budget_alerts_desc')}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBudgetAlertEnabled((v) => !v)}
                        className={[
                          'relative inline-flex h-8 w-14 items-center rounded-full transition ring-1',
                          budgetAlertEnabled
                            ? 'bg-emerald-500 ring-emerald-400/30'
                            : 'bg-white/10 ring-white/10',
                        ].join(' ')}
                        role="switch"
                        aria-checked={budgetAlertEnabled}
                        aria-label={t('enable_budget_alerts')}
                      >
                        <span
                          className={[
                            'inline-block h-6 w-6 transform rounded-full bg-white shadow transition',
                            budgetAlertEnabled ? 'translate-x-7' : 'translate-x-1',
                          ].join(' ')}
                        />
                      </button>
                    </div>
                  </div>

                  {budgetAlertEnabled && !budgetAlertCanPush ? (
                    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
                      {t('budget_alerts_need_link_line')}
                    </div>
                  ) : null}

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="flex-1 h-11 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-extrabold text-[color:var(--app-text)] hover:bg-white/10"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={saveBudgetAlerts}
                      className="flex-1 h-11 rounded-2xl bg-emerald-500 px-4 text-sm font-extrabold text-slate-950 hover:brightness-95 shadow-sm shadow-emerald-500/15"
                    >
                      {t('save')}
                    </button>
                  </div>
                </div>
              )}

	              {activeModal === 'autocat' && (
	                <div className="space-y-3">
		                  <label className="flex items-center gap-3">
		                    <input type="checkbox" checked={autoCategorize} onChange={(e) => setAutoCategorize(e.target.checked)} className="w-4 h-4" />
		                    <span className="text-sm font-semibold">{t('enable_autocat')}</span>
		                  </label>
		                  <p className="text-xs text-slate-400 font-semibold">{t('autocat_desc')}</p>
		                  <div className="flex justify-end gap-2 mt-4">
		                    <button onClick={closeModal} className="px-4 py-2 text-[color:var(--app-muted)] hover:text-[color:var(--app-text)] font-semibold">{t('cancel')}</button>
		                    <button onClick={saveAutoCategorize} className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-extrabold">{t('save')}</button>
		                  </div>
		                </div>
		              )}

	              {activeModal === 'language' && (
	                <div className="space-y-3">
		                  <p className="text-xs font-semibold text-[color:var(--app-muted)]">
		                    {t('language_desc')}
		                  </p>

	                  <div className="space-y-2">
	                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
	                      <input
	                        type="radio"
	                        name="balanz_lang"
	                        value="th"
	                        checked={language === 'th'}
	                        onChange={() => setLanguage('th')}
	                      />
		                      <div className="text-sm font-extrabold">{t('lang_th')}</div>
		                    </label>

	                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-3">
	                      <input
	                        type="radio"
	                        name="balanz_lang"
	                        value="en"
	                        checked={language === 'en'}
	                        onChange={() => setLanguage('en')}
	                      />
		                      <div className="text-sm font-extrabold">{t('lang_en')}</div>
		                    </label>
		                  </div>

		                  <div className="flex justify-end gap-2 mt-4">
		                    <button onClick={closeModal} className="px-4 py-2 text-[color:var(--app-muted)] hover:text-[color:var(--app-text)] font-semibold">{t('cancel')}</button>
		                    <button onClick={saveLanguage} className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-extrabold">{t('save')}</button>
		                  </div>
		                </div>
		              )}

	              {activeModal === 'clearAll' && (
	                <div className="space-y-3">
		                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-rose-200 text-sm font-semibold">
		                    {t('clear_all_warning')}
		                  </div>
		                  <div>
		                    <label className="text-xs font-semibold text-[color:var(--app-muted)]">{t('type_delete_to_confirm')}</label>
		                    <input
		                      value={deleteConfirmText}
		                      onChange={(e) => setDeleteConfirmText(e.target.value)}
	                      className="mt-1 w-full h-11 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-extrabold text-slate-100 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-rose-400/30"
	                      placeholder="DELETE"
	                    />
		                  </div>
		                  <div className="flex justify-end gap-2 mt-4">
			                    <button onClick={closeModal} className="px-4 py-2 text-[color:var(--app-muted)] hover:text-[color:var(--app-text)] font-semibold">{t('cancel')}</button>
			                    <button
			                      onClick={deleteAllTransactions}
		                      disabled={deleteAllLoading || deleteConfirmText !== 'DELETE'}
			                      className="px-4 py-2 bg-rose-500 text-white rounded-xl font-extrabold disabled:opacity-50"
		                    >
		                      {deleteAllLoading ? t('deleting') : t('delete_all_btn')}
		                    </button>
		                  </div>
		                </div>
		              )}

	              {activeModal === 'categories' && (
		                <div className="space-y-3">
		                  <p className="text-sm font-semibold text-slate-200">{t('categories_desc')}</p>
		                  <div className="flex justify-end gap-2 mt-4">
	                    <button onClick={closeModal} className="px-4 py-2 text-[color:var(--app-muted)] hover:text-[color:var(--app-text)] font-semibold">{t('close')}</button>
	                    <button onClick={() => { closeModal(); router.push('/categories'); }} className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-xl font-extrabold">{t('go_to_categories')}</button>
	                  </div>
	                </div>
	              )}
            </div>
          </div>
        </div>
      ), document.body) : null}

      {mounted && rankingOpen ? createPortal((
        <div className="fixed inset-0 z-[10000] flex items-start sm:items-center justify-center p-4 pt-12 sm:pt-0 pb-24 sm:pb-8">
          <div className="absolute inset-0 bg-black/50" onClick={() => setRankingOpen(false)}></div>
          <div className="bg-[var(--app-surface)] border border-[color:var(--app-border)] rounded-2xl shadow-2xl z-10 w-full max-w-md mx-auto p-5 max-h-[90vh] overflow-auto text-[color:var(--app-text)]">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">{t('leaderboard_title')}</h3>
              <button onClick={() => setRankingOpen(false)} className="text-[color:var(--app-muted)] hover:text-[color:var(--app-text)]">✕</button>
            </div>

            <div className="mt-4">
              {!rankingLoading && rankingData.length >= 3 ? (
                <div className="flex items-center justify-center">
                  <svg viewBox="0 -10 220 150" className="w-full h-40">
                    <defs>
                      <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#86EFAC" />
                        <stop offset="100%" stopColor="#4ADE80" />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#FB7185" />
                        <stop offset="100%" stopColor="#F97316" />
                      </linearGradient>
                      <linearGradient id="g3" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#93C5FD" />
                        <stop offset="100%" stopColor="#60A5FA" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const positions = [40, 96, 162];
                      const widths = [28, 40, 28];
                      const maxBarHeight = 92;
                      const grads = ['g1', 'g2', 'g3'];
                      const sorted = [...rankingData].sort((a, b) => b.days - a.days);
                      const maxDays = Math.max(1, ...sorted.map((r) => r.days || 0));
                      const orderForPositions = [sorted[2], sorted[0], sorted[1]].filter(Boolean);

                      return orderForPositions.map((r, i) => {
                        const h = Math.round(((r.days || 0) / maxDays) * maxBarHeight);
                        const x = positions[i];
                        const w = widths[i];
                        const y = 118 - h;
                        const cx = x + w / 2;
                        const badgeY = y - 18;
                        const rankIndex = sorted.findIndex(s => s.name === r.name);
                        return (
                          <g key={i}>
                            <rect x={x} y={y} width={w} height={h} rx="8" fill={`url(#${grads[i]})`} />
                            {(() => {
                              const badgeFill = rankIndex === 0 ? '#FFF1F2' : rankIndex === 1 ? '#EFF6FF' : '#ECFDF5';
                              const badgeStroke = rankIndex === 0 ? '#FECACA' : rankIndex === 1 ? '#BFDBFE' : '#BBF7D0';
                              const badgeTextColor = rankIndex === 0 ? '#BE123C' : rankIndex === 1 ? '#1E40AF' : '#065F46';
                              return (
                                <>
                                  <circle cx={cx} cy={badgeY} r="12" fill={badgeFill} stroke={badgeStroke} strokeWidth="0.6" />
                                  <text x={cx} y={badgeY + 4} fontSize="10" textAnchor="middle" fill={badgeTextColor} fontWeight="600">{rankIndex + 1}</text>
                                </>
                              );
                            })()}
                            <text x={cx} y="134" fontSize="11" textAnchor="middle" fill="var(--app-muted)">{String(r.name || '').split(' ')[0]}</text>
                          </g>
                        );
                      });
                    })()}
                  </svg>
                </div>
              ) : null}

              {rankingLoading ? (
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-3 text-sm font-semibold text-[color:var(--app-muted)]">
                  {t('leaderboard_loading')}
                </div>
              ) : rankingError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm font-semibold text-rose-200">
                  {rankingError}
                </div>
              ) : rankingData.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-3 text-sm font-semibold text-[color:var(--app-muted)]">
                  {t('leaderboard_empty')}
                </div>
              ) : null}

              <div className="mt-4 space-y-3">
                {(() => {
                  const sorted = [...rankingData].sort((a, b) => b.days - a.days);
                  return sorted.map((u, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] mt-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ring-1 ${i === 0 ? 'bg-rose-500/15 text-rose-200 ring-rose-400/20' : i === 1 ? 'bg-sky-500/15 text-sky-200 ring-sky-400/20' : 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/20'} font-extrabold`}>{i + 1}</div>
                      <div className="flex-1">
                        <div className="text-sm font-extrabold text-[color:var(--app-text)]">{u.name}</div>
                        <div className="text-xs text-[color:var(--app-muted)] font-semibold mt-1">{t('days', { count: u.days })}</div>
                      </div>
                      <div className="text-sm font-semibold text-[color:var(--app-muted)]">#{i + 1}</div>
                    </div>
                  ));
                })()}
              </div>

              <div className="mt-6 flex justify-end">
                <button onClick={() => setRankingOpen(false)} className="px-4 py-2 bg-[var(--app-surface-2)] border border-[color:var(--app-border)] text-[color:var(--app-text)] rounded-xl hover:bg-[var(--app-surface-3)] font-extrabold">{t('close')}</button>
              </div>
            </div>
          </div>
        </div>
      ), document.body) : null}

      {mounted && confirmLogoutOpen ? createPortal((
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={cancelLogout}></div>
          <div className="bg-[var(--app-surface)] border border-[color:var(--app-border)] rounded-2xl shadow-2xl z-10 w-full max-w-sm mx-auto p-5 text-[color:var(--app-text)]">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-full bg-rose-500/10 text-rose-200 border border-rose-400/20">
                <LogOut className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-extrabold text-[color:var(--app-text)]">{t('logout_title')}</h3>
                <p className="text-sm text-[color:var(--app-muted)] mt-1 font-semibold">{t('logout_desc')}</p>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button onClick={cancelLogout} className="flex-1 px-4 py-2 bg-[var(--app-surface-2)] border border-[color:var(--app-border)] rounded-xl hover:bg-[var(--app-surface-3)] font-extrabold">{t('cancel')}</button>
              <button
                onClick={() => { setConfirmLogoutOpen(false); performLogout(); }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-rose-600 text-white rounded-xl flex items-center justify-center gap-2 font-extrabold"
              >
                <LogOut className="w-4 h-4" />
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      ), document.body) : null}
    </div>
  );
}
