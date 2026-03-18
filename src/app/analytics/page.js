"use client";
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import LoadingMascot from '@/components/LoadingMascot';
import { formatI18n } from '@/lib/i18n';
import { useBalanzLanguage } from '@/lib/useBalanzLanguage';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
// ใช้ Lucide Icons แทน SVG วาดเองและ Emoji
import { 
  Wallet, TrendingUp, TrendingDown,
  ChevronLeft, ChevronRight,
  X
} from 'lucide-react';

// ลงทะเบียน Chart.js
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

  // Use same-origin requests in the browser and rely on Next.js `rewrites()` to reach the backend.
  const API_BASE = '';

// --- 2. CONSTANTS ---
const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const MONTH_NAMES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const I18N = {
  th: {
    loading: 'กำลังโหลด...',
    title: 'ภาพรวมการเงิน',
    subtitle: 'ดูกราฟสรุปรายรับ-รายจ่ายแบบเข้าใจง่าย',

    prev_month: 'เดือนก่อนหน้า',
    next_month: 'เดือนถัดไป',
    open_month_picker: 'เปิดปฏิทินเลือกเดือน',
    selected_month: 'เดือนที่เลือก',
    pick_month: 'เลือกเดือน',
    pick_month_compare: 'เลือกเดือน (เทียบกับ)',
    pick_month_hint: 'แตะเพื่อดูสรุปของเดือนนั้น',
    pick_month_compare_hint: 'แตะเพื่อเลือกเดือนสำหรับเปรียบเทียบ',
    close: 'ปิด',
    prev_year: 'ปีก่อนหน้า',
    next_year: 'ปีถัดไป',
    buddhist_era: 'พ.ศ.',
    this_month: 'เดือนนี้',
    done: 'เสร็จสิ้น',

    income: 'รายรับ',
    expense: 'รายจ่าย',
    net_balance: 'คงเหลือสุทธิ',

    compare_expense: 'เทียบรายจ่าย',
    compare_expense_hint: 'เปรียบเทียบรายจ่ายสะสมรายวันของ 2 เดือน',
    compare_hint_diff_months: 'เลือกเดือน “เทียบกับ” ให้ต่างจากเดือนที่เลือก เพื่อดูความแตกต่าง',
    compare_month_label: 'เทียบเดือน',
    compare_pick_month_aria: 'เลือกเดือนสำหรับเปรียบเทียบ',
    pick_month_fallback: 'เลือกเดือน',
    spent: 'ใช้จ่ายไป',
    spend_rate: 'อัตราการใช้จ่าย',
    per_day: 'ต่อวัน',
    selected_month_label: 'เดือนที่เลือก',
    spent_so_far: 'ใช้จ่ายไปแล้ว',
    no_expense_compare: 'ไม่มีรายจ่ายสำหรับการเปรียบเทียบ',
    month_selected_fallback: 'เดือนที่เลือก',
    month_compare_fallback: 'เดือนที่เทียบ',

    income_expense_chart: 'กราฟรายรับ-รายจ่าย',
    daily: 'รายวัน',
    monthly: 'รวมเดือน',
    daily_overview: 'รายวัน • {label}',
    monthly_overview: 'รายเดือน • {label} (สิ้นสุดที่ {end})',
    no_txn_this_month: 'ไม่มีรายการในเดือนนี้',
    remaining: 'คงเหลือ',
    show_last_days: 'แสดงเฉพาะ {count} วันล่าสุดเพื่อให้อ่านง่าย',

    expense_share: 'สัดส่วนรายจ่าย',
    expense_share_top: 'แยกตามหมวดหมู่ (ยอดนิยม)',
    expense_share_all: 'แยกตามหมวดหมู่ (ทั้งหมด)',
    no_expense_this_month: 'ไม่มีรายจ่ายในเดือนนี้',
    total_expense: 'รายจ่ายรวม',

    recent_months: '{count} เดือนล่าสุด',
    day_prefix: 'วันที่ {day}',
    end_of_month_fallback: 'เดือนที่เลือก',
    data_fetch_failed: 'โหลดข้อมูลไม่สำเร็จ',
    other_category: 'อื่นๆ',
  },
  en: {
    loading: 'Loading…',
    title: 'Financial overview',
    subtitle: 'Simple charts for income and expenses',

    prev_month: 'Previous month',
    next_month: 'Next month',
    open_month_picker: 'Open month picker',
    selected_month: 'Selected month',
    pick_month: 'Pick a month',
    pick_month_compare: 'Pick a month (compare)',
    pick_month_hint: 'Tap to view that month’s summary',
    pick_month_compare_hint: 'Tap to pick a month to compare',
    close: 'Close',
    prev_year: 'Previous year',
    next_year: 'Next year',
    buddhist_era: 'B.E.',
    this_month: 'This month',
    done: 'Done',

    income: 'Income',
    expense: 'Expenses',
    net_balance: 'Net balance',

    compare_expense: 'Expense comparison',
    compare_expense_hint: 'Compare cumulative daily expenses across 2 months',
    compare_hint_diff_months: 'Pick a different “compare” month to see differences.',
    compare_month_label: 'Compare',
    compare_pick_month_aria: 'Pick a month to compare',
    pick_month_fallback: 'Pick a month',
    spent: 'Spent',
    spend_rate: 'Spending rate',
    per_day: 'per day',
    selected_month_label: 'Selected month',
    spent_so_far: 'Spent so far',
    no_expense_compare: 'No expenses to compare',
    month_selected_fallback: 'Selected month',
    month_compare_fallback: 'Compared month',

    income_expense_chart: 'Income vs expenses',
    daily: 'Daily',
    monthly: 'Monthly',
    daily_overview: 'Daily • {label}',
    monthly_overview: 'Monthly • {label} (ending {end})',
    no_txn_this_month: 'No transactions this month',
    remaining: 'Remaining',
    show_last_days: 'Showing only the last {count} days for readability',

    expense_share: 'Expense share',
    expense_share_top: 'By category (top)',
    expense_share_all: 'By category (all)',
    no_expense_this_month: 'No expenses this month',
    total_expense: 'Total expenses',

    recent_months: 'Last {count} months',
    day_prefix: 'Day {day}',
    end_of_month_fallback: 'selected month',
    data_fetch_failed: 'Failed to load data',
    other_category: 'Other',
  },
};

