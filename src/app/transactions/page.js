"use client";
import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import LoadingMascot from '@/components/LoadingMascot';
import ExportButton from '../../components/ExportButton';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  CalendarDays,
  Tag,
  ArrowUpDown,
  Utensils,
  ShoppingBag,
  Car,
  Home,
  Zap,
  Heart,
  Gamepad2,
  Stethoscope,
  GraduationCap,
  Plane,
  Briefcase,
  Gift,
  Smartphone,
  Coffee,
  Music,
  Dumbbell,
  PawPrint,
  Scissors,
  CreditCard,
  Landmark,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckSquare,
  Square,
  ListChecks,
  AlertTriangle,
  X,
} from 'lucide-react';

// Use same-origin requests in the browser and rely on Next.js `rewrites()` to reach the backend.
const API_BASE = '';

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const I18N = {
  th: {
    app_title: 'รายการ',
    app_subtitle: 'ธุรกรรม',
    loading: 'กำลังโหลด...',
    search_placeholder: 'ค้นหารายการ...',
    show_filters: 'แสดงตัวกรอง',
    hide_filters: 'ซ่อนตัวกรอง',
    filters: 'ตัวกรอง',
    category: 'หมวดหมู่',
    type: 'ประเภท',
    date_range: 'ช่วงเวลา',
    all: 'ทั้งหมด',
    expense: 'รายจ่าย',
    income: 'รายรับ',
    other_unassigned: 'อื่นๆ / ไม่ระบุ',
    clear: 'ล้าง',
    done: 'เสร็จสิ้น',
    select_multiple: 'เลือกหลายรายการ',
    no_transactions: 'ไม่พบธุรกรรม',
    try_adjust_filters: 'ลองเปลี่ยนตัวกรอง หรือเพิ่มรายการใหม่',
    reset_filters: 'ล้างตัวกรอง',
    unspecified: 'ไม่ระบุ',
    edit: 'แก้ไข',
    delete: 'ลบ',
    cancel: 'ยกเลิก',
    save: 'บันทึก',
    delete_this: 'ลบรายการนี้',
    n_items: ({ n }) => `${Number(n) || 0} รายการ`,
    selected_count: ({ n }) => `เลือกแล้ว ${Number(n) || 0} รายการ`,
    picked_count: ({ n }) => `เลือกแล้ว ${Number(n) || 0}`,
    at_least_one: 'เลือกอย่างน้อย 1 รายการ',
    edit_category: 'แก้หมวด',
    edit_date: 'แก้วันที่',
    delete_selected: ({ n }) => `ลบ (${Number(n) || 0})`,
    delete_selected_title: 'ลบรายการที่เลือก',
    confirm_bulk_category: ({ targetLabel, n }) => `แก้ประเภทเป็น "${targetLabel}" และแก้หมวดหมู่ของ ${Number(n) || 0} รายการที่เลือกใช่ไหม?`,
    confirm_bulk_date: ({ n, date }) => `แก้วันที่ของ ${Number(n) || 0} รายการที่เลือกเป็น ${String(date || '')} ใช่ไหม?`,
    error_generic: 'เกิดข้อผิดพลาด',
    error_delete_failed: 'ลบรายการไม่สำเร็จ',
    error_delete_partial: ({ n }) => `ลบไม่สำเร็จ ${Number(n) || 0} รายการ ลองใหม่อีกครั้ง`,
    error_amount_gt0: 'กรุณากรอกจำนวนเงินที่มากกว่า 0',
    export_none: 'ไม่มีรายการให้ส่งออก',
    export_failed: 'เกิดข้อผิดพลาดในการส่งออก',
    today: 'วันนี้',
    yesterday: 'เมื่อวาน',
    this_month: 'เดือนนี้',
    pick_month: 'เลือกเดือน',
    time_picker_title: 'เลือกช่วงเวลา',
    presets_today: 'วันนี้',
    presets_yesterday: 'เมื่อวาน',
    presets_this_week: 'สัปดาห์นี้',
    presets_last_week: 'สัปดาห์ที่แล้ว',
    presets_last7: '7 วันล่าสุด',
    presets_current_month: 'เดือนนี้',
    presets_last_month: 'เดือนที่แล้ว',
    presets_reset: 'รีเซ็ต',
    selected_range: 'ช่วงที่เลือก',
    clear_range: 'ล้างช่วง',
    start_placeholder: 'วันเริ่มต้น',
    end_placeholder: 'วันสิ้นสุด',
    start: 'เริ่ม',
    end: 'สิ้นสุด',
    use_single_day: 'ใช้วันเดียว (เริ่ม = สิ้นสุด)',
    prev_month: 'เดือนก่อนหน้า',
    next_month: 'เดือนถัดไป',
    tap_day_to_select: 'แตะวันที่เพื่อเลือก',
    pick_start: 'เลือกวันเริ่มต้น',
    pick_end: 'เลือกวันสิ้นสุด',
    day_select_aria: ({ d }) => `เลือกวันที่ ${Number(d) || d}`,
    aria_today: ' (วันนี้)',
    aria_future: ' (อนาคต)',
    bulk_cat_title: ({ n }) => `แก้หมวด (${Number(n) || 0})`,
    bulk_cat_hint: 'เลือกประเภทปลายทาง แล้วเลือกหมวดหมู่',
    warning: 'คำเตือน',
    mixed_types_1: 'รายการที่เลือกมีทั้งรายรับและรายจ่าย ระบบจะปรับเป็น',
    mixed_types_2: 'ทั้งหมด',
    target_settings: 'ตั้งค่าปลายทาง',
    target_type_cat: 'ประเภท + หมวดหมู่',
    applies_to: 'ใช้กับ',
    target_type: 'ประเภทปลายทาง',
    picked: 'เลือกแล้ว:',
    target_category: 'หมวดหมู่ปลายทาง',
    no_income_cats: 'ยังไม่มีหมวดรายรับ',
    no_expense_cats: 'ยังไม่มีหมวดรายจ่าย',
    go_add_cats: 'ไปเพิ่มหมวดในหน้า “งบประมาณ” ก่อน แล้วกลับมาเลือกใหม่',
    go_budget: 'ไปหน้า งบประมาณ',
    have_n_cats: ({ n, typeLabel }) => `มี ${Number(n) || 0} หมวด${typeLabel}`,
    bulk_date_title: ({ n }) => `แก้วันที่ (${Number(n) || 0})`,
    date: 'วันที่',
    pick_date: 'เลือกวันที่',
    open_calendar: 'เปิดปฏิทินเลือกวันที่',
    tap_open_calendar: 'แตะเพื่อเปิดปฏิทิน',
    multi_edit_date_hint: 'แก้หลายรายการพร้อมกัน (เลือกย้อนหลัง/ล่วงหน้าได้ สูงสุด 1 ปี)',
    single_edit_date_hint: 'เลือกย้อนหลัง/ล่วงหน้าได้ (สูงสุด 1 ปี)',
    close: 'ปิด',
    delete_confirm_aria: 'ยืนยันการลบ',
    delete_confirm_title: ({ n }) => `ลบ ${Number(n) || 0} รายการ?`,
    delete_irreversible: 'การลบจะไม่สามารถกู้คืนได้',
    deleting: 'กำลังลบ...',
    edit_txn_title: 'แก้ไขรายการ',
    edit_txn_subtitle: 'อัปเดตข้อมูลธุรกรรม',
    amount: 'จำนวนเงิน',
    notes: 'หมายเหตุ',
    notes_placeholder: 'เพิ่มรายละเอียด...',
    select_category_placeholder: 'กรุณาเลือกหมวดหมู่',
    no_categories_yet: 'ยังไม่มีหมวดหมู่',
  },
  en: {
    app_title: 'Transactions',
    app_subtitle: 'Transactions',
    loading: 'Loading...',
    search_placeholder: 'Search transactions...',
    show_filters: 'Show filters',
    hide_filters: 'Hide filters',
    filters: 'Filters',
    category: 'Category',
    type: 'Type',
    date_range: 'Date range',
    all: 'All',
    expense: 'Expense',
    income: 'Income',
    other_unassigned: 'Other / Unassigned',
    clear: 'Clear',
    done: 'Done',
    select_multiple: 'Select multiple',
    no_transactions: 'No transactions found',
    try_adjust_filters: 'Try adjusting filters or add a new transaction.',
    reset_filters: 'Reset filters',
    unspecified: 'Unassigned',
    edit: 'Edit',
    delete: 'Delete',
    cancel: 'Cancel',
    save: 'Save',
    delete_this: 'Delete this transaction',
    n_items: ({ n }) => `${Number(n) || 0} items`,
    selected_count: ({ n }) => `Selected ${Number(n) || 0} items`,
    picked_count: ({ n }) => `Selected ${Number(n) || 0}`,
    at_least_one: 'Select at least 1 item',
    edit_category: 'Edit category',
    edit_date: 'Edit date',
    delete_selected: ({ n }) => `Delete (${Number(n) || 0})`,
    delete_selected_title: 'Delete selected items',
    confirm_bulk_category: ({ targetLabel, n }) => `Change type to "${targetLabel}" and update category for ${Number(n) || 0} selected items?`,
    confirm_bulk_date: ({ n, date }) => `Change date for ${Number(n) || 0} selected items to ${String(date || '')}?`,
    error_generic: 'Something went wrong',
    error_delete_failed: 'Failed to delete',
    error_delete_partial: ({ n }) => `Failed to delete ${Number(n) || 0} items. Please try again.`,
    error_amount_gt0: 'Please enter an amount greater than 0',
    export_none: 'No transactions to export',
    export_failed: 'Export failed',
    today: 'Today',
    yesterday: 'Yesterday',
    this_month: 'This month',
    pick_month: 'Select month',
    time_picker_title: 'Select date range',
    presets_today: 'Today',
    presets_yesterday: 'Yesterday',
    presets_this_week: 'This week',
    presets_last_week: 'Last week',
    presets_last7: 'Last 7 days',
    presets_current_month: 'This month',
    presets_last_month: 'Last month',
    presets_reset: 'Reset',
    selected_range: 'Selected range',
    clear_range: 'Clear range',
    start_placeholder: 'Start date',
    end_placeholder: 'End date',
    start: 'Start',
    end: 'End',
    use_single_day: 'Use single day (start = end)',
    prev_month: 'Previous month',
    next_month: 'Next month',
    tap_day_to_select: 'Tap a day to select',
    pick_start: 'Pick start date',
    pick_end: 'Pick end date',
    day_select_aria: ({ d }) => `Select day ${Number(d) || d}`,
    aria_today: ' (today)',
    aria_future: ' (future)',
    bulk_cat_title: ({ n }) => `Bulk edit (${Number(n) || 0})`,
    bulk_cat_hint: 'Choose target type and category',
    warning: 'Warning',
    mixed_types_1: 'Your selection contains both income and expense. It will be converted to',
    mixed_types_2: 'for all items.',
    target_settings: 'Target',
    target_type_cat: 'Type + Category',
    applies_to: 'Applies to',
    target_type: 'Target type',
    picked: 'Selected:',
    target_category: 'Target category',
    no_income_cats: 'No income categories yet',
    no_expense_cats: 'No expense categories yet',
    go_add_cats: 'Add categories in “Budget” first, then come back.',
    go_budget: 'Go to Budget',
    have_n_cats: ({ n, typeLabel }) => `${Number(n) || 0} ${typeLabel} categories`,
    bulk_date_title: ({ n }) => `Edit date (${Number(n) || 0})`,
    date: 'Date',
    pick_date: 'Select date',
    open_calendar: 'Open date picker',
    tap_open_calendar: 'Tap to open calendar',
    multi_edit_date_hint: 'Bulk edit (past/future up to 1 year)',
    single_edit_date_hint: 'Past/future up to 1 year',
    close: 'Close',
    delete_confirm_aria: 'Confirm delete',
    delete_confirm_title: ({ n }) => `Delete ${Number(n) || 0} items?`,
    delete_irreversible: 'This action cannot be undone.',
    deleting: 'Deleting...',
    edit_txn_title: 'Edit transaction',
    edit_txn_subtitle: 'Update transaction details',
    amount: 'Amount',
    notes: 'Notes',
    notes_placeholder: 'Add details...',
    select_category_placeholder: 'Please select a category',
    no_categories_yet: 'No categories yet',
  },
};

const translate = (lang, key, vars) => {
  const table = I18N[lang] || I18N.th;
  const base = I18N.th;
  const entry = (table && table[key] != null) ? table[key] : base[key];
  if (typeof entry === 'function') return entry(vars || {});
  if (typeof entry === 'string') return entry;
  return String(key || '');
};

const moneyFormatter = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatMoney = (v) => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return String(v ?? '');
  try { return moneyFormatter.format(n); } catch { return String(n); }
};

const toYearMonthKey = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${d.getMonth()}`;
};

const toLocalISODateKey = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const getTxnCategoryId = (txn) => {
  if (!txn?.category) return '';
  return typeof txn.category === 'object' ? (txn.category._id || '') : txn.category;
};

const ICON_MAP = {
  food: Utensils,
  drink: Coffee,
  restaurant: Utensils,
  shopping: ShoppingBag,
  gift: Gift,
  clothes: Scissors,
  transport: Car,
  fuel: Zap,
  plane: Plane,
  home: Home,
  bills: Zap,
  pet: PawPrint,
  game: Gamepad2,
  music: Music,
  health: Stethoscope,
  sport: Dumbbell,
  money: Landmark,
  salary: CreditCard,
  work: Briefcase,
  education: GraduationCap,
  tech: Smartphone,
  other: MoreHorizontal,
  love: Heart,
};

const CategoryIcon = ({ iconName, className = 'w-6 h-6' }) => {
  const IconComp = ICON_MAP[iconName];
  if (IconComp) return <IconComp className={className} aria-hidden="true" />;
  if (typeof iconName === 'string' && iconName.trim()) {
    return <span className="text-xl leading-none" aria-hidden="true">{iconName}</span>;
  }
  return <MoreHorizontal className={className} aria-hidden="true" />;
};

export default function TransactionsPage() {
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [lang, setLang] = useState('th'); // 'th' | 'en'
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [bootLoading, setBootLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, income, expense
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(''); // format: `${year}-${monthIndex}`
  const [dayFilter, setDayFilter] = useState('all'); // all | today | yesterday
  const [dateRange, setDateRange] = useState({ start: '', end: '' }); // yyyy-mm-dd (local)
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [showFilters, setShowFilters] = useState(false);
  const [openDropdown, setOpenDropdown] = useState(null); // 'category' | 'date' | 'type' | null
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showEditDatePicker, setShowEditDatePicker] = useState(false);
  const [editDatePickerMonth, setEditDatePickerMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  });
  const [categories, setCategories] = useState([]);
  // Multi-select: [] means "ทั้งหมด"
  const [filterCategory, setFilterCategory] = useState([]); // string[] (categoryId | 'other')
  const [openSwipeId, setOpenSwipeId] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedTxnIds, setSelectedTxnIds] = useState(() => new Set());
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [showBulkDateModal, setShowBulkDateModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [deleteIds, setDeleteIds] = useState([]);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [bulkTargetType, setBulkTargetType] = useState('expense'); // 'expense' | 'income'
  const [bulkDate, setBulkDate] = useState('');
  const [showBulkDatePicker, setShowBulkDatePicker] = useState(false);
  const [bulkDatePickerMonth, setBulkDatePickerMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), monthIndex: d.getMonth() };
  });
  const filtersRef = useRef(null);
  const touchRef = useRef({ x: 0, y: 0, id: null, moved: false });
  const touchClearRef = useRef(null);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editCategoryMaxH, setEditCategoryMaxH] = useState(288);
  const [editCategoryPanelStyle, setEditCategoryPanelStyle] = useState(() => ({ left: 12, top: 12, width: 280, transform: 'translateY(0)' }));
  const editCategoryRootRef = useRef(null);
  const editCategoryButtonRef = useRef(null);
  const editCategoryPanelRef = useRef(null);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    type: 'expense',
    category: '',
    date: '',
    notes: '',
  });
  const editCategoryOptions = useMemo(() => {
    const type = String(editFormData?.type || '');
    return (categories || []).filter((c) => c?._id && c?.type === type);
  }, [categories, editFormData?.type]);
  const editCategorySelected = useMemo(() => {
    const id = String(editFormData?.category || '');
    if (!id) return null;
    return (categories || []).find((c) => String(c?._id || '') === id) || null;
  }, [categories, editFormData?.category]);

  const parseISODateKey = (iso) => {
    const parts = String(iso || '').split('-');
    if (parts.length !== 3) return null;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { year, monthIndex: month - 1, day };
  };

  const toISOFromParts = (year, monthIndex, day) => {
    const yyyy = String(year).padStart(4, '0');
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const openEditDatePicker = () => {
    const parsed = parseISODateKey(editFormData?.date);
    if (parsed) setEditDatePickerMonth({ year: parsed.year, monthIndex: parsed.monthIndex });
    else {
      const d = new Date();
      setEditDatePickerMonth({ year: d.getFullYear(), monthIndex: d.getMonth() });
    }
    setShowEditDatePicker(true);
  };

  const openBulkDatePicker = () => {
    const parsed = parseISODateKey(bulkDate);
    if (parsed) setBulkDatePickerMonth({ year: parsed.year, monthIndex: parsed.monthIndex });
    else {
      const d = new Date();
      setBulkDatePickerMonth({ year: d.getFullYear(), monthIndex: d.getMonth() });
    }
    setShowBulkDatePicker(true);
  };

  useEffect(() => {
    if (!showEditModal) setShowEditDatePicker(false);
  }, [showEditModal]);

  const recomputeEditCategoryPanel = useCallback(() => {
    if (typeof window === 'undefined') return;
    const btn = editCategoryButtonRef.current;
    if (!btn || !btn.getBoundingClientRect) return;
    const rect = btn.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement?.clientHeight || 0;
    const vw = window.innerWidth || document.documentElement?.clientWidth || 0;
    if (!vh || !vw) return;

    const margin = 12;
    const below = Math.max(0, vh - rect.bottom - margin);
    const above = Math.max(0, rect.top - margin);

    const minNeeded = 220;
    const preferUp = below < minNeeded && above > below;
    const available = preferUp ? above : below;
    setEditCategoryMaxH(Math.max(160, Math.min(360, Math.floor(available - 8))));

    const maxWidth = Math.max(0, vw - margin * 2);
    const width = Math.max(180, Math.min(rect.width || 280, maxWidth || rect.width || 280));
    const left = Math.min(Math.max(rect.left || margin, margin), Math.max(margin, vw - margin - width));
    const top = preferUp ? (rect.top - 8) : (rect.bottom + 8);
    const transform = preferUp ? 'translateY(-100%)' : 'translateY(0)';
    setEditCategoryPanelStyle({ left, top, width, transform });
  }, []);

  useEffect(() => {
    if (!editCategoryOpen) return;
    recomputeEditCategoryPanel();
    const onDown = (e) => {
      const root = editCategoryRootRef.current;
      const panel = editCategoryPanelRef.current;
      if (root && root.contains && root.contains(e.target)) return;
      if (panel && panel.contains && panel.contains(e.target)) return;
      setEditCategoryOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setEditCategoryOpen(false);
    };
    const onResize = () => recomputeEditCategoryPanel();
    const onScroll = () => recomputeEditCategoryPanel();
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('touchstart', onDown, true);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('scroll', onScroll, true);
    };
  }, [editCategoryOpen, recomputeEditCategoryPanel]);

  useEffect(() => {
    if (!showEditModal) setEditCategoryOpen(false);
  }, [showEditModal]);

  useEffect(() => {
    setEditCategoryOpen(false);
  }, [editFormData?.type]);

  useEffect(() => {
    if (!editCategoryOpen) return;
    recomputeEditCategoryPanel();
  }, [editCategoryOpen, recomputeEditCategoryPanel, editFormData?.category, editCategoryOptions?.length]);

  useEffect(() => {
    if (!showBulkDateModal) setShowBulkDatePicker(false);
  }, [showBulkDateModal]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const read = () => {
      try {
        const v = localStorage.getItem('balanz_lang');
        setLang(v === 'en' ? 'en' : 'th');
      } catch {
        setLang('th');
      }
    };
    read();

    const onCustom = () => read();
    const onStorage = (e) => {
      if (e && e.key === 'balanz_lang') read();
    };
    window.addEventListener('balanz_lang_change', onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('balanz_lang_change', onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const t = useCallback((key, vars) => translate(lang, key, vars), [lang]);
  const locale = useMemo(() => (lang === 'en' ? 'en-US' : 'th-TH'), [lang]);
  const weekdayLabels = useMemo(
    () => (lang === 'en' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']),
    [lang],
  );

  useEffect(() => {
    const mq = window.matchMedia?.('(min-width: 1024px)');
    if (!mq) return;

    const apply = () => setIsDesktop(Boolean(mq.matches));
    apply();

    try {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    } catch {
      mq.addListener?.(apply);
      return () => mq.removeListener?.(apply);
    }
  }, []);

  useEffect(() => {
    if (!isDesktop) return;
    setShowFilters(true);
  }, [isDesktop]);

  const selectedCount = selectedTxnIds.size;
  const txnById = useMemo(() => {
    const map = new Map();
    (transactions || []).forEach((t) => { if (t?._id) map.set(t._id, t); });
    return map;
  }, [transactions]);
  const selectedTxns = useMemo(() => {
    return Array.from(selectedTxnIds).map((id) => txnById.get(id)).filter(Boolean);
  }, [selectedTxnIds, txnById]);
  const selectedTypeSet = useMemo(() => {
    const set = new Set();
    selectedTxns.forEach((t) => { if (t?.type) set.add(t.type); });
    return set;
  }, [selectedTxns]);
  const selectionHasMixedTypes = selectedCount > 0 && selectedTypeSet.size > 1;
  const bulkCategories = useMemo(() => {
    return (categories || []).filter((c) => c?.type === bulkTargetType);
  }, [categories, bulkTargetType]);
  const canBulkSaveCategory = selectedCount > 0 && Boolean(bulkCategoryId) && (bulkCategories || []).length > 0;

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedTxnIds(new Set());
    setOpenSwipeId(null);
    setShowBulkCategoryModal(false);
    setShowBulkDateModal(false);
    setShowDeleteConfirmModal(false);
    setDeleteIds([]);
    setDeleteLoading(false);
    setDeleteError('');
  };

  const toggleSelectTxn = (id) => {
    if (!id) return;
    setSelectedTxnIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    const ids = (filteredTransactions || []).map((t) => t?._id).filter(Boolean);
    setSelectedTxnIds(new Set(ids));
  };

  const clearSelection = () => setSelectedTxnIds(new Set());

  const openDeleteConfirm = (ids) => {
    const next = (ids || []).map((v) => String(v || '')).filter(Boolean);
    if (next.length === 0) return;
    setDeleteIds(next);
    setDeleteError('');
    setShowDeleteConfirmModal(true);
  };

  const handleBulkDelete = () => {
    if (selectedTxnIds.size === 0) return;
    openDeleteConfirm(Array.from(selectedTxnIds));
  };

  const confirmDelete = async () => {
    if (deleteLoading) return;
    if (!deleteIds || deleteIds.length === 0) return;

    try {
      setDeleteLoading(true);
      setDeleteError('');
      const token = localStorage.getItem('token');
      const ids = [...deleteIds];

      const results = await Promise.allSettled(ids.map(async (id) => {
        const res = await fetch(`${API_BASE}/api/transactions/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          let msg = '';
          try {
            const data = await res.json();
            msg = data?.message ? String(data.message) : '';
          } catch {}
          throw new Error(msg || t('error_delete_failed'));
        }
        return true;
      }));

      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        setDeleteError(t('error_delete_partial', { n: failed.length }));
        return;
      }

      await fetchTransactions(token);

      setShowDeleteConfirmModal(false);
      setDeleteIds([]);
      setShowEditModal(false);
      setEditingTransaction(null);
      setOpenSwipeId(null);

      if (selectMode) exitSelectMode();
    } catch (err) {
      setDeleteError(err?.message ? String(err.message) : t('error_delete_failed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkUpdateCategory = async () => {
    if (selectedCount === 0) return;
    if (!bulkTargetType) return;
    if (!bulkCategoryId) return;
    const targetLabel = bulkTargetType === 'income' ? t('income') : t('expense');
    if (!confirm(t('confirm_bulk_category', { targetLabel, n: selectedCount }))) return;

    try {
      const token = localStorage.getItem('token');
      const ids = Array.from(selectedTxnIds);
      await Promise.all(ids.map((id) => fetch(`${API_BASE}/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: bulkTargetType, category: bulkCategoryId }),
      })));
      await fetchTransactions(token);
      setShowBulkCategoryModal(false);
      exitSelectMode();
    } catch (err) {
      setError(`${t('error_generic')}: ${String(err?.message || 'Error')}`);
    }
  };

  const handleBulkUpdateDate = async () => {
    if (selectedCount === 0) return;
    if (!bulkDate) return;
    if (!confirm(t('confirm_bulk_date', { n: selectedCount, date: bulkDate }))) return;

    try {
      const token = localStorage.getItem('token');
      const ids = Array.from(selectedTxnIds);
      await Promise.all(ids.map((id) => fetch(`${API_BASE}/api/transactions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: bulkDate }),
      })));
      await fetchTransactions(token);
      setShowBulkDateModal(false);
      exitSelectMode();
    } catch (err) {
      setError(`${t('error_generic')}: ${String(err?.message || 'Error')}`);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    let cancelled = false;
    const loadInitial = async () => {
      setBootLoading(true);
      setError('');
      try {
        const [tRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/api/transactions`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/categories`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!tRes.ok) throw new Error('Failed to fetch transactions');
        if (!cRes.ok) throw new Error('Failed to fetch categories');
        const [tData, cData] = await Promise.all([tRes.json(), cRes.json()]);
        const sorted = (Array.isArray(tData) ? tData : []).sort((a, b) => new Date(b.date) - new Date(a.date));
        if (cancelled) return;
        setTransactions(sorted);
        setCategories(Array.isArray(cData) ? cData : []);
        exitSelectMode();
      } catch (e) {
        if (cancelled) return;
        setError(`${t('error_generic')}: ${String(e?.message || 'Error')}`);
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    };

    loadInitial();
    return () => { cancelled = true; };
  }, [t]);

  useEffect(() => {
    if (!openDropdown) return;
    const onDown = (e) => {
      const root = filtersRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setOpenDropdown(null);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpenDropdown(null);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('touchstart', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [openDropdown]);

  useEffect(() => {
    if (!showFilters) setOpenDropdown(null);
  }, [showFilters]);

  useEffect(() => {
    let filtered = transactions;

    // Filter by explicit date range (takes precedence)
    if (dateRange?.start) {
      const startKey = dateRange.start;
      const endKey = dateRange.end || dateRange.start;
      filtered = filtered.filter(txn => {
        const key = toLocalISODateKey(txn?.date);
        return key && key >= startKey && key <= endKey;
      });
    } else {
    // Filter by type
    if (filterType !== 'all') {
      filtered = filtered.filter(txn => txn.type === filterType);
    }

    // Filter by day preset
    if (dayFilter !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const targetKey = dayFilter === 'today' ? toLocalISODateKey(today) : toLocalISODateKey(yesterday);
      filtered = filtered.filter(txn => toLocalISODateKey(txn.date) === targetKey);
    }

    // Filter by selected month (year-month key)
    if (selectedMonth) {
      filtered = filtered.filter(txn => {
        return toYearMonthKey(txn.date) === selectedMonth;
      });
    }
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(txn => 
        (txn.category?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (txn.notes || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category (multi-select)
    if (Array.isArray(filterCategory) && filterCategory.length > 0) {
      const pickedIds = new Set(filterCategory.filter((x) => x && x !== 'other'));
      const pickedOther = filterCategory.includes('other');
      const knownIds = pickedOther ? new Set((categories || []).map(c => c._id)) : null;

      filtered = filtered.filter((txn) => {
        const id = getTxnCategoryId(txn);
        const matchesPickedId = id && pickedIds.has(id);
        if (matchesPickedId) return true;
        if (!pickedOther) return false;
        return !id || (knownIds && !knownIds.has(id));
      });
    }

    setFilteredTransactions(filtered);
  }, [transactions, filterType, searchQuery, selectedMonth, dayFilter, dateRange, filterCategory, categories]);

  // If the visible list changes, keep selection only for IDs still visible.
  useEffect(() => {
    if (!selectMode) return;
    const visible = new Set((filteredTransactions || []).map((t) => t?._id).filter(Boolean));
    setSelectedTxnIds((prev) => {
      const next = new Set();
      prev.forEach((id) => { if (visible.has(id)) next.add(id); });
      return next;
    });
  }, [filteredTransactions, selectMode]);

  useEffect(() => {
    if (!showBulkCategoryModal) return;
    const preferredType = selectedTypeSet.size === 1 ? Array.from(selectedTypeSet)[0] : 'expense';
    setBulkTargetType(preferredType === 'income' ? 'income' : 'expense');
  }, [showBulkCategoryModal, selectedTypeSet]);

  useEffect(() => {
    if (!showBulkCategoryModal) return;
    const allowed = new Set((bulkCategories || []).map((c) => String(c?._id || '')).filter(Boolean));
    if (bulkCategoryId && allowed.has(String(bulkCategoryId))) return;
    const first = bulkCategories?.[0]?._id || '';
    setBulkCategoryId(first);
  }, [showBulkCategoryModal, bulkTargetType, bulkCategories, bulkCategoryId]);

  useEffect(() => {
    if (!showBulkDateModal) return;
    if (bulkDate) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setBulkDate(`${yyyy}-${mm}-${dd}`);
  }, [showBulkDateModal, bulkDate]);

  // Export filtered transactions to CSV (Excel-compatible)
  const exportToCSV = () => {
    try {
      if (!filteredTransactions || filteredTransactions.length === 0) {
        alert(t('export_none'));
        return;
      }
      const headers = [t('date'), t('type'), t('category'), t('amount'), t('notes')];
      const rows = filteredTransactions.map(t => [
        new Date(t.date).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' }),
        t.type,
        t.category?.name || '',
        t.amount,
        (t.notes || '').replace(/\n/g, ' ')
      ]);

      const csv = [headers, ...rows].map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV error', err);
      alert(t('export_failed'));
    }
  };

  const fetchTransactions = async (token) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch transactions');
      
      const data = await res.json();
      const sorted = data.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(sorted);
      setFilteredTransactions(sorted);
    } catch (error) {
      setError(`${t('error_generic')}: ${String(error?.message || '')}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      amount: transaction.amount,
      type: transaction.type,
      category: (transaction?.category && typeof transaction.category === 'object')
        ? (transaction.category._id || '')
        : (transaction?.category || ''),
      date: new Date(transaction.date).toISOString().split('T')[0],
      notes: transaction.notes || '',
    });
    setShowEditModal(true);
  };

  const handleDelete = (transactionId) => {
    if (!transactionId) return;
    openDeleteConfirm([transactionId]);
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!editFormData.amount || parseFloat(editFormData.amount) <= 0) {
      setError(t('error_amount_gt0'));
      return;
    }
    if (!editFormData.category) {
      setError(t('select_category_placeholder'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/transactions/${editingTransaction._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...editFormData,
          amount: parseFloat(editFormData.amount),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || t('error_generic'));

      setShowEditModal(false);
      setEditingTransaction(null);
      fetchTransactions(token);
    } catch (error) {
      setError(`${t('error_generic')}: ${String(error?.message || '')}`);
    }
  };

  const formatTimeHHmm = (dateInput) => {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '';
    try {
      return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const renderTxnIcon = (txn) => {
    const id = getTxnCategoryId(txn);
    const cat = (typeof txn?.category === 'object' && txn?.category) ? txn.category : (categories || []).find(c => c._id === id);
    const iconName = cat?.icon || txn?.category?.icon;
    return <CategoryIcon iconName={iconName} className="w-6 h-6" />;
  };

  const hashString = (s) => {
    const str = String(s || '');
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
    return h;
  };

  const getTxnBadgeClasses = (txn) => {
    if (txn?.type === 'income') {
      return 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/20';
    }
    const palette = [
      'bg-orange-500/15 text-orange-200 ring-orange-400/20',
      'bg-sky-500/15 text-sky-200 ring-sky-400/20',
      'bg-violet-500/15 text-violet-200 ring-violet-400/20',
      'bg-rose-500/15 text-rose-200 ring-rose-400/20',
      'bg-amber-500/15 text-amber-200 ring-amber-400/20',
      'bg-teal-500/15 text-teal-200 ring-teal-400/20',
    ];
    const id = getTxnCategoryId(txn) || txn?.category?.name || txn?._id || 'expense';
    return palette[hashString(id) % palette.length];
  };

  const getGroupDateLabel = useCallback((isoKey) => {
    try {
      const d = new Date(isoKey);
      if (Number.isNaN(d.getTime())) return isoKey;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);

      const todayKey = toLocalISODateKey(today);
      const yesterdayKey = toLocalISODateKey(yesterday);

      if (isoKey === todayKey) return t('today');
      if (isoKey === yesterdayKey) return t('yesterday');

      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoKey;
    }
  }, [t, locale]);

  // Build month options as ranges (e.g. "1 ก.พ. - 28 ก.พ. 2569")
  const monthOptions = (() => {
    const map = new Map();
    transactions.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (!map.has(key)) map.set(key, { year: d.getFullYear(), month: d.getMonth() });
    });

    return Array.from(map.keys())
      .map(key => {
        const [y, m] = key.split('-').map(Number);
        const d = new Date(y, m, 1);
        const monthShort = d.toLocaleDateString(locale, { month: 'short' });
        const yearText = d.toLocaleDateString(locale, { year: 'numeric' });
        const endDay = new Date(y, m + 1, 0).getDate();
        const label = `1 ${monthShort} - ${endDay} ${monthShort} ${yearText}`;
        return { key, label, y, m };
      })
      .sort((a, b) => (b.y * 12 + b.m) - (a.y * 12 + a.m));
  })();

  // Group filtered transactions by ISO date (yyyy-mm-dd) for daily headers and totals
  const groupedTransactions = useMemo(() => {
    const groups = {};
    filteredTransactions.forEach(txn => {
      const key = toLocalISODateKey(txn.date);
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(txn);
    });

    return Object.keys(groups)
      .sort((a, b) => new Date(b) - new Date(a))
      .map(key => {
        const items = groups[key];
        const dateLabel = getGroupDateLabel(key);
        const net = items.reduce((s, t) => t.type === 'income' ? s + t.amount : s - t.amount, 0);
        return { key, dateLabel, items, net };
      });
  }, [filteredTransactions, getGroupDateLabel]);

  const displayedCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    if (filterType === 'all') return categories;
    return categories.filter(c => c.type === filterType);
  }, [categories, filterType]);

  const sortedCategories = useMemo(() => {
    const byName = (a, b) => String(a?.name || '').localeCompare(String(b?.name || ''), 'th');
    const expense = (Array.isArray(categories) ? categories : []).filter(c => c?.type === 'expense').sort(byName);
    const income = (Array.isArray(categories) ? categories : []).filter(c => c?.type === 'income').sort(byName);
    const displayed = (Array.isArray(displayedCategories) ? displayedCategories : []).slice().sort(byName);
    return { expense, income, displayed };
  }, [categories, displayedCategories]);

  const onCardTouchStart = (id, e) => {
    const t = e.touches?.[0];
    if (!t) return;
    touchRef.current = { x: t.clientX, y: t.clientY, id, moved: false };
  };

  const onCardTouchMove = (id, e) => {
    const t = e.touches?.[0];
    if (!t) return;
    const start = touchRef.current;
    if (start.id !== id) return;
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 18 || Math.abs(dy) > 24) return;
    touchRef.current.moved = true;
    if (dx < 0) setOpenSwipeId(id);
    if (dx > 0 && openSwipeId === id) setOpenSwipeId(null);
  };

  const onCardTouchEnd = (id) => {
    const start = touchRef.current;
    if (start.id !== id) return;
    if (!start.moved) {
      touchRef.current = { x: 0, y: 0, id: null, moved: false };
      return;
    }
    if (touchClearRef.current) clearTimeout(touchClearRef.current);
    touchClearRef.current = setTimeout(() => {
      touchRef.current = { x: 0, y: 0, id: null, moved: false };
      touchClearRef.current = null;
    }, 220);
  };

  const categoryApplied = Array.isArray(filterCategory) && filterCategory.length > 0;
  const typeApplied = filterType && filterType !== 'all';
  const dateApplied = dayFilter !== 'all' || !!selectedMonth || !!dateRange?.start;
  const currentMonthKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;

  const formatShortDateLabel = useCallback((isoKey) => {
    try {
      const d = new Date(`${isoKey}T00:00:00`);
      if (Number.isNaN(d.getTime())) return isoKey;
      return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    } catch {
      return isoKey;
    }
  }, [locale]);

  const selectedRangeLabel = useMemo(() => {
    if (!dateRange?.start) return '';
    const s = dateRange.start;
    const e = dateRange.end || dateRange.start;
    if (s === e) return formatShortDateLabel(s);
    return `${formatShortDateLabel(s)} - ${formatShortDateLabel(e)}`;
  }, [dateRange, formatShortDateLabel]);

  const selectedCategoryLabel = useMemo(() => {
    const picked = Array.isArray(filterCategory) ? filterCategory : [];
    if (picked.length === 0) return t('all');
    if (picked.length === 1 && picked[0] === 'other') return t('other_unassigned');
    if (picked.length === 1) {
      const cat = (Array.isArray(categories) ? categories : []).find(c => c?._id === picked[0]);
      return cat?.name || t('category');
    }
    return t('picked_count', { n: picked.length });
  }, [categories, filterCategory, t]);

  const toggleFilterCategory = (id) => {
    setFilterCategory((prev) => {
      const curr = Array.isArray(prev) ? prev : [];
      if (!id) return curr;
      if (curr.includes(id)) return curr.filter((x) => x !== id);
      return [...curr, id];
    });
  };

  const selectedDateLabel = useMemo(() => {
    if (selectedRangeLabel) return selectedRangeLabel;
    if (dayFilter === 'today') return t('today');
    if (dayFilter === 'yesterday') return t('yesterday');
    if (selectedMonth) {
      if (selectedMonth === currentMonthKey) return t('this_month');
      const opt = monthOptions.find(o => o.key === selectedMonth);
      return opt?.label || t('pick_month');
    }
    return t('all');
  }, [selectedRangeLabel, dayFilter, selectedMonth, currentMonthKey, monthOptions, t]);

  const selectedTypeLabel = useMemo(() => {
    if (filterType === 'income') return t('income');
    if (filterType === 'expense') return t('expense');
    return t('all');
  }, [filterType, t]);

  const filterButtonBase = 'relative flex items-center gap-2 h-11 w-full rounded-2xl border px-4 pr-10 text-sm font-extrabold text-left border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] shadow-sm shadow-black/10 hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition motion-reduce:transition-none';
  const dropdownPanelBase = 'absolute left-0 right-0 top-[calc(100%+8px)] z-[20] max-h-72 overflow-auto rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-black/20';
  const dropdownItemBase = 'w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between gap-3 text-[color:var(--app-text)] hover:bg-[var(--app-surface-2)]';
  const dropdownActive = 'bg-emerald-500/15 text-emerald-200';

  const formatThaiShortDate = useCallback((isoKey) => {
    if (!isoKey) return '';
    try {
      const d = new Date(`${isoKey}T00:00:00`);
      if (Number.isNaN(d.getTime())) return isoKey;
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return isoKey;
    }
  }, [locale]);
  const toISOKeyLocal = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };
  const startOfWeekMonday = (d) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = x.getDay(); // 0 Sun..6 Sat
    const delta = (day + 6) % 7; // Mon=0
    x.setDate(x.getDate() - delta);
    return x;
  };
  const addDays = (d, n) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };

  const applyPreset = (key) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (key === 'reset') {
      setDateRange({ start: '', end: '' });
      setDayFilter('all');
      setSelectedMonth('');
      try { setOpenDropdown(null); } catch {}
      return;
    }

    let start = null;
    let end = null;
    if (key === 'last7') {
      end = today;
      start = addDays(today, -6);
    } else if (key === 'thisWeek') {
      start = startOfWeekMonday(today);
      end = addDays(start, 6);
    } else if (key === 'lastWeek') {
      end = addDays(startOfWeekMonday(today), -1);
      start = addDays(end, -6);
    } else if (key === 'currentMonth') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
      end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    } else if (key === 'lastMonth') {
      start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      end = new Date(today.getFullYear(), today.getMonth(), 0);
    }

    if (!start || !end) return;
    const startKey = toISOKeyLocal(start);
    const endKey = toISOKeyLocal(end);
    setDateRange({ start: startKey, end: endKey });
    setDayFilter('all');
    setSelectedMonth('');
    setCalendarMonth(new Date(start.getFullYear(), start.getMonth(), 1));
    try { setOpenDropdown(null); } catch {}
  };

  const applyDayPreset = (key) => {
    if (key !== 'today' && key !== 'yesterday') return;
    setDateRange({ start: '', end: '' });
    setSelectedMonth('');
    setDayFilter(key);
    try { setOpenDropdown(null); } catch {}
  };

  const setExplicitRange = (nextStart, nextEnd) => {
    const start = String(nextStart || '');
    const end = String(nextEnd || '');
    let s = start;
    let e = end;
    if (s && e && e < s) {
      const tmp = s;
      s = e;
      e = tmp;
    }
    setDateRange({ start: s, end: e });
    setDayFilter('all');
    setSelectedMonth('');
    if (s) {
      const d = new Date(`${s}T00:00:00`);
      if (!Number.isNaN(d.getTime())) setCalendarMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  };

  const onPickDay = (isoKey) => {
    if (!isoKey) return;
    // switching to explicit range => clear old modes
    setDayFilter('all');
    setSelectedMonth('');

    // If a start date already exists and no end date yet, this pick will finish the range.
    // Auto-close the calendar to make selection feel "workable" on mobile.
    if (dateRange?.start && !dateRange?.end) {
      try { setOpenDropdown(null); } catch {}
    }

    setDateRange((prev) => {
      const start = prev?.start || '';
      const end = prev?.end || '';
      if (!start || (start && end)) return { start: isoKey, end: '' };
      if (isoKey < start) return { start: isoKey, end: start };
      return { start, end: isoKey };
    });
  };

  const renderMonth = (monthDate) => {
    const y = monthDate.getFullYear();
    const m = monthDate.getMonth();
    const first = new Date(y, m, 1);
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDay = first.getDay(); // 0 Sun..6 Sat
    const leading = (firstDay + 6) % 7; // Monday start

    const cells = [];
    for (let i = 0; i < leading; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
    while (cells.length % 7 !== 0) cells.push(null);

    const startKey = dateRange?.start || '';
    const endKey = dateRange?.end || '';
    const rangeEnd = endKey || startKey;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayKey = toISOKeyLocal(today);

    return (
      <div className="min-w-0">
        <div className="grid grid-cols-7 gap-1 px-1 pb-2 text-center text-[10px] font-semibold text-[color:var(--app-muted-2)]">
          {weekdayLabels.map((l, i) => (
            <div key={`${l}-${i}`} className={i >= 5 ? 'text-slate-400' : ''}>
              {l}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 px-1">
          {cells.map((d, idx) => {
            if (!d) return <div key={`e-${idx}`} className="aspect-square w-full" />;
            const key = toISOKeyLocal(d);
            const inRange = startKey && key >= startKey && key <= rangeEnd;
            const isStart = startKey && key === startKey;
            const isEnd = rangeEnd && key === rangeEnd;
            const selected = isStart || isEnd;
            const isToday = key === todayKey;
            const isFuture = !!todayKey && key > todayKey;
            return (
              <button
                key={key}
                type="button"
                disabled={isFuture}
                onClick={() => onPickDay(key)}
                className={[
                  'relative aspect-square w-full rounded-2xl text-[13px] font-extrabold transition motion-reduce:transition-none',
                  'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
                  'disabled:opacity-35 disabled:cursor-not-allowed',
                  inRange ? 'bg-emerald-500/10 text-[color:var(--app-text)]' : 'bg-white/0 text-[color:var(--app-text)] hover:bg-[var(--app-surface-2)]',
                  selected ? 'bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/20 hover:bg-emerald-300' : '',
                  isToday && !selected ? 'ring-1 ring-sky-400/35' : '',
                ].join(' ')}
                aria-label={`${formatThaiShortDate(key) || key}${isToday ? t('aria_today') : ''}${isFuture ? t('aria_future') : ''}`}
              >
                {d.getDate()}
                {isToday && !selected && (
                  <span className="pointer-events-none absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-sky-300" aria-hidden="true" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const filtersVisible = isDesktop || showFilters;
  const filtersCard = (
    <div ref={filtersRef} className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--app-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] py-3 pl-12 pr-4 text-sm font-semibold text-[color:var(--app-text)] placeholder-[color:var(--app-muted-2)] shadow-sm hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(v => !v)}
          className={[
            'lg:hidden inline-flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm transition focus:outline-none focus:ring-2 motion-reduce:transition-none',
            showFilters
              ? 'border-emerald-400/20 bg-emerald-500/15 text-emerald-100 shadow-black/10 hover:bg-emerald-500/20 focus:ring-emerald-400/35'
              : 'border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] shadow-black/10 hover:bg-[var(--app-surface-3)] focus:ring-emerald-400/30',
          ].join(' ')}
          aria-label={showFilters ? t('hide_filters') : t('show_filters')}
          title={showFilters ? t('hide_filters') : t('show_filters')}
        >
          <SlidersHorizontal className="h-5 w-5" />
        </button>
      </div>

      {filtersVisible && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {/* Category */}
          <div className="relative">
            <div className="mb-1 flex items-center gap-2 px-1 text-[11px] font-semibold text-[color:var(--app-muted)]">
              <Tag className="h-3.5 w-3.5" aria-hidden="true" />
              {t('category')}
            </div>
            <button
              type="button"
              onClick={() => setOpenDropdown(v => (v === 'category' ? null : 'category'))}
              className={[
                filterButtonBase,
                categoryApplied ? 'border-emerald-400/30' : 'border-[color:var(--app-border)]',
              ].join(' ')}
              aria-haspopup="listbox"
              aria-expanded={openDropdown === 'category'}
            >
              <span className="truncate flex-1">{selectedCategoryLabel}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[color:var(--app-muted)]">
                <ChevronDown className="h-4 w-4" />
              </span>
            </button>
            {openDropdown === 'category' && (
              <div className={dropdownPanelBase} role="listbox" aria-label={t('category')}>
                <button
                  type="button"
                  className={[dropdownItemBase, filterCategory.length === 0 ? dropdownActive : ''].join(' ')}
                  onClick={() => setFilterCategory([])}
                >
                  <span>{t('all')}</span>
                  {filterCategory.length === 0 && <span className="text-emerald-300">✓</span>}
                </button>

                {filterType === 'all' ? (
                  <>
                    {sortedCategories.expense.length > 0 && (
                      <div className="px-4 py-2 text-[11px] font-semibold tracking-wide text-[color:var(--app-muted-2)]">{t('expense')}</div>
                    )}
                    {sortedCategories.expense.map((cat) => (
                      <button
                        key={cat._id}
                        type="button"
                        className={[dropdownItemBase, filterCategory.includes(cat._id) ? dropdownActive : ''].join(' ')}
                        onClick={() => toggleFilterCategory(cat._id)}
                      >
                        <span className="truncate inline-flex items-center gap-2">
                          <CategoryIcon iconName={cat.icon} className="w-4 h-4 text-[color:var(--app-muted)]" />
                          {cat.name}
                        </span>
                        {filterCategory.includes(cat._id) && <span className="text-emerald-300">✓</span>}
                      </button>
                    ))}

                    {sortedCategories.income.length > 0 && (
                      <div className="px-4 py-2 text-[11px] font-semibold tracking-wide text-[color:var(--app-muted-2)]">{t('income')}</div>
                    )}
                    {sortedCategories.income.map((cat) => (
                      <button
                        key={cat._id}
                        type="button"
                        className={[dropdownItemBase, filterCategory.includes(cat._id) ? dropdownActive : ''].join(' ')}
                        onClick={() => toggleFilterCategory(cat._id)}
                      >
                        <span className="truncate inline-flex items-center gap-2">
                          <CategoryIcon iconName={cat.icon} className="w-4 h-4 text-[color:var(--app-muted)]" />
                          {cat.name}
                        </span>
                        {filterCategory.includes(cat._id) && <span className="text-emerald-300">✓</span>}
                      </button>
                    ))}
                  </>
                ) : (
                  sortedCategories.displayed.map((cat) => (
                    <button
                      key={cat._id}
                      type="button"
                      className={[dropdownItemBase, filterCategory.includes(cat._id) ? dropdownActive : ''].join(' ')}
                      onClick={() => toggleFilterCategory(cat._id)}
                    >
                      <span className="truncate inline-flex items-center gap-2">
                        <CategoryIcon iconName={cat.icon} className="w-4 h-4 text-[color:var(--app-muted)]" />
                        {cat.name}
                      </span>
                      {filterCategory.includes(cat._id) && <span className="text-emerald-300">✓</span>}
                    </button>
                  ))
                )}

                <div className="my-1 h-px bg-white/10" aria-hidden="true" />
                <button
                  type="button"
                  className={[dropdownItemBase, filterCategory.includes('other') ? dropdownActive : ''].join(' ')}
                  onClick={() => toggleFilterCategory('other')}
                >
                  <span>{t('other_unassigned')}</span>
                  {filterCategory.includes('other') && <span className="text-emerald-300">✓</span>}
                </button>

                <div className="sticky bottom-0 border-t border-[color:var(--app-border)] bg-[var(--app-surface)] p-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFilterCategory([])}
                      className="flex-1 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2 text-xs font-extrabold text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]"
                    >
                      {t('clear')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="flex-1 rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-extrabold text-slate-950 hover:brightness-95"
                    >
                      {t('done')}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Type */}
          <div className="relative">
            <div className="mb-1 flex items-center gap-2 px-1 text-[11px] font-semibold text-[color:var(--app-muted)]">
              <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
              {t('type')}
            </div>
            <button
              type="button"
              onClick={() => setOpenDropdown(v => (v === 'type' ? null : 'type'))}
              className={[
                filterButtonBase,
                typeApplied ? 'border-emerald-400/30' : 'border-[color:var(--app-border)]',
              ].join(' ')}
              aria-haspopup="listbox"
              aria-expanded={openDropdown === 'type'}
            >
              <span className="truncate flex-1">{selectedTypeLabel}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[color:var(--app-muted)]">
                <ChevronDown className="h-4 w-4" />
              </span>
            </button>
            {openDropdown === 'type' && (
              <div className={dropdownPanelBase} role="listbox" aria-label={t('type')}>
                <button
                  type="button"
                  className={[dropdownItemBase, filterType === 'all' ? dropdownActive : ''].join(' ')}
                  onClick={() => { setFilterType('all'); setOpenDropdown(null); }}
                >
                  <span>{t('all')}</span>
                  {filterType === 'all' && <span className="text-emerald-300">✓</span>}
                </button>
                <button
                  type="button"
                  className={[dropdownItemBase, filterType === 'expense' ? dropdownActive : ''].join(' ')}
                  onClick={() => { setFilterType('expense'); setOpenDropdown(null); }}
                >
                  <span>{t('expense')}</span>
                  {filterType === 'expense' && <span className="text-emerald-300">✓</span>}
                </button>
                <button
                  type="button"
                  className={[dropdownItemBase, filterType === 'income' ? dropdownActive : ''].join(' ')}
                  onClick={() => { setFilterType('income'); setOpenDropdown(null); }}
                >
                  <span>{t('income')}</span>
                  {filterType === 'income' && <span className="text-emerald-300">✓</span>}
                </button>
              </div>
            )}
          </div>

          {/* Date */}
          <div className="relative sm:col-span-2">
            <div className="mb-1 flex items-center gap-2 px-1 text-[11px] font-semibold text-[color:var(--app-muted)]">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              {t('date_range')}
            </div>
            <button
              type="button"
              onClick={() => setOpenDropdown(v => (v === 'date' ? null : 'date'))}
              className={[
                filterButtonBase,
                dateApplied ? 'border-emerald-400/30' : 'border-[color:var(--app-border)]',
              ].join(' ')}
              aria-haspopup="dialog"
              aria-expanded={openDropdown === 'date'}
            >
              <span className="truncate flex-1">{selectedDateLabel}</span>
              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-[color:var(--app-muted)]">
                <ChevronDown className="h-4 w-4" />
              </span>
            </button>

	            {mounted && openDropdown === 'date' && createPortal((
	              <div
	                className={[
                    'fixed inset-0 z-[9999] bg-slate-950/30 backdrop-blur-sm animate-fadeIn flex justify-center overflow-hidden overscroll-contain',
                    isDesktop ? 'items-center p-4' : 'items-end sm:items-center p-0 sm:p-4 pb-[env(safe-area-inset-bottom)] sm:pb-0',
                  ].join(' ')}
	                role="dialog"
	                aria-label={t('time_picker_title')}
	                onClick={(e) => e.target === e.currentTarget && setOpenDropdown(null)}
	              >
	                <div
                    className={[
                      'bg-[var(--app-surface)] w-full overflow-hidden animate-slideUp border border-[color:var(--app-border)] text-[color:var(--app-text)] flex flex-col',
                      isDesktop ? 'max-w-lg rounded-3xl max-h-[88dvh]' : 'sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92dvh] sm:max-h-[88dvh]',
                    ].join(' ')}
                  >
                  <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[color:var(--app-border)]">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold tracking-wide text-[color:var(--app-muted)]">{t('filters')}</div>
                      <div className="truncate text-base font-extrabold">{t('date_range')}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                      aria-label={t('close')}
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto overscroll-contain">
                    {/* Presets */}
                    <div className="sticky top-0 z-[1] bg-[var(--app-surface)] border-b border-[color:var(--app-border)]">
                      <div className="flex gap-2 overflow-x-auto px-4 py-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                        {[
                          { key: 'today', label: t('presets_today') },
                          { key: 'yesterday', label: t('presets_yesterday') },
                          { key: 'thisWeek', label: t('presets_this_week') },
                          { key: 'lastWeek', label: t('presets_last_week') },
                          { key: 'last7', label: t('presets_last7') },
                          { key: 'currentMonth', label: t('presets_current_month') },
                          { key: 'lastMonth', label: t('presets_last_month') },
                          { key: 'reset', label: t('presets_reset') },
                        ].map((p) => (
                          <button
                            key={p.key}
                            type="button"
                            onClick={() => (p.key === 'today' || p.key === 'yesterday' ? applyDayPreset(p.key) : applyPreset(p.key))}
                            className={[
                              'shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-extrabold transition motion-reduce:transition-none',
                              p.key === 'reset'
                                ? 'border-rose-500/25 bg-rose-500/10 text-[color:var(--app-danger)] hover:bg-rose-500/15'
                                : 'border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]',
                            ].join(' ')}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected range summary + inputs */}
                    <div className="p-4">
                      <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('selected_range')}</div>
                          {(dateRange?.start || dateRange?.end) && (
                            <button
                              type="button"
                              onClick={() => { setDateRange({ start: '', end: '' }); setDayFilter('all'); setSelectedMonth(''); }}
                              className="text-[11px] font-extrabold text-[color:var(--app-muted)] hover:text-[color:var(--app-text)]"
                            >
                              {t('clear_range')}
                            </button>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 truncate rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-extrabold text-[color:var(--app-text)]">
                            {dateRange?.start ? formatThaiShortDate(dateRange.start) : t('start_placeholder')}
                          </div>
                          <ChevronRight className="h-4 w-4 shrink-0 text-[color:var(--app-muted-2)]" aria-hidden="true" />
                          <div className="flex-1 truncate rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-xs font-extrabold text-[color:var(--app-text)]">
                            {dateRange?.end ? formatThaiShortDate(dateRange.end) : t('end_placeholder')}
                          </div>
                        </div>

                        <div className="mt-3 hidden grid-cols-2 gap-2 sm:grid">
                          <label className="block">
                            <div className="mb-1 px-1 text-[11px] font-semibold text-[color:var(--app-muted)]">{t('start')}</div>
                            <input
                              type="date"
                              value={dateRange?.start || ''}
                              onChange={(e) => setExplicitRange(e.target.value, dateRange?.end || '')}
                              className="h-11 w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-extrabold text-[color:var(--app-text)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                            />
                          </label>
                          <label className="block">
                            <div className="mb-1 px-1 text-[11px] font-semibold text-[color:var(--app-muted)]">{t('end')}</div>
                            <input
                              type="date"
                              value={dateRange?.end || ''}
                              min={dateRange?.start || undefined}
                              onChange={(e) => setExplicitRange(dateRange?.start || '', e.target.value)}
                              className="h-11 w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 text-sm font-extrabold text-[color:var(--app-text)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                            />
                          </label>
                        </div>

                        {dateRange?.start && !dateRange?.end && (
                          <button
                            type="button"
                            onClick={() => { setExplicitRange(dateRange.start, dateRange.start); setOpenDropdown(null); }}
                            className="mt-2 w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-2.5 text-xs font-extrabold text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]"
                          >
                            {t('use_single_day')}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Calendar */}
                    <div className="px-4 pb-4">
                      <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]"
                            aria-label={t('prev_month')}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <div className="min-w-0 flex-1 text-center">
                            <div className="truncate text-sm font-extrabold text-[color:var(--app-text)]">
                              {calendarMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                            </div>
                            <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">
                              {dateRange?.start && !dateRange?.end ? t('pick_end') : t('pick_start')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]"
                            aria-label={t('next_month')}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-3 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-3">
                          {renderMonth(calendarMonth)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-[color:var(--app-border)] bg-[var(--app-surface)] px-5 py-4 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => { setDateRange({ start: '', end: '' }); setDayFilter('all'); setSelectedMonth(''); }}
                      className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2.5 text-xs font-extrabold text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]"
                    >
                      {t('clear')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenDropdown(null)}
                      className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:brightness-95"
                    >
                      {t('done')}
                    </button>
	                  </div>
	                </div>
	              </div>
		            ), document.body)}
	          </div>
	        </div>
	      )}
    </div>
  );

  if (bootLoading) {
    return (
      <main className="min-h-[100dvh] bg-transparent text-[color:var(--app-text)] flex items-center justify-center p-6">
        <LoadingMascot label={t('loading')} size={88} />
      </main>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-[var(--app-bg)] text-[color:var(--app-text)]">
      <div className="mx-auto w-full max-w-lg lg:max-w-6xl">
        {/* Sticky header */}
          <div className="sticky top-0 z-[40] bg-[var(--app-bg)] backdrop-blur">
            <div className="px-4 lg:px-6 pt-4 pb-3">
              <div className="relative flex items-center justify-between gap-3">
                <div className="w-11 shrink-0" aria-hidden="true" />

              <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-center max-w-[70%]">
                <div className="text-[11px] font-semibold tracking-wide text-[color:var(--app-muted)]">{t('app_subtitle')}</div>
                <h1 className="truncate text-lg font-extrabold text-[color:var(--app-text)]">{t('app_title')}</h1>
              </div>

	              <div className="ml-auto shrink-0 flex items-center gap-2">
	                <ExportButton
	                  onClick={exportToCSV}
	                  className="flex-row gap-2 rounded-2xl !border-emerald-500 !bg-emerald-500 !text-white shadow-sm shadow-black/10 hover:brightness-95 focus-visible:ring-emerald-400/35"
	                />
		              </div>
		            </div>

                {!isDesktop && (
                  <div className="mt-4">
                    {filtersCard}
                  </div>
                )}
        </div>
        </div>

	        <div className="px-4 lg:px-6 py-5">
	            <div className="lg:grid lg:grid-cols-12 lg:gap-6">
	              {isDesktop && (
	                <div className="hidden lg:block lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
	                  {filtersCard}
	                </div>
	              )}
              <div className={isDesktop ? 'lg:col-span-8' : ''}>
                <div className="mb-4 flex flex-col gap-2">
              {!selectMode && (
                <button
                  type="button"
                  onClick={() => { setSelectMode(true); setOpenSwipeId(null); setSelectedTxnIds(new Set()); }}
                  className="inline-flex h-12 w-full items-center justify-between gap-4 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 text-[color:var(--app-text)] shadow-sm shadow-black/10 transition hover:bg-[var(--app-surface-2)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 motion-reduce:transition-none"
                  aria-label={t('select_multiple')}
                  title={t('select_multiple')}
                >
                  <span className="text-sm font-extrabold">{t('select_multiple')}</span>
                  <ListChecks className="h-5 w-5 opacity-80" aria-hidden="true" />
                </button>
              )}
                </div>
	        {/* Error Message */}
	        {error && (
	          <div className="mb-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-200 shadow-sm">
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <p className="text-sm font-semibold">{error}</p>
            </div>
          </div>
        )}

        {/* Transactions List */}
        <div className="overflow-hidden">
	          {loading ? (
	            <div className="space-y-3">
	              {[...Array(6)].map((_, i) => (
	                <div key={i} className="loading rounded-2xl border border-white/10 bg-white/5 shadow-sm">
	                  <div className="flex items-center gap-4 px-4 py-4">
	                    <div className="h-11 w-11 rounded-2xl bg-white/10" />
	                    <div className="min-w-0 flex-1">
	                      <div className="h-3 w-1/3 rounded bg-white/10" />
	                      <div className="mt-2 h-2 w-1/2 rounded bg-white/10" />
	                    </div>
	                    <div className="flex flex-col items-end gap-2">
	                      <div className="h-3 w-20 rounded bg-white/10" />
	                      <div className="h-2 w-12 rounded bg-white/10" />
	                    </div>
	                  </div>
	                </div>
	              ))}
	            </div>
	          ) : groupedTransactions.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10 text-2xl">
                🧾
              </div>
              <p className="text-[color:var(--app-text)] text-lg font-extrabold">{t('no_transactions')}</p>
              <p className="text-slate-400 text-sm font-semibold mt-1">{t('try_adjust_filters')}</p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFilterType('all');
                    setFilterCategory([]);
                    setDayFilter('all');
                    setSelectedMonth('');
                    setDateRange({ start: '', end: '' });
                    setSearchQuery('');
                    setOpenDropdown(null);
                    setOpenSwipeId(null);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-extrabold text-slate-100 shadow-sm hover:bg-white/10"
                >
                  {t('reset_filters')}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {groupedTransactions.map(group => (
                <div key={group.key}>
                  <div className="flex items-center justify-between px-1">
                    <div className="text-base font-extrabold text-[color:var(--app-text)]">{group.dateLabel}</div>
                    <div className={`text-sm font-extrabold ${group.net < 0 ? 'text-slate-400' : group.net > 0 ? 'text-emerald-300' : 'text-slate-400'}`}>
                      {group.net < 0 ? '-' : group.net > 0 ? '+' : ''}฿{formatMoney(Math.abs(group.net))}
                    </div>
                  </div>

	                  <div className="mt-2 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {group.items.map(txn => {
                      const isSelected = selectedTxnIds.has(txn._id);
                      const isOpen = !selectMode && openSwipeId === txn._id;
                      const categoryName = txn.category?.name || t('unspecified');
                      const title = (txn.notes && txn.notes.trim()) ? txn.notes : categoryName;
                      const subtitle = `${formatTimeHHmm(txn.date) || '—'} • ${categoryName}`;
                      const amountSign = txn.type === 'expense' ? '-' : '+';
                      const amountText = `${amountSign}฿${formatMoney(Math.abs(txn.amount || 0))}`;
                      return (
                        <div
                          key={txn._id}
                          className={[
                            'relative overflow-hidden rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-sm',
                            selectMode && isSelected ? 'ring-2 ring-emerald-400/35' : '',
                          ].join(' ')}
                        >
                          <div
                            className={[
                              'absolute inset-y-0 right-0 flex w-40 overflow-hidden',
                              'transition-all duration-300 motion-reduce:transition-none',
                              'ease-[cubic-bezier(0.22,1,0.36,1)]',
                              isOpen ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 translate-x-6 pointer-events-none',
                            ].join(' ')}
                            aria-hidden={!isOpen}
                          >
                            <button
                              type="button"
                              onClick={() => handleEdit(txn)}
                              tabIndex={isOpen ? 0 : -1}
                              disabled={selectMode}
                              className={[
                                'flex-1 bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-950',
                                'font-extrabold text-sm',
                                'inline-flex items-center justify-center gap-2',
                                'border-r border-white/10',
                                'transition-transform duration-200 ease-out active:scale-[0.98]',
                                'focus:outline-none focus:ring-2 focus:ring-emerald-300/40',
                                'motion-reduce:transition-none',
                              ].join(' ')}
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              {t('edit')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(txn._id)}
                              tabIndex={isOpen ? 0 : -1}
                              disabled={selectMode}
                              className={[
                                'flex-1 bg-gradient-to-b from-rose-400 to-rose-500 text-white',
                                'font-extrabold text-sm',
                                'inline-flex items-center justify-center gap-2',
                                'transition-transform duration-200 ease-out active:scale-[0.98]',
                                'focus:outline-none focus:ring-2 focus:ring-rose-300/40',
                                'motion-reduce:transition-none',
                              ].join(' ')}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              {t('delete')}
                            </button>
                          </div>

                          <button
                            type="button"
                            onTouchStart={selectMode ? undefined : (e) => onCardTouchStart(txn._id, e)}
                            onTouchMove={selectMode ? undefined : (e) => onCardTouchMove(txn._id, e)}
                            onTouchEnd={selectMode ? undefined : () => onCardTouchEnd(txn._id)}
                            onClick={() => {
                              if (touchRef.current.moved) return;
                              if (selectMode) { toggleSelectTxn(txn._id); return; }
                              if (isOpen) { setOpenSwipeId(null); return; }
                              handleEdit(txn);
                            }}
                            className={[
                              'relative w-full text-left will-change-transform',
                              'transition-transform duration-300 motion-reduce:transition-none',
                              'ease-[cubic-bezier(0.22,1,0.36,1)]',
                              'active:scale-[0.995]',
                              isOpen ? '-translate-x-40' : 'translate-x-0',
                            ].join(' ')}
                          >
                            <div className="flex items-center gap-4 px-4 py-4">
                              {selectMode && (
                                <div className="shrink-0" aria-hidden="true">
                                  {isSelected ? (
                                    <CheckSquare className="h-6 w-6 text-emerald-300" />
                                  ) : (
                                    <Square className="h-6 w-6 text-slate-500" />
                                  )}
                                </div>
                              )}
                              <div
                                className={[
                                  'h-12 w-12 rounded-full flex items-center justify-center shrink-0 ring-1',
                                  getTxnBadgeClasses(txn),
                                ].join(' ')}
                                aria-hidden="true"
                              >
                                {renderTxnIcon(txn)}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="truncate text-base font-extrabold text-[color:var(--app-text)]">{title}</div>
                                    <div className="mt-1 truncate text-xs font-semibold text-slate-400">{subtitle}</div>
                                  </div>

                                  <div className="shrink-0 text-right">
                                    <div className={`text-base font-extrabold ${txn.type === 'income' ? 'text-emerald-300' : 'text-slate-200'}`}>
                                      {amountText}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

					        <div className={selectMode ? 'h-40' : 'h-24'} />
              </div>
            </div>
          </div>
        </div>

	        {/* Bottom popup actions (multi-select) */}
	        {mounted && selectMode && createPortal((
		          <div className="fixed inset-x-0 bottom-0 z-[95]">
			            <div className="mx-auto w-full max-w-lg lg:max-w-6xl px-0 sm:px-4 lg:px-6">
		              <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-black/30 backdrop-blur">
	                <div className="flex items-center justify-between gap-3 px-4 pt-4">
	                  <div className="text-xs font-semibold text-[color:var(--app-muted)]">
	                    {t('selected_count', { n: selectedCount })}
	                  </div>
	                  <button
	                    type="button"
	                    onClick={exitSelectMode}
	                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                    aria-label={t('cancel')}
	                    title={t('cancel')}
	                  >
	                    <X className="h-5 w-5" aria-hidden="true" />
	                  </button>
	                </div>

		                <div className="grid grid-cols-3 gap-3 p-3 pt-3">
		                  <button
		                    type="button"
		                    onClick={() => setShowBulkCategoryModal(true)}
		                    disabled={selectedCount === 0}
		                    className={[
		                      'rounded-2xl border px-3 py-4 text-sm font-extrabold shadow-sm transition focus:outline-none focus:ring-2 motion-reduce:transition-none',
		                      selectedCount === 0
		                        ? 'border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-muted-2)] opacity-60 cursor-not-allowed'
		                        : 'border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] focus:ring-emerald-400/30',
		                    ].join(' ')}
		                    title={selectedCount === 0 ? t('at_least_one') : t('edit_category')}
		                  >
		                    <span className="inline-flex items-center justify-center gap-2">
		                      <Tag className="h-5 w-5" aria-hidden="true" />
		                      {t('edit_category')}
		                    </span>
	                  </button>

	                  <button
	                    type="button"
	                    onClick={() => setShowBulkDateModal(true)}
	                    disabled={selectedCount === 0}
	                    className={[
	                      'rounded-2xl border px-3 py-4 text-sm font-extrabold shadow-sm transition focus:outline-none focus:ring-2 motion-reduce:transition-none',
	                      selectedCount > 0
	                        ? 'border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] focus:ring-emerald-400/30'
	                        : 'border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-muted-2)] opacity-60 cursor-not-allowed',
	                    ].join(' ')}
	                  >
	                    <span className="inline-flex items-center justify-center gap-2">
	                      <CalendarDays className="h-5 w-5" aria-hidden="true" />
	                      {t('edit_date')}
	                    </span>
	                  </button>

	                  <button
	                    type="button"
	                    onClick={handleBulkDelete}
	                    disabled={selectedCount === 0}
	                    className={[
	                      'rounded-2xl px-3 py-4 text-sm font-extrabold shadow-sm transition focus:outline-none focus:ring-2 motion-reduce:transition-none',
	                      selectedCount === 0
	                        ? 'bg-rose-500/30 text-white/60 cursor-not-allowed'
	                        : 'bg-rose-500 text-white hover:brightness-95 focus:ring-rose-300/30',
	                    ].join(' ')}
	                    title={t('delete_selected_title')}
	                  >
	                    <span className="inline-flex items-center justify-center gap-2">
	                      <Trash2 className="h-5 w-5" aria-hidden="true" />
	                      {t('delete_selected', { n: selectedCount })}
	                    </span>
	                  </button>
	                </div>
	              </div>
	            </div>
	          </div>
	        ), document.body)}

	      {/* Bulk Category Modal */}
	      {mounted && showBulkCategoryModal && createPortal((
	        <div
	          className="fixed inset-0 z-[9999] bg-slate-950/30 backdrop-blur-sm animate-fadeIn flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[env(safe-area-inset-bottom)] sm:pb-0 overflow-hidden overscroll-contain"
          onClick={(e) => e.target === e.currentTarget && setShowBulkCategoryModal(false)}
        >
	          <div className="bg-[var(--app-surface)] w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slideUp border border-[color:var(--app-border)] text-[color:var(--app-text)]">
	            <div className="px-5 pt-5 pb-4">
	              <div className="text-sm font-extrabold">{t('bulk_cat_title', { n: selectedCount })}</div>
	              <div className="mt-1 text-xs font-semibold text-[color:var(--app-muted)]">
	                {t('bulk_cat_hint')}
	              </div>

                {selectionHasMixedTypes ? (
                  <div className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
                    <div className="text-[11px] font-extrabold text-amber-300">{t('warning')}</div>
                    <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-text)]">
                      {t('mixed_types_1')}
                      {' '}
                      <span className="font-extrabold text-[color:var(--app-text)]">
                        {bulkTargetType === 'income' ? t('income') : t('expense')}
                      </span>
                      {' '}
                      {t('mixed_types_2')}
                    </div>
                  </div>
                ) : null}

                  <div className="mt-4 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4 shadow-sm shadow-black/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-extrabold tracking-wide text-[color:var(--app-muted-2)]">{t('target_settings')}</div>
                        <div className="mt-0.5 truncate text-sm font-extrabold text-[color:var(--app-text)]">{t('target_type_cat')}</div>
                      </div>
                      <div className="shrink-0 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-right">
                        <div className="text-[10px] font-extrabold text-[color:var(--app-muted-2)]">{t('applies_to')}</div>
                        <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('n_items', { n: selectedCount })}</div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="text-xs font-bold text-[color:var(--app-muted)]">{t('target_type')}</label>
                      <div className="mt-2 flex rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-1">
                        <button
                          type="button"
                          onClick={() => setBulkTargetType('expense')}
                          className={[
                            'flex-1 px-4 py-2 text-sm font-extrabold rounded-2xl transition focus:outline-none focus:ring-2 focus:ring-emerald-400/25',
                            bulkTargetType === 'expense'
                              ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25'
                              : 'text-slate-300 hover:text-slate-100',
                          ].join(' ')}
                        >
                          {t('expense')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBulkTargetType('income')}
                          className={[
                            'flex-1 px-4 py-2 text-sm font-extrabold rounded-2xl transition focus:outline-none focus:ring-2 focus:ring-emerald-400/25',
                            bulkTargetType === 'income'
                              ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25'
                              : 'text-slate-300 hover:text-slate-100',
                          ].join(' ')}
                        >
                          {t('income')}
                        </button>
                      </div>
                      <div className="mt-2 text-[11px] font-semibold text-[color:var(--app-muted)]">
                        {t('picked')} <span className="font-extrabold text-[color:var(--app-text)]">{bulkTargetType === 'income' ? t('income') : t('expense')}</span>
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="text-xs font-bold text-[color:var(--app-muted)]">{t('target_category')}</label>

                      {(bulkCategories || []).length === 0 ? (
                        <div className="mt-2 rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden="true" />
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-amber-300">
                                {bulkTargetType === 'income' ? t('no_income_cats') : t('no_expense_cats')}
                              </div>
                              <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-text)]">
                                {t('go_add_cats')}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowBulkCategoryModal(false);
                                  window.location.href = '/budget';
                                }}
                                className="mt-3 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-extrabold text-slate-100 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                              >
                                {t('go_budget')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mt-2 relative">
                            <select
                              value={bulkCategoryId}
                              onChange={(e) => setBulkCategoryId(e.target.value)}
                              className="h-12 w-full appearance-none rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 pr-11 text-sm font-semibold text-[color:var(--app-text)] shadow-sm hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                            >
                              {bulkCategories.map((c) => (
                                <option key={c._id} value={c._id}>{c.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--app-muted)]" aria-hidden="true" />
                          </div>
                          <div className="mt-2 text-[11px] font-semibold text-[color:var(--app-muted)]">
                            {t('have_n_cats', { n: bulkCategories.length, typeLabel: bulkTargetType === 'income' ? t('income') : t('expense') })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
		            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4 bg-[var(--app-surface)]">
              <button
                type="button"
                onClick={() => setShowBulkCategoryModal(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-slate-100 hover:bg-white/10"
              >
                {t('cancel')}
              </button>
	              <button
	                type="button"
	                onClick={handleBulkUpdateCategory}
	                disabled={!canBulkSaveCategory}
	                className={[
	                  'rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm',
	                  (!canBulkSaveCategory)
	                    ? 'bg-emerald-500/30 text-slate-950/50 cursor-not-allowed'
	                    : 'bg-emerald-500 text-slate-950 hover:brightness-95',
	                ].join(' ')}
	              >
	                {t('save')}
	              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Bulk Date Modal */}
	      {mounted && showBulkDateModal && createPortal((
	        <div
	          className="fixed inset-0 z-[9999] bg-slate-950/30 backdrop-blur-sm animate-fadeIn flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[env(safe-area-inset-bottom)] sm:pb-0 overflow-hidden overscroll-contain"
	          onClick={(e) => e.target === e.currentTarget && setShowBulkDateModal(false)}
	        >
          <div className="bg-[var(--app-surface)] w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slideUp border border-[color:var(--app-border)] text-[color:var(--app-text)]">
	            <div className="px-5 pt-5 pb-4">
	              <div className="text-sm font-extrabold">{t('bulk_date_title', { n: selectedCount })}</div>
	              <div className="mt-4">
	                <label className="text-xs font-bold text-[color:var(--app-muted)]">{t('date')}</label>
	                <button
	                  type="button"
	                  onClick={openBulkDatePicker}
	                  className="mt-2 w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3 text-left focus:outline-none focus:ring-2 focus:ring-emerald-400/30 hover:bg-[var(--app-surface-3)] transition flex items-center justify-between gap-3"
	                  aria-label={t('open_calendar')}
	                >
	                  <div className="min-w-0">
	                    <div className="text-sm font-extrabold text-[color:var(--app-text)] truncate">
	                      {(() => {
	                        const iso = String(bulkDate || '');
	                        if (!iso) return t('pick_date');
	                        const today = toLocalISODateKey(Date.now());
	                        try {
	                          const d = new Date(`${iso}T00:00:00`);
	                          const label = d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
	                          return iso === today ? `${t('today')}, ${label}` : label;
	                        } catch {
	                          return iso;
	                        }
	                      })()}
	                    </div>
	                    <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted-2)]">{t('tap_open_calendar')}</div>
	                  </div>
	                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/20 shrink-0">
	                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
	                  </div>
	                </button>
	              </div>
	            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4 bg-[var(--app-surface)]">
              <button
                type="button"
                onClick={() => setShowBulkDateModal(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-slate-100 hover:bg-white/10"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleBulkUpdateDate}
                disabled={!bulkDate || selectedCount === 0}
                className={[
                  'rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm',
                  (!bulkDate || selectedCount === 0)
                    ? 'bg-emerald-500/30 text-slate-950/50 cursor-not-allowed'
                    : 'bg-emerald-500 text-slate-950 hover:brightness-95',
                ].join(' ')}
              >
                {t('save')}
              </button>
            </div>
	          </div>
	        </div>
	      ), document.body)}

	      {/* Bulk Date Picker Modal (custom calendar) */}
	      {mounted && showBulkDatePicker && createPortal((
	        <div
	          className="fixed inset-0 z-[10002] bg-slate-950/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+8px)] sm:pb-0"
	          onClick={(e) => e.target === e.currentTarget && setShowBulkDatePicker(false)}
	        >
	          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[var(--app-surface)] shadow-2xl shadow-black/50 overflow-hidden text-slate-100">
	            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-5 py-4">
	              <div>
	                <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('pick_date')}</div>
	                <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('multi_edit_date_hint')}</div>
	              </div>
	              <button
	                type="button"
	                onClick={() => setShowBulkDatePicker(false)}
	                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
	                aria-label={t('close')}
	              >
	                <X className="h-5 w-5" aria-hidden="true" />
	              </button>
	            </div>

	            {(() => {
	              const FUTURE_DAYS_LIMIT = 365;
	              const todayKey = toLocalISODateKey(Date.now());
	              const maxKey = toLocalISODateKey(Date.now() + FUTURE_DAYS_LIMIT * 86400000);
	              const todayParsed = parseISODateKey(todayKey) || { year: new Date().getFullYear(), monthIndex: new Date().getMonth(), day: new Date().getDate() };
	              const maxParsed = parseISODateKey(maxKey) || todayParsed;
	              const selectedParsed = parseISODateKey(bulkDate) || todayParsed;
	              const { year, monthIndex } = bulkDatePickerMonth || selectedParsed;

	              const firstWeekday = new Date(year, monthIndex, 1).getDay();
	              const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
	              const canGoNext = year < maxParsed.year || (year === maxParsed.year && monthIndex < maxParsed.monthIndex);
	              const monthLabel = lang === 'en'
                  ? new Date(year, monthIndex, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
                  : `${MONTH_NAMES_TH[monthIndex] || ''} ${year + 543}`;
	              const weekdayTH = lang === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

	              const isBeyondMax = (d) => {
	                const iso = toISOFromParts(year, monthIndex, d);
	                return iso > maxKey;
	              };

	              const selectDay = (d) => {
	                if (isBeyondMax(d)) return;
	                const iso = toISOFromParts(year, monthIndex, d);
	                setBulkDate(iso);
	                setShowBulkDatePicker(false);
	              };

	              const goPrev = () => {
	                const m = monthIndex - 1;
	                if (m >= 0) setBulkDatePickerMonth({ year, monthIndex: m });
	                else setBulkDatePickerMonth({ year: year - 1, monthIndex: 11 });
	              };

	              const goNext = () => {
	                if (!canGoNext) return;
	                const m = monthIndex + 1;
	                if (m <= 11) setBulkDatePickerMonth({ year, monthIndex: m });
	                else setBulkDatePickerMonth({ year: year + 1, monthIndex: 0 });
	              };

	              const cells = [];
	              for (let i = 0; i < firstWeekday; i++) cells.push(null);
	              for (let d = 1; d <= daysInMonth; d++) cells.push(d);
	              while (cells.length % 7 !== 0) cells.push(null);

	              return (
	                <>
	                  <div className="px-5 pt-4">
	                    <div className="flex items-center justify-between gap-2">
	                      <button
	                        type="button"
	                        onClick={goPrev}
	                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
	                        aria-label={t('prev_month')}
	                      >
	                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
	                      </button>

	                      <div className="min-w-0 flex-1 text-center">
	                        <div className="text-sm font-extrabold text-[color:var(--app-text)]">{monthLabel}</div>
	                        <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">{t('tap_day_to_select')}</div>
	                      </div>

	                      <button
	                        type="button"
	                        onClick={goNext}
	                        disabled={!canGoNext}
	                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 disabled:opacity-40"
	                        aria-label={t('next_month')}
	                      >
	                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
	                      </button>
	                    </div>

	                    <div className="mt-4 grid grid-cols-7 gap-1.5">
	                      {weekdayTH.map((w) => (
	                        <div key={w} className="text-center text-[11px] font-extrabold text-[color:var(--app-muted)]">
	                          {w}
	                        </div>
	                      ))}

	                      {cells.map((d, idx) => {
	                        if (!d) return <div key={`e-${idx}`} className="h-10" />;
	                        const iso = toISOFromParts(year, monthIndex, d);
	                        const selected = iso === String(bulkDate || '');
	                        const today = iso === todayKey;
	                        const disabled = iso > maxKey;
	                        return (
	                          <button
	                            key={iso}
	                            type="button"
	                            onClick={() => selectDay(d)}
	                            disabled={disabled}
	                            className={[
	                              'h-10 rounded-2xl text-sm font-extrabold transition',
	                              'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
	                              disabled
	                                ? 'bg-white/0 text-white/25 cursor-not-allowed'
	                                : selected
	                                  ? 'bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/20'
	                                  : today
	                                    ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25 hover:bg-emerald-500/20'
	                                    : 'bg-white/5 text-slate-100 ring-1 ring-white/10 hover:bg-white/10',
	                            ].join(' ')}
	                            aria-pressed={selected}
	                            aria-label={t('day_select_aria', { d })}
	                          >
	                            {d}
	                          </button>
	                        );
	                      })}
	                    </div>
	                  </div>

	                  <div className="mt-5 border-t border-white/10 bg-white/5 p-3 flex items-center justify-between gap-2">
	                      <button
	                        type="button"
	                        onClick={() => {
	                          setBulkDate(todayKey);
	                          setShowBulkDatePicker(false);
	                        }}
	                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-extrabold text-slate-100 hover:bg-white/10"
	                      >
	                      {t('today')}
	                    </button>
	                    <button
	                      type="button"
	                      onClick={() => setShowBulkDatePicker(false)}
	                      className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:brightness-95"
	                    >
	                      {t('done')}
	                    </button>
	                  </div>
	                </>
	              );
	            })()}
	          </div>
	        </div>
	      ), document.body)}

      {/* Delete Confirm Modal */}
      {mounted && showDeleteConfirmModal && createPortal((
	        <div
	          className="fixed inset-0 z-[10000] bg-slate-950/45 backdrop-blur-sm animate-fadeIn flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[env(safe-area-inset-bottom)] sm:pb-0 overflow-hidden overscroll-contain"
	          onClick={(e) => e.target === e.currentTarget && !deleteLoading && setShowDeleteConfirmModal(false)}
        >
          <div
            className="bg-[var(--app-surface)] w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slideUp border border-[color:var(--app-border)] text-[color:var(--app-text)]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('delete_confirm_aria')}
          >
            <div className="px-5 pt-5 pb-4 border-b border-white/10 bg-[var(--app-surface)]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-extrabold">
                    {t('delete_confirm_title', { n: deleteIds?.length || 0 })}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-[color:var(--app-muted)]">
                    {t('delete_irreversible')}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !deleteLoading && setShowDeleteConfirmModal(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  aria-label={t('close')}
                  title={t('close')}
                  disabled={deleteLoading}
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              {deleteError ? (
                <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                  {deleteError}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 bg-[var(--app-surface)]">
              <button
                type="button"
                onClick={() => setShowDeleteConfirmModal(false)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-slate-100 hover:bg-white/10"
                disabled={deleteLoading}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-2xl bg-rose-500 px-4 py-3 text-sm font-extrabold text-white hover:brightness-95 disabled:opacity-60"
                disabled={deleteLoading || (deleteIds?.length || 0) === 0}
              >
                {deleteLoading ? t('deleting') : t('delete')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Edit Modal */}
      {mounted && showEditModal && editingTransaction && createPortal((
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/30 backdrop-blur-sm animate-fadeIn flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[env(safe-area-inset-bottom)] sm:pb-0 overflow-hidden overscroll-contain"
          onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div
            className="bg-[var(--app-surface)] w-full sm:max-w-sm sm:rounded-3xl rounded-t-3xl overflow-hidden animate-slideUp border border-[color:var(--app-border)] text-[color:var(--app-text)] flex flex-col max-h-[92dvh] sm:max-h-[88dvh] sm:-translate-y-4"
            role="dialog"
            aria-modal="true"
          >
            <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-500 to-green-500 text-slate-950 px-5 sm:px-6 pb-4 sm:pb-6 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-[calc(env(safe-area-inset-top)+24px)] overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <svg className="w-6 h-6 sm:w-7 sm:h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">{t('edit_txn_title')}</h2>
                    <p className="text-slate-950/70 text-xs sm:text-sm font-semibold">{t('edit_txn_subtitle')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="p-2 sm:p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:rotate-90"
                  aria-label={t('close')}
                  title={t('close')}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

	            <form onSubmit={handleUpdateSubmit} className="flex-1 p-4 sm:p-6 pb-[calc(env(safe-area-inset-bottom)+16px)] sm:pb-6 space-y-4 sm:space-y-5 overflow-y-auto">
              {error && (
                <div className="p-4 bg-rose-500/10 border border-rose-400/20 rounded-xl flex items-start gap-3">
                  <svg className="w-5 h-5 text-rose-200 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-rose-200 font-semibold text-sm">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">{t('type')}</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditFormData(prev => ({
                      ...prev,
                      type: 'income',
                      category: categories.find(cat => cat.type === 'income')?._id || prev.category
                    }))}
                    className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                      editFormData.type === 'income'
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {t('income')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData(prev => ({
                      ...prev,
                      type: 'expense',
                      category: categories.find(cat => cat.type === 'expense')?._id || prev.category
                    }))}
                    className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                      editFormData.type === 'expense'
                        ? 'bg-rose-500/15 border-rose-400/40 text-rose-200'
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {t('expense')}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">{t('amount')}</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-3 border border-white/10 bg-white/5 rounded-xl text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 outline-none transition-all"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--app-muted-2)] font-semibold">฿</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">{t('category')}</label>
                <div ref={editCategoryRootRef} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setEditCategoryOpen((v) => !v);
                      try { recomputeEditCategoryPanel(); } catch {}
                    }}
                    ref={editCategoryButtonRef}
                    className={[
                      'w-full rounded-xl border px-4 py-3 text-left transition-all outline-none',
                      'border-[color:var(--app-border)] bg-[var(--app-surface)] text-[color:var(--app-text)]',
                      'hover:bg-[var(--app-surface-3)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20',
                    ].join(' ')}
                    aria-haspopup="listbox"
                    aria-expanded={editCategoryOpen}
                    aria-label={t('select_category_placeholder')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--app-surface-2)] ring-1 ring-[color:var(--app-border)] shrink-0">
                          <div className="scale-[0.9]">
                            <CategoryIcon iconName={editCategorySelected?.icon || 'other'} className="w-5 h-5 text-[color:var(--app-muted)]" />
                          </div>
                        </div>
                        <div className={editFormData.category ? 'min-w-0 text-sm font-extrabold truncate' : 'min-w-0 text-sm font-extrabold text-[color:var(--app-muted)] truncate'}>
                          {editFormData.category ? (editCategorySelected?.name || t('unspecified')) : t('select_category_placeholder')}
                        </div>
                      </div>
                      <ChevronDown className={['h-4 w-4 shrink-0 transition', editCategoryOpen ? 'rotate-180' : '', 'text-[color:var(--app-muted)]'].join(' ')} aria-hidden="true" />
                    </div>
                  </button>
                </div>

                {mounted && editCategoryOpen && createPortal((
                  <div
                    ref={editCategoryPanelRef}
                    role="listbox"
                    aria-label={t('category')}
                    className="fixed z-[10050] overflow-hidden rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-black/20"
                    style={{
                      left: `${Number(editCategoryPanelStyle?.left ?? 12)}px`,
                      top: `${Number(editCategoryPanelStyle?.top ?? 12)}px`,
                      width: `${Number(editCategoryPanelStyle?.width ?? 280)}px`,
                      transform: String(editCategoryPanelStyle?.transform || 'translateY(0)'),
                    }}
                  >
                    <div className="overflow-auto p-1 overscroll-contain" style={{ maxHeight: `${editCategoryMaxH}px` }}>
                      {(editCategoryOptions || []).length === 0 ? (
                        <div className="px-4 py-3 text-sm font-semibold text-[color:var(--app-muted)]">
                          {t('no_categories_yet')}
                        </div>
                      ) : (
                        editCategoryOptions.map((cat) => {
                          const selected = String(editFormData.category || '') === String(cat?._id || '');
                          return (
                            <button
                              key={cat._id}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              onClick={() => {
                                setEditFormData((prev) => ({ ...prev, category: cat._id }));
                                setEditCategoryOpen(false);
                              }}
                              className={[
                                'w-full rounded-2xl px-3 py-2.5 text-left transition flex items-center justify-between gap-3',
                                selected ? 'bg-emerald-500/12 ring-1 ring-emerald-400/20' : 'hover:bg-[var(--app-surface-2)]',
                                'text-[color:var(--app-text)]',
                              ].join(' ')}
                            >
                              <span className="min-w-0 inline-flex items-center gap-3">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-[var(--app-surface-2)] ring-1 ring-[color:var(--app-border)] shrink-0">
                                  <span className="scale-[0.9]">
                                    <CategoryIcon iconName={cat.icon || 'other'} className="w-5 h-5 text-[color:var(--app-muted)]" />
                                  </span>
                                </span>
                                <span className="min-w-0 truncate text-sm font-extrabold">{cat.name}</span>
                              </span>
                              {selected ? <span className="text-emerald-500 font-extrabold">✓</span> : null}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ), document.body)}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-200 mb-2">{t('date')}</label>
                <button
                  type="button"
                  onClick={openEditDatePicker}
                  className="w-full px-4 py-3 border border-white/10 bg-white/5 rounded-xl text-slate-100 hover:bg-white/10 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 outline-none transition-all flex items-center justify-between gap-3"
                  aria-label={t('open_calendar')}
                >
                  <div className="text-left min-w-0">
                    <div className="text-sm font-extrabold text-slate-100 truncate">
                      {(() => {
                        const iso = String(editFormData.date || '');
                        if (!iso) return t('pick_date');
                        try {
                          const d = new Date(`${iso}T00:00:00`);
                          return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
                        } catch {
                          return iso;
                        }
                      })()}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted-2)]">{t('tap_open_calendar')}</div>
                  </div>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/20 shrink-0">
                    <CalendarDays className="h-5 w-5" aria-hidden="true" />
                  </div>
                </button>
              </div>

	              <div>
	                <label className="block text-sm font-semibold text-slate-200 mb-2">{t('notes')}</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  className="w-full px-4 py-3 border border-white/10 bg-white/5 rounded-xl text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 outline-none transition-all resize-none"
                  placeholder={t('notes_placeholder')}
	                />
	              </div>

                <button
                  type="button"
                  onClick={() => handleDelete(editingTransaction._id)}
                  className="w-full rounded-xl border border-rose-400/20 bg-rose-500/10 px-6 py-3 text-rose-200 font-extrabold hover:bg-rose-500/15 transition-colors"
                >
                  {t('delete_this')}
                </button>

	              <div className="flex gap-3 pt-2">
	                <button
	                  type="button"
	                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-3 border border-white/10 bg-white/5 text-slate-100 font-semibold rounded-xl hover:bg-white/10 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-slate-950 font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {/* Edit Date Picker Modal (custom calendar) */}
      {mounted && showEditDatePicker && createPortal((
        <div
          className="fixed inset-0 z-[10001] bg-slate-950/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+8px)] sm:pb-0"
          onClick={(e) => e.target === e.currentTarget && setShowEditDatePicker(false)}
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-white/10 bg-[var(--app-surface)] shadow-2xl shadow-black/50 overflow-hidden text-slate-100">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-5 py-4">
              <div>
                <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('pick_date')}</div>
                <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('single_edit_date_hint')}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditDatePicker(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                aria-label={t('close')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {(() => {
              const FUTURE_DAYS_LIMIT = 365;
              const todayKey = toLocalISODateKey(Date.now());
              const maxKey = toLocalISODateKey(Date.now() + FUTURE_DAYS_LIMIT * 86400000);
              const todayParsed = parseISODateKey(todayKey) || { year: new Date().getFullYear(), monthIndex: new Date().getMonth(), day: new Date().getDate() };
              const maxParsed = parseISODateKey(maxKey) || todayParsed;
              const selectedParsed = parseISODateKey(editFormData?.date) || todayParsed;
              const { year, monthIndex } = editDatePickerMonth || selectedParsed;

              const firstWeekday = new Date(year, monthIndex, 1).getDay();
              const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
              const canGoNext = year < maxParsed.year || (year === maxParsed.year && monthIndex < maxParsed.monthIndex);
              const monthLabel = lang === 'en'
                ? new Date(year, monthIndex, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
                : `${MONTH_NAMES_TH[monthIndex] || ''} ${year + 543}`;
              const weekdayTH = lang === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

              const isBeyondMax = (d) => {
                const iso = toISOFromParts(year, monthIndex, d);
                return iso > maxKey;
              };

              const selectDay = (d) => {
                if (isBeyondMax(d)) return;
                const iso = toISOFromParts(year, monthIndex, d);
                setEditFormData((prev) => ({ ...prev, date: iso }));
                setShowEditDatePicker(false);
              };

              const goPrev = () => {
                const m = monthIndex - 1;
                if (m >= 0) setEditDatePickerMonth({ year, monthIndex: m });
                else setEditDatePickerMonth({ year: year - 1, monthIndex: 11 });
              };

              const goNext = () => {
                if (!canGoNext) return;
                const m = monthIndex + 1;
                if (m <= 11) setEditDatePickerMonth({ year, monthIndex: m });
                else setEditDatePickerMonth({ year: year + 1, monthIndex: 0 });
              };

              const cells = [];
              for (let i = 0; i < firstWeekday; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);
              while (cells.length % 7 !== 0) cells.push(null);

              return (
                <>
                  <div className="px-5 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={goPrev}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                        aria-label={t('prev_month')}
                      >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>

                      <div className="min-w-0 flex-1 text-center">
                        <div className="text-sm font-extrabold text-[color:var(--app-text)]">{monthLabel}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">{t('tap_day_to_select')}</div>
                      </div>

                      <button
                        type="button"
                        onClick={goNext}
                        disabled={!canGoNext}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 disabled:opacity-40"
                        aria-label={t('next_month')}
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-4 grid grid-cols-7 gap-1.5">
                      {weekdayTH.map((w) => (
                        <div key={w} className="text-center text-[11px] font-extrabold text-[color:var(--app-muted)]">
                          {w}
                        </div>
                      ))}

                      {cells.map((d, idx) => {
                        if (!d) return <div key={`e-${idx}`} className="h-10" />;
                        const iso = toISOFromParts(year, monthIndex, d);
                        const selected = iso === String(editFormData?.date || '');
                        const today = iso === todayKey;
                        const disabled = iso > maxKey;
                        return (
                          <button
                            key={iso}
                            type="button"
                            onClick={() => selectDay(d)}
                            disabled={disabled}
                            className={[
                              'h-10 rounded-2xl text-sm font-extrabold transition',
                              'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
                              disabled
                                ? 'bg-white/0 text-white/25 cursor-not-allowed'
                                : selected
                                  ? 'bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/20'
                                  : today
                                    ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25 hover:bg-emerald-500/20'
                                    : 'bg-white/5 text-slate-100 ring-1 ring-white/10 hover:bg-white/10',
                            ].join(' ')}
                            aria-pressed={selected}
                            aria-label={t('day_select_aria', { d })}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 bg-white/5 p-3 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditFormData((prev) => ({ ...prev, date: todayKey }));
                        setShowEditDatePicker(false);
                      }}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-extrabold text-slate-100 hover:bg-white/10"
                    >
                      {t('today')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditDatePicker(false)}
                      className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:brightness-95"
                    >
                      {t('done')}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ), document.body)}
    </main>
  );
}