const tForLang = (language, key, vars) => {
  const dict = I18N[language] || I18N.th;
  const template = dict?.[key] ?? I18N.th?.[key] ?? key;
  return formatI18n(template, vars);
};

export default function Analytics() {
  const router = useRouter();
  const language = useBalanzLanguage('th'); // 'th' | 'en'
  const t = useCallback((key, vars) => tForLang(language, key, vars), [language]);
  const uiLocale = language === 'en' ? 'en-US' : 'th-TH';

  const monthNames = useMemo(() => (language === 'en' ? MONTH_NAMES_EN : MONTH_NAMES_TH), [language]);

  const formatCurrency = useCallback((v) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v ?? '');
    try {
      return new Intl.NumberFormat(uiLocale).format(n);
    } catch {
      return String(n);
    }
  }, [uiLocale]);

  const formatTHB = useCallback((value, { decimals = 2 } = {}) => {
    const n = Number(value) || 0;
    const fixed = Number.isFinite(decimals) ? Number(decimals) : 2;
    try {
      return `฿${new Intl.NumberFormat(uiLocale, { minimumFractionDigits: fixed, maximumFractionDigits: fixed }).format(n)}`;
    } catch {
      const s = fixed > 0 ? n.toFixed(fixed) : String(Math.round(n));
      return `฿${s}`;
    }
  }, [uiLocale]);

  const buildMonthList = (names) => {
    const now = new Date();
    const startYear = now.getFullYear() - 5;
    const endYear = now.getFullYear() + 1;
    const out = [];
    let currentIdx = 0;

    for (let y = startYear; y <= endYear; y++) {
      for (let m = 0; m < 12; m++) {
        const d = new Date(y, m, 1);
        out.push({ label: `${names[m]} ${y + 543}`, value: d });
        if (y === now.getFullYear() && m === now.getMonth()) currentIdx = out.length - 1;
      }
    }

    return { out, currentIdx };
  };

  // --- STATE ---
  const [isMobile, setIsMobile] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const { out: monthList, currentIdx: initialMonthIndex } = useMemo(() => buildMonthList(monthNames), [monthNames]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => initialMonthIndex); // เริ่มที่เดือนปัจจุบัน
  const [compareMonthIndex, setCompareMonthIndex] = useState(() => Math.max(0, initialMonthIndex - 1));
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthPickerTarget, setMonthPickerTarget] = useState('current'); // 'current' | 'compare'
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [overviewMode, setOverviewMode] = useState('monthly'); // 'daily' | 'monthly'
  const [expenseShareMode, setExpenseShareMode] = useState('top'); // 'top' | 'all'

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 640px)');
    const onChange = () => setIsMobile(!!mq.matches);
    onChange();
    try {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    } catch {
      mq.addListener(onChange);
      return () => mq.removeListener(onChange);
    }
  }, []);

  const selectedMonthObj = monthList[currentMonthIndex];
  const compareMonthObj = monthList[compareMonthIndex];
  const activeMonthIndex = monthPickerTarget === 'compare' ? compareMonthIndex : currentMonthIndex;

  const monthIndexMap = useMemo(() => {
    const map = new Map();
    monthList.forEach((m, idx) => {
      const d = m?.value instanceof Date ? m.value : null;
      if (!d) return;
      map.set(`${d.getFullYear()}-${d.getMonth()}`, idx);
    });
    return map;
  }, [monthList]);

  const availableYears = useMemo(() => {
    const years = new Set();
    for (const key of monthIndexMap.keys()) {
      const y = Number(String(key).split('-')[0]);
      if (Number.isFinite(y)) years.add(y);
    }
    return Array.from(years.values()).sort((a, b) => b - a);
  }, [monthIndexMap]);

  const monthPickerMonthsForYear = useMemo(() => {
    const y = Number(monthPickerYear);
    return monthNames.map((name, monthIndex) => {
      const idx = monthIndexMap.get(`${y}-${monthIndex}`);
      return { name, monthIndex, idx: typeof idx === 'number' ? idx : null };
    });
  }, [monthIndexMap, monthPickerYear, monthNames]);

  useEffect(() => {
    if (!showMonthPicker) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowMonthPicker(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [showMonthPicker]);

  // --- EFFECT: Fetch Data ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    const loadData = async () => {
      try {
        setLoading(true);
        const [resTrans, resCats] = await Promise.all([
          fetch(`${API_BASE}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/categories`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const dataTrans = await resTrans.json();
        const dataCats = await resCats.json();

        if (resTrans.ok && resCats.ok) {
          setTransactions(dataTrans);
          setCategories(dataCats);
        } else {
          throw new Error(t('data_fetch_failed'));
        }
      } catch (err) {
        setError(err?.message ? String(err.message) : t('data_fetch_failed'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router, t]);

  // --- LOGIC: Filter & Calculations ---
  // กรอง Transaction ตามเดือนที่เลือก
  let filteredTransactions = transactions.filter((t) => {
    const tDate = new Date(t.date);
    const mDate = selectedMonthObj.value;
    return tDate.getMonth() === mDate.getMonth() && tDate.getFullYear() === mDate.getFullYear();
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const categoryNameById = useMemo(() => {
    const map = new Map();
    for (const c of categories || []) {
      const id = c?._id ? String(c._id) : '';
      if (!id) continue;
      map.set(id, String(c.name || ''));
    }
    return map;
  }, [categories]);

  // คำนวณยอดรวม
  const summary = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });
  
  const balance = summary.income - summary.expense;

  // จัดกลุ่มรายจ่ายตามหมวดหมู่
  const expenseByCategory = useMemo(() => {
    const map = {};
    filteredTransactions
      .filter((txn) => txn.type === 'expense')
      .forEach((txn) => {
        const catId = txn.category?._id || txn.category || '';
        const fallbackName = catId ? categoryNameById.get(String(catId)) : '';
        const catName = txn.category?.name || fallbackName || t('other_category');
        map[catName] = (map[catName] || 0) + (txn.amount || 0);
      });
    return map;
  }, [filteredTransactions, categoryNameById, t]);

  const BANGKOK_TZ = 'Asia/Bangkok';
  const getBangkokDateParts = (dateInput) => {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return null;
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: BANGKOK_TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(d);
      const map = {};
      parts.forEach((p) => { if (p?.type) map[p.type] = p.value; });
      const year = Number(map.year);
      const month = Number(map.month);
      const day = Number(map.day);
      if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
      return { year, monthIndex: month - 1, day };
    } catch {
      return { year: d.getFullYear(), monthIndex: d.getMonth(), day: d.getDate() };
    }
  };

  const compareExpenseDaily = useMemo(() => {
    const monthA = compareMonthObj?.value instanceof Date ? compareMonthObj.value : null; // dropdown
    const monthB = selectedMonthObj?.value instanceof Date ? selectedMonthObj.value : null; // current selected month
    if (!monthA || !monthB) {
      return {
        labels: [],
        seriesA: [],
        seriesB: [],
        totalA: 0,
        totalB: 0,
        avgA: 0,
        avgB: 0,
        cutoffA: 0,
        cutoffB: 0,
      };
    }

    const nowParts = getBangkokDateParts(Date.now());

    const daysInMonth = (monthDate) => {
      const y = monthDate.getFullYear();
      const m = monthDate.getMonth();
      return new Date(y, m + 1, 0).getDate();
    };

    const sameMonth = (monthDate, parts) => {
      if (!parts) return false;
      return parts.year === monthDate.getFullYear() && parts.monthIndex === monthDate.getMonth();
    };

    const buildCumulative = (monthDate) => {
      const y = monthDate.getFullYear();
      const m = monthDate.getMonth();
      const dim = daysInMonth(monthDate);
      const cutoff = sameMonth(monthDate, nowParts) ? Math.max(1, Math.min(dim, Number(nowParts.day) || 1)) : dim;
      const daily = Array.from({ length: cutoff }, () => 0);
      let total = 0;

      for (const t of transactions || []) {
        if (!t || t.type !== 'expense') continue;
        const amount = Number(t.amount) || 0;
        if (amount <= 0) continue;
        const p = getBangkokDateParts(t?.date);
        if (!p) continue;
        if (p.year !== y || p.monthIndex !== m) continue;
        if (p.day < 1 || p.day > cutoff) continue;
        daily[p.day - 1] += amount;
        total += amount;
      }

      const cum = [];
      let run = 0;
      for (let i = 0; i < daily.length; i++) {
        run += daily[i];
        cum.push(run);
      }
      return { dim, cutoff, total, cum };
    };

    const a = buildCumulative(monthA);
    const b = buildCumulative(monthB);
    const maxDays = Math.max(a.dim, b.dim);
    const labels = Array.from({ length: maxDays }, (_, i) => String(i + 1));

    const pad = (res) => {
      const out = Array.from({ length: maxDays }, () => null);
      const n = Math.min(res.cutoff, res.dim, maxDays);
      for (let i = 0; i < n; i++) out[i] = res.cum[i] ?? null;
      return out;
    };

    const seriesA = pad(a);
    const seriesB = pad(b);

    const avgA = a.cutoff > 0 ? a.total / a.cutoff : 0;
    const avgB = b.cutoff > 0 ? b.total / b.cutoff : 0;

    return {
      labels,
      seriesA,
      seriesB,
      totalA: a.total,
      totalB: b.total,
      avgA,
      avgB,
      cutoffA: a.cutoff,
      cutoffB: b.cutoff,
    };
  }, [compareMonthObj, selectedMonthObj, transactions]);

  const dailySeries = useMemo(() => {
    const map = new Map();
    filteredTransactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { income: 0, expense: 0 });
      const row = map.get(key);
      if (t.type === 'income') row.income += t.amount || 0;
      else row.expense += t.amount || 0;
    });

    const keys = Array.from(map.keys()).sort((a, b) => new Date(a) - new Date(b));
    const labels = keys.map(k => new Date(k).toLocaleDateString(uiLocale, { day: 'numeric', month: 'short' }));
    return {
      labels,
      income: keys.map(k => map.get(k).income),
      expense: keys.map(k => map.get(k).expense),
    };
  }, [filteredTransactions, uiLocale]);

  const dailySeriesDisplay = useMemo(() => {
    const maxPoints = isMobile ? 12 : 20;
    if (dailySeries.labels.length <= maxPoints) return dailySeries;
    const start = Math.max(0, dailySeries.labels.length - maxPoints);
    return {
      labels: dailySeries.labels.slice(start),
      income: dailySeries.income.slice(start),
      expense: dailySeries.expense.slice(start),
    };
  }, [dailySeries, isMobile]);

  const monthlySeries = useMemo(() => {
    const totalsByKey = new Map(); // key: `${yyyy}-${mm}` where mm is 0-11
    (transactions || []).forEach((t) => {
      if (!t?.date) return;
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const row = totalsByKey.get(key) || { income: 0, expense: 0 };
      if (t.type === 'income') row.income += Number(t.amount) || 0;
      else row.expense += Number(t.amount) || 0;
      totalsByKey.set(key, row);
    });

    const end = selectedMonthObj?.value instanceof Date ? selectedMonthObj.value : new Date();
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    const windowSize = isMobile ? 6 : 12;
    const fmt = new Intl.DateTimeFormat(uiLocale, { month: 'short', year: '2-digit' });

    const labels = [];
    const income = [];
    const expense = [];
    let totalIncome = 0;
    let totalExpense = 0;

    for (let i = windowSize - 1; i >= 0; i--) {
      const d = new Date(endMonth.getFullYear(), endMonth.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      const row = totalsByKey.get(key) || { income: 0, expense: 0 };
      labels.push(fmt.format(d));
      income.push(row.income);
      expense.push(row.expense);
      totalIncome += row.income;
      totalExpense += row.expense;
    }

    return { labels, income, expense, totalIncome, totalExpense, windowSize };
  }, [transactions, selectedMonthObj, isMobile, uiLocale]);

  const overviewTotals = useMemo(() => {
    if (overviewMode === 'monthly') {
      return {
        income: monthlySeries.totalIncome,
        expense: monthlySeries.totalExpense,
        label: t('recent_months', { count: monthlySeries.windowSize }),
      };
    }
    return {
      income: summary.income,
      expense: summary.expense,
      label: selectedMonthObj?.label || t('end_of_month_fallback'),
    };
  }, [overviewMode, monthlySeries, summary.income, summary.expense, selectedMonthObj, t]);

  // --- CHART CONFIG ---
  const pieLabels = useMemo(() => Object.keys(expenseByCategory), [expenseByCategory]);
  const pieValues = useMemo(() => Object.values(expenseByCategory), [expenseByCategory]);
  const baseColors = ['#22c55e', '#10b981', '#14b8a6', '#0ea5e9', '#2563eb', '#6366f1', '#a855f7', '#ec4899', '#f97316', '#f59e0b', '#f43f5e', '#64748b'];
  const pieColors = pieLabels.map((_, i) => baseColors[i % baseColors.length]);
  const pieColorByLabel = useMemo(() => {
    const map = {};
    pieLabels.forEach((l, i) => { map[l] = pieColors[i]; });
    return map;
  }, [pieLabels, pieColors]);

  const pieData = {
    labels: pieLabels,
    datasets: [{ data: pieValues, backgroundColor: pieColors, borderWidth: 0 }]
  };

  const barData = overviewMode === 'daily'
    ? {
        labels: dailySeriesDisplay.labels,
        datasets: [
          {
            label: t('income'),
            data: dailySeriesDisplay.income,
            backgroundColor: '#22c55e',
            borderRadius: 10,
            barThickness: 18,
          },
          {
            label: t('expense'),
            data: dailySeriesDisplay.expense,
            backgroundColor: '#f43f5e',
            borderRadius: 10,
            barThickness: 18,
          },
        ]
      }
    : {
        labels: monthlySeries.labels,
        datasets: [
          {
            label: t('income'),
            data: monthlySeries.income,
            backgroundColor: '#22c55e',
            borderRadius: 10,
            barThickness: 18,
          },
          {
            label: t('expense'),
            data: monthlySeries.expense,
            backgroundColor: '#f43f5e',
            borderRadius: 10,
            barThickness: 18,
          },
        ],
      };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(2, 8, 23, 0.92)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        titleColor: 'rgba(248,250,252,0.95)',
        bodyColor: 'rgba(226,232,240,0.95)',
        callbacks: {
          title: (items) => {
            const first = items?.[0];
            if (!first) return '';
            return String(first.label || '');
          },
          label: (ctx) => {
            const v = ctx.raw ?? 0;
            const label = ctx?.dataset?.label ? `${ctx.dataset.label}: ` : '';
            return `${label}฿ ${formatCurrency(v)}`;
          }
        }
      }
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: {
        display: true,
        grid: { color: 'rgba(255, 255, 255, 0.08)' },
        ticks: {
          color: 'rgba(226, 232, 240, 0.7)',
          maxTicksLimit: isMobile ? 4 : 6,
          callback: (v) => formatCurrency(v),
        },
      },
      x: {
        grid: { display: false },
        ticks: {
          color: 'rgba(148, 163, 184, 0.8)',
          maxRotation: overviewMode === 'daily' ? 0 : 0,
          autoSkip: true,
          maxTicksLimit: overviewMode === 'daily' ? (isMobile ? 6 : 12) : (isMobile ? 6 : 12),
        },
      },
    },
  };

  const pieChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(2, 8, 23, 0.92)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        titleColor: 'rgba(248,250,252,0.95)',
        bodyColor: 'rgba(226,232,240,0.95)',
        callbacks: {
          label: (ctx) => {
            const label = ctx.label || '';
            const v = ctx.raw ?? 0;
            const total = pieValues.reduce((s, n) => s + (Number(n) || 0), 0) || 0;
            const pct = total > 0 ? Math.round((v / total) * 100) : 0;
            return `${label}: ฿ ${formatCurrency(v)} (${pct}%)`;
          }
        }
      }
    }
  }), [pieValues, formatCurrency]);

  const topExpenseList = useMemo(() => {
    const items = Object.entries(expenseByCategory)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .slice(0, isMobile ? 5 : 8)
      .map(([name, amount]) => ({ name, amount: amount || 0 }));
    return items;
  }, [expenseByCategory, isMobile]);

  const expenseListAll = useMemo(() => {
    const items = Object.entries(expenseByCategory)
      .sort((a, b) => (b[1] || 0) - (a[1] || 0))
      .map(([name, amount]) => ({ name, amount: amount || 0 }));
    return items;
  }, [expenseByCategory]);

  const compareLineData = useMemo(() => {
    const labelA = compareMonthObj?.label || t('month_compare_fallback');
    const labelB = selectedMonthObj?.label || t('month_selected_fallback');
    return {
      labels: compareExpenseDaily.labels,
      datasets: [
        {
          label: labelB,
          data: compareExpenseDaily.seriesB,
          borderColor: 'rgba(244, 63, 94, 0.95)', // rose (expense)
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.35,
          spanGaps: false,
        },
        {
          label: labelA,
          data: compareExpenseDaily.seriesA,
          borderColor: 'rgba(56, 189, 248, 0.95)', // sky
          backgroundColor: 'transparent',
          borderWidth: 3,
          pointRadius: 0,
          tension: 0.35,
          spanGaps: false,
        },
      ],
    };
  }, [compareExpenseDaily, selectedMonthObj, compareMonthObj, t]);

  const compareLineOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 6, right: 10, top: 10, bottom: 2 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(2, 8, 23, 0.92)',
        borderColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        titleColor: 'rgba(248,250,252,0.95)',
        bodyColor: 'rgba(226,232,240,0.95)',
        callbacks: {
          title: (items) => {
            const first = items?.[0];
            const label = first?.label ? String(first.label) : '';
            return label ? t('day_prefix', { day: label }) : '';
          },
          label: (ctx) => {
            const v = Number(ctx.raw);
            if (!Number.isFinite(v)) return `${ctx.dataset?.label || ''}: —`;
            return `${ctx.dataset?.label || ''}: ${formatTHB(v)}`;
          },
        },
      },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: 'rgba(148, 163, 184, 0.85)',
          maxRotation: 0,
          autoSkip: false,
          callback: (value, index) => {
            const label = compareExpenseDaily.labels?.[index];
            const day = Number(label);
            if (!Number.isFinite(day)) return '';
            const lastDay = Number(compareExpenseDaily.labels?.[compareExpenseDaily.labels.length - 1]) || 31;
            const marks = new Set([1, 5, 10, 15, 20, 25, lastDay]);
            return marks.has(day) ? String(day) : '';
          },
        },
      },
      y: {
        display: false,
        grid: { display: false },
        ticks: { display: false },
      },
    },
	  }), [compareExpenseDaily.labels, formatTHB, t]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-bg)]">
      <LoadingMascot label={t('loading')} size={88} />
    </div>
  );

  return (
    <main className="fixed inset-0 bg-[var(--app-bg)] text-[color:var(--app-text)] overflow-y-auto">
      <div className="mx-auto w-full max-w-lg px-4 py-5 pb-24 space-y-4 lg:max-w-6xl lg:px-6 lg:space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-xl font-extrabold text-[color:var(--app-text)]">{t('title')}</h1>
          <p className="mt-1 text-sm font-semibold text-[color:var(--app-muted)]">{t('subtitle')}</p>
        </div>

        {/* Month selector */}
        <div className="relative z-[1] rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentMonthIndex(prev => Math.max(0, prev - 1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-emerald-200 hover:bg-[var(--app-surface-3)] disabled:opacity-40"
              disabled={currentMonthIndex === 0}
              aria-label={t('prev_month')}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                const d = selectedMonthObj?.value instanceof Date ? selectedMonthObj.value : new Date();
                setMonthPickerTarget('current');
                setMonthPickerYear(d.getFullYear());
                setShowMonthPicker(true);
              }}
              className="min-w-0 flex-1 cursor-pointer rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2 text-center transition hover:bg-[var(--app-surface-3)] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              aria-label={t('open_month_picker')}
              aria-expanded={showMonthPicker}
            >
              <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('selected_month')}</div>
              <div className="truncate text-sm font-extrabold text-[color:var(--app-text)]">{selectedMonthObj.label}</div>
            </button>

            <button
              type="button"
              onClick={() => setCurrentMonthIndex(prev => Math.min(monthList.length - 1, prev + 1))}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-emerald-200 hover:bg-[var(--app-surface-3)] disabled:opacity-40"
              disabled={currentMonthIndex === monthList.length - 1}
              aria-label={t('next_month')}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Month Picker Modal */}
        {showMonthPicker && (
          <div
            className="fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-sm flex items-start justify-center p-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+88px)]"
            onClick={(e) => e.target === e.currentTarget && setShowMonthPicker(false)}
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between gap-3 border-b border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-5 py-4">
                <div>
                  <div className="text-sm font-extrabold text-[color:var(--app-text)]">
                    {monthPickerTarget === 'compare' ? t('pick_month_compare') : t('pick_month')}
                  </div>
                  <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">
                    {monthPickerTarget === 'compare' ? t('pick_month_compare_hint') : t('pick_month_hint')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMonthPicker(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                  aria-label={t('close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const idx = availableYears.indexOf(monthPickerYear);
                      const next = idx >= 0 ? availableYears[idx + 1] : null;
                      if (typeof next === 'number') setMonthPickerYear(next);
                    }}
                    disabled={availableYears.indexOf(monthPickerYear) >= availableYears.length - 1}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-40"
                    aria-label={t('prev_year')}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="min-w-0 flex-1 text-center">
                    <div className="text-sm font-extrabold text-[color:var(--app-text)]">{Number(monthPickerYear) + 543}</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-slate-400">{t('buddhist_era')}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const idx = availableYears.indexOf(monthPickerYear);
                      const prev = idx > 0 ? availableYears[idx - 1] : null;
                      if (typeof prev === 'number') setMonthPickerYear(prev);
                    }}
                    disabled={availableYears.indexOf(monthPickerYear) <= 0}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-40"
                    aria-label={t('next_year')}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  {monthPickerMonthsForYear.map((m) => {
                    const isActive = typeof m.idx === 'number' && m.idx === activeMonthIndex;
                    const disabled = m.idx == null;
                    return (
                      <button
                        key={`${monthPickerYear}-${m.monthIndex}`}
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          if (typeof m.idx === 'number') {
                            if (monthPickerTarget === 'compare') setCompareMonthIndex(m.idx);
                            else setCurrentMonthIndex(m.idx);
                          }
                          setShowMonthPicker(false);
                        }}
                        className={[
                          'h-11 rounded-2xl border px-3 text-sm font-extrabold transition',
                          'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
                          disabled
                            ? 'border-white/10 bg-white/5 text-[color:var(--app-muted-2)] opacity-50 cursor-not-allowed'
                            : isActive
                              ? 'border-emerald-400/30 bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
                              : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10',
                        ].join(' ')}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-white/10 bg-white/5 p-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const idx = monthIndexMap.get(`${now.getFullYear()}-${now.getMonth()}`);
                    if (typeof idx === 'number') {
                      if (monthPickerTarget === 'compare') setCompareMonthIndex(idx);
                      else setCurrentMonthIndex(idx);
                    }
                    setShowMonthPicker(false);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-extrabold text-slate-100 hover:bg-white/10"
                >
                  {t('this_month')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowMonthPicker(false)}
                  className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:brightness-95"
                >
                  {t('done')}
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-200 shadow-sm">
            <div className="text-sm font-semibold">{error}</div>
          </div>
        )}

        {/* Summary (stack like reference) */}
        <div className="space-y-3 sm:grid sm:grid-cols-3 sm:gap-3 sm:space-y-0">
          <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-400">{t('income')}</div>
                <div className="mt-1 text-2xl font-extrabold text-emerald-300">฿{formatCurrency(summary.income)}</div>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-400">{t('expense')}</div>
                <div className="mt-1 text-2xl font-extrabold text-rose-300">฿{formatCurrency(summary.expense)}</div>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/20">
                <TrendingDown className="h-6 w-6" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold tracking-wide text-slate-400">{t('net_balance')}</div>
                <div className={`mt-1 text-2xl font-extrabold ${balance >= 0 ? 'text-[color:var(--app-text)]' : 'text-rose-200'}`}>฿{formatCurrency(balance)}</div>
              </div>
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${balance >= 0 ? 'bg-white/5 text-slate-100 ring-white/10' : 'bg-rose-500/15 text-rose-200 ring-rose-400/20'}`}>
                <Wallet className="h-6 w-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
	        <div className="space-y-3 lg:grid lg:grid-flow-dense lg:grid-cols-12 lg:gap-6 lg:space-y-0">
	          {/* Compare expenses between 2 months */}
	          <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm lg:col-span-7 xl:col-span-8">
	            <div className="flex items-start justify-between gap-3">
	              <div className="min-w-0">
	                <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('compare_expense')}</div>
	                <div className="mt-0.5 text-xs font-semibold text-slate-400">{t('compare_expense_hint')}</div>
	              </div>
	            </div>

	            {compareMonthIndex === currentMonthIndex && (
	              <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-200">
	                {t('compare_hint_diff_months')}
	              </div>
	            )}

	            <div className="mt-4 relative">
	              {!isMobile && (
	                <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
	                  <div className="rounded-full border border-white/10 bg-[var(--app-surface)] px-3 py-1 text-[11px] font-extrabold text-[color:var(--app-muted)] shadow-sm">
	                    VS
	                  </div>
	                </div>
	              )}

	              <div className="grid grid-cols-2 gap-3">
	                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
	                  <div className="flex items-start justify-between gap-2">
	                    <div className="min-w-0">
	                      <div className="inline-flex items-center gap-2 text-[11px] font-extrabold text-[color:var(--app-muted)]">
	                        <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden="true" />
	                        {t('compare_month_label')}
	                      </div>
	                    </div>
	                    <button
	                      type="button"
	                      onClick={() => {
	                        const d = compareMonthObj?.value instanceof Date ? compareMonthObj.value : new Date();
	                        setMonthPickerTarget('compare');
	                        setMonthPickerYear(d.getFullYear());
	                        setShowMonthPicker(true);
	                      }}
	                      className="h-10 max-w-[190px] rounded-2xl border border-white/10 bg-[var(--app-surface)] px-3 text-[11px] font-extrabold text-slate-100 shadow-sm hover:bg-[var(--app-surface-2)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 truncate"
	                      aria-label={t('compare_pick_month_aria')}
	                      aria-expanded={showMonthPicker && monthPickerTarget === 'compare'}
	                    >
	                      {compareMonthObj?.label || t('pick_month_fallback')}
	                    </button>
	                  </div>

	                  <div className="mt-3 text-xs font-semibold text-[color:var(--app-muted-2)]">{t('spent')}</div>
	                  <div className="mt-1 text-xl font-extrabold text-sky-200">{formatTHB(compareExpenseDaily.totalA || 0)}</div>
	                  <div className="mt-3 text-xs font-semibold text-[color:var(--app-muted-2)]">{t('spend_rate')}</div>
	                  <div className="mt-1 text-sm font-extrabold text-slate-100">
	                    {formatTHB(compareExpenseDaily.avgA || 0)} <span className="font-semibold text-[color:var(--app-muted-2)]">{t('per_day')}</span>
	                  </div>
	                </div>

	                <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
	                  <div className="flex items-start justify-between gap-2">
	                    <div className="min-w-0">
	                      <div className="inline-flex items-center gap-2 text-[11px] font-extrabold text-[color:var(--app-muted)]">
	                        <span className="h-2.5 w-2.5 rounded-full bg-rose-400" aria-hidden="true" />
	                        {t('selected_month_label')}
	                      </div>
	                      <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted-2)] truncate">
	                        {selectedMonthObj?.label || '—'}
	                      </div>
	                    </div>
	                  </div>

	                  <div className="mt-3 text-xs font-semibold text-[color:var(--app-muted-2)]">{t('spent_so_far')}</div>
	                  <div className="mt-1 text-xl font-extrabold text-rose-200">{formatTHB(compareExpenseDaily.totalB || 0)}</div>
	                  <div className="mt-3 text-xs font-semibold text-[color:var(--app-muted-2)]">{t('spend_rate')}</div>
	                  <div className="mt-1 text-sm font-extrabold text-slate-100">
	                    {formatTHB(compareExpenseDaily.avgB || 0)} <span className="font-semibold text-[color:var(--app-muted-2)]">{t('per_day')}</span>
	                  </div>
	                </div>
	              </div>
	            </div>

	            <div className="mt-4">
	              {compareExpenseDaily.labels.length === 0 || ((compareExpenseDaily.totalA || 0) <= 0 && (compareExpenseDaily.totalB || 0) <= 0) ? (
	                <div className="h-56 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center text-sm font-semibold text-slate-400">
	                  {t('no_expense_compare')}
	                </div>
	              ) : (
	                <div className="h-64 rounded-3xl border border-white/10 bg-white/5 p-3">
	                  <Line data={compareLineData} options={compareLineOptions} />
	                </div>
	              )}

	              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-extrabold text-slate-300">
	                <span className="inline-flex items-center gap-2">
	                  <span className="h-2.5 w-2.5 rounded-full bg-rose-400" aria-hidden="true" />
	                  {selectedMonthObj?.label || t('month_selected_fallback')}
	                </span>
	                <span className="inline-flex items-center gap-2">
	                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400" aria-hidden="true" />
	                  {compareMonthObj?.label || t('month_compare_fallback')}
	                </span>
	              </div>
	            </div>
	          </div>

	          <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm lg:col-span-7 xl:col-span-8">
	            <div className="flex items-center justify-between gap-3">
	              <div className="min-w-0">
	                <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('income_expense_chart')}</div>
	                <div className="text-xs font-semibold text-slate-400">
	                  {overviewMode === 'daily'
	                    ? t('daily_overview', { label: overviewTotals.label })
	                    : t('monthly_overview', { label: overviewTotals.label, end: selectedMonthObj?.label || t('end_of_month_fallback') })}
	                </div>
	              </div>
	              <div className="relative inline-flex items-center rounded-full bg-white/5 p-1 ring-1 ring-white/10 shrink-0">
	                <span
	                  className={[
	                    'absolute inset-y-1 rounded-full bg-white/10 transition-all duration-300',
	                    overviewMode === 'daily'
	                      ? 'left-1 w-[calc(50%-4px)]'
	                      : 'left-[calc(50%+4px)] w-[calc(50%-4px)]',
	                  ].join(' ')}
	                  aria-hidden="true"
	                />
	                <button
	                  type="button"
	                  onClick={() => setOverviewMode('daily')}
	                  aria-pressed={overviewMode === 'daily'}
	                  className={[
	                    'relative z-10 px-3 py-1.5 text-xs font-extrabold rounded-full transition min-w-[84px] text-center',
	                    overviewMode === 'daily'
	                      ? 'text-[color:var(--app-text)]'
	                      : 'text-[color:var(--app-muted)] hover:text-[color:var(--app-text)]',
	                  ].join(' ')}
	                >
	                  {t('daily')}
	                </button>
	                <button
	                  type="button"
	                  onClick={() => setOverviewMode('monthly')}
	                  aria-pressed={overviewMode === 'monthly'}
	                  className={[
	                    'relative z-10 px-3 py-1.5 text-xs font-extrabold rounded-full transition min-w-[84px] text-center',
	                    overviewMode === 'monthly'
	                      ? 'text-[color:var(--app-text)]'
	                      : 'text-[color:var(--app-muted)] hover:text-[color:var(--app-text)]',
	                  ].join(' ')}
	                >
	                  {t('monthly')}
	                </button>
	              </div>
	            </div>

	            <div className="mt-4">
	              {overviewMode === 'daily' && dailySeries.labels.length === 0 ? (
	                <div className="h-56 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center text-sm font-semibold text-slate-400">
	                  {t('no_txn_this_month')}
	                </div>
	              ) : (
	                <div className="h-56">
	                  <Bar data={barData} options={barChartOptions} />
	                </div>
	              )}
	            </div>

	            <div className="mt-4 grid grid-cols-3 gap-2">
	              <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
	                <div className="text-[11px] font-extrabold text-slate-400">{t('income')}</div>
	                <div className="mt-1 text-sm font-extrabold text-emerald-200">{formatTHB(overviewTotals.income, { decimals: 0 })}</div>
	              </div>
	              <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
	                <div className="text-[11px] font-extrabold text-slate-400">{t('expense')}</div>
	                <div className="mt-1 text-sm font-extrabold text-rose-200">{formatTHB(overviewTotals.expense, { decimals: 0 })}</div>
	              </div>
	              <div className="rounded-3xl border border-white/10 bg-white/5 p-3">
	                <div className="text-[11px] font-extrabold text-slate-400">{t('remaining')}</div>
	                <div
	                  className={[
	                    'mt-1 text-sm font-extrabold',
	                    (overviewTotals.income - overviewTotals.expense) >= 0 ? 'text-emerald-100' : 'text-rose-100',
	                  ].join(' ')}
	                >
	                  {formatTHB(overviewTotals.income - overviewTotals.expense, { decimals: 0 })}
	                </div>
	              </div>
	            </div>

	            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-slate-300">
	              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />{t('income')}</span>
	              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" />{t('expense')}</span>
	            </div>

	            {overviewMode === 'daily' && dailySeries.labels.length > dailySeriesDisplay.labels.length && (
	              <div className="mt-2 text-[11px] font-semibold text-slate-400">
	                {t('show_last_days', { count: dailySeriesDisplay.labels.length })}
	              </div>
	            )}
	          </div>

          <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm lg:col-span-5 xl:col-span-4 lg:row-span-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('expense_share')}</div>
                <div className="text-xs font-semibold text-slate-400">
                  {expenseShareMode === 'all' ? t('expense_share_all') : t('expense_share_top')}
                </div>
              </div>             
            </div>

            <div className="mt-4">
              {pieLabels.length === 0 ? (
                <div className="h-56 lg:h-72 rounded-3xl border border-white/10 bg-white/5 flex items-center justify-center text-sm font-semibold text-slate-400">
                  {t('no_expense_this_month')}
                </div>
              ) : (
                <div className="relative h-64 lg:h-72">
                  <Doughnut data={pieData} options={pieChartOptions} />
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <div className="text-[11px] font-semibold text-slate-400">{t('total_expense')}</div>
                    <div className="mt-1 text-xl font-extrabold text-[color:var(--app-text)]">฿{formatCurrency(summary.expense)}</div>
                  </div>
                </div>
              )}
            </div>

            {pieLabels.length > 0 && (
              <div className={['mt-4 space-y-2', expenseShareMode === 'all' ? 'max-h-72 overflow-y-auto pr-1' : ''].join(' ')}>
                {(expenseShareMode === 'all' ? expenseListAll : topExpenseList).map(item => {
                  const total = summary.expense || 0;
                  const pct = total > 0 ? Math.round((item.amount / total) * 100) : 0;
                  const color = pieColorByLabel[item.name] || '#64748b';
                  return (
                    <div key={item.name} className="flex items-center justify-between gap-3 rounded-2xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
                        <div className="truncate text-sm font-bold text-[color:var(--app-text)]">{item.name}</div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-extrabold text-slate-300">
                          {pct}%
                        </span>
                        <div className="text-sm font-extrabold text-[color:var(--app-text)]">฿{formatCurrency(item.amount)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
	        </div>
	      </div>

	      </div>
	    </main>
	  );
	}
