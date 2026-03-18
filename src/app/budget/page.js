"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useBalanzLanguage } from '@/lib/useBalanzLanguage';
import { formatI18n } from '@/lib/i18n';
import {
  Utensils,
  Coffee,
  ShoppingBag,
  Car,
  Home,
  Zap,
  Heart,
  Gamepad2,
  Stethoscope,
  GraduationCap,
  Gift,
  Smartphone,
  CreditCard,
  Landmark,
  Briefcase,
  PawPrint,
  Music,
  Dumbbell,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
  GripVertical,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

// Utility for formatting currency
const getUiLocaleFromStorage = () => {
  try {
    const lang = localStorage.getItem('balanz_lang');
    return lang === 'en' ? 'en-US' : 'th-TH';
  } catch {
    return 'th-TH';
  }
};

const formatCurrency = (amount) => {
  const locale = typeof window === 'undefined' ? 'th-TH' : getUiLocaleFromStorage();
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);
};

// Use same-origin requests in the browser and rely on Next.js `rewrites()` to reach the backend.
const API_BASE = '';

const monthNamesTH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const monthShortTH = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
];

const monthNamesEN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const monthShortEN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const monthLabelFromDate = (dateInput) => {
  try {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '';
    return `${monthNamesTH[d.getMonth()]} ${d.getFullYear() + 543}`;
  } catch {
    return '';
  }
};

const getDaysInMonth = (year, monthIndex) => {
  const d = new Date(year, monthIndex + 1, 0);
  const n = d.getDate();
  return Number.isFinite(n) && n > 0 ? n : 30;
};

// Cutoff day: if > 0, any txn after cutoffDay counts into "next month" label.
// Example: cutoffDay=25, 26 Mar => belongs to "เมษายน ...."
const monthLabelFromDateWithCutoff = (dateInput, cutoffDay) => {
  const n = Number(cutoffDay) || 0;
  if (!Number.isFinite(n) || n <= 0) return monthLabelFromDate(dateInput);
  try {
    const d = new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '';
    let y = d.getFullYear();
    let m = d.getMonth();
    const effectiveCutoff = Math.min(Math.max(1, Math.round(n)), getDaysInMonth(y, m));
    if (d.getDate() > effectiveCutoff) {
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
    return `${monthNamesTH[m]} ${y + 543}`;
  } catch {
    return monthLabelFromDate(dateInput);
  }
};

const cycleRangeForMonthLabel = (selectedMonthLabel, cutoffDay) => {
  const parsed = parseThaiMonthLabel(selectedMonthLabel);
  if (!parsed) return null;
  const { year, monthIndex } = parsed;
  const cutoff = Number(cutoffDay) || 0;
  if (!Number.isFinite(cutoff) || cutoff <= 0) {
    const start = new Date(year, monthIndex, 1);
    const end = new Date(year, monthIndex + 1, 0);
    return { start, end };
  }

  const endDay = Math.min(Math.max(1, Math.round(cutoff)), getDaysInMonth(year, monthIndex));
  const end = new Date(year, monthIndex, endDay);
  const prev = new Date(year, monthIndex - 1, 1);
  const prevY = prev.getFullYear();
  const prevM = prev.getMonth();
  const prevEndDay = Math.min(Math.max(1, Math.round(cutoff)), getDaysInMonth(prevY, prevM));
  const start = new Date(prevY, prevM, prevEndDay + 1);
  return { start, end };
};

const formatThaiDateShort = (dateInput) => {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (Number.isNaN(d.getTime())) return '';
    const locale = typeof window === 'undefined' ? 'th-TH' : getUiLocaleFromStorage();
    return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const clamp01 = (n) => Math.max(0, Math.min(1, n));

const monthIndexFromThaiName = (thaiMonth) => {
  if (!thaiMonth) return -1;
  return monthNamesTH.findIndex((m) => m === thaiMonth);
};

const parseThaiMonthLabel = (label) => {
  // Expected: "มกราคม 2569" (Buddhist year)
  if (!label || typeof label !== 'string') return null;
  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const monthIdx = monthIndexFromThaiName(parts[0]);
  const buddhistYear = Number(parts[1]);
  if (monthIdx < 0 || !Number.isFinite(buddhistYear)) return null;
  return { monthIndex: monthIdx, year: buddhistYear - 543 };
};

const pad2 = (n) => String(n).padStart(2, '0');

const dateStringForSelectedMonth = (selectedMonthLabel) => {
  const parsed = parseThaiMonthLabel(selectedMonthLabel);
  const now = new Date();
  if (!parsed) {
    return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  }
  const { year, monthIndex } = parsed;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const day = Math.min(Math.max(1, now.getDate()), Math.max(1, daysInMonth || 1));
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
};

const dateStringForSelectedMonthWithCutoff = (selectedMonthLabel, cutoffDay) => {
  const cutoff = Number(cutoffDay) || 0;
  const now = new Date();
  const todayIso = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
  if (!Number.isFinite(cutoff) || cutoff <= 0) return dateStringForSelectedMonth(selectedMonthLabel) || todayIso;

  const todayLabel = monthLabelFromDateWithCutoff(todayIso, cutoff);
  if (todayLabel && todayLabel === selectedMonthLabel) return todayIso;

  const parsed = parseThaiMonthLabel(selectedMonthLabel);
  if (!parsed) return todayIso;
  const { year, monthIndex } = parsed;
  const effectiveCutoff = Math.min(Math.max(1, Math.round(cutoff)), getDaysInMonth(year, monthIndex));
  return `${year}-${pad2(monthIndex + 1)}-${pad2(effectiveCutoff)}`;
};

const buildSmoothSvgPath = (points) => {
  if (!Array.isArray(points) || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 2; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    d += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }
  const penultimate = points[points.length - 2];
  const last = points[points.length - 1];
  d += ` Q ${penultimate.x} ${penultimate.y} ${last.x} ${last.y}`;
  return d;
};

const ICON_MAP = {
  food: Utensils,
  drink: Coffee,
  shopping: ShoppingBag,
  transport: Car,
  home: Home,
  bills: Zap,
  health: Stethoscope,
  education: GraduationCap,
  tech: Smartphone,
  pet: PawPrint,
  game: Gamepad2,
  music: Music,
  sport: Dumbbell,
  gift: Gift,
  salary: CreditCard,
  money: Landmark,
  work: Briefcase,
  love: Heart,
  other: MoreHorizontal,
};

const CategoryIcon = ({ iconKey, className = 'w-6 h-6' }) => {
  const IconComp = ICON_MAP[iconKey];
  if (IconComp) return <IconComp className={className} aria-hidden="true" />;
  if (typeof iconKey === 'string' && iconKey.trim()) {
    return <span className="text-xl leading-none" aria-hidden="true">{iconKey}</span>;
  }
  return <MoreHorizontal className={className} aria-hidden="true" />;
};

const normalizeCategoryName = (name) => String(name || '').trim().replace(/\s+/g, '');
const isReservedOtherCategoryName = (name) => {
  const n = normalizeCategoryName(name);
  if (!n) return false;
  if (n === 'อื่นๆ') return true;
  if (n.toLowerCase() === 'other') return true;
  return false;
};

const POPULAR_CATEGORY_PRESETS = {
  th: {
    expense: [
      { name: 'อาหาร', icon: 'food' },
      { name: 'กาแฟ', icon: 'drink' },
      { name: 'เดินทาง', icon: 'transport' },
      { name: 'ช้อปปิ้ง', icon: 'shopping' },
      { name: 'ผ่อนรถ', icon: 'transport' },
      { name: 'ค่าสมาชิก/ซับสคริปชัน', icon: 'other' },
      { name: 'ผ่อนบ้าน', icon: 'home' },
      { name: 'อินเตอร์เน็ต', icon: 'tech' },
    ],
    income: [
      { name: 'เงินเดือน', icon: 'salary' },
      { name: 'โบนัส', icon: 'gift' },
      { name: 'รายได้เสริม', icon: 'work' },
      { name: 'ลงทุน', icon: 'money' },
      { name: 'คืนเงิน', icon: 'money' },
    ],
  },
  en: {
    expense: [
      { name: 'Food', icon: 'food' },
      { name: 'Coffee', icon: 'drink' },
      { name: 'Transport', icon: 'transport' },
      { name: 'Shopping', icon: 'shopping' },
      { name: 'Car payment', icon: 'transport' },
      { name: 'Subscriptions', icon: 'other' },
      { name: 'Mortgage/Rent', icon: 'home' },
      { name: 'Internet', icon: 'tech' },
    ],
    income: [
      { name: 'Salary', icon: 'salary' },
      { name: 'Bonus', icon: 'gift' },
      { name: 'Side income', icon: 'work' },
      { name: 'Investments', icon: 'money' },
      { name: 'Refund', icon: 'money' },
    ],
  },
};

const I18N = {
  th: {
    type_expense: 'รายจ่าย',
    type_income: 'รายรับ',

    title_expense_prefix: 'งบประมาณ{type}',
    title_expense_main: 'งบที่ตั้งไว้',
    title_income_main: 'รายรับเดือนนี้',

    month: 'เดือน',
    year_be: 'พ.ศ.',
    month_prev: 'เดือนก่อนหน้า',
    month_next: 'เดือนถัดไป',
    open_month_picker: 'เปิดปฏิทินเลือกเดือน',
    tap_to_pick_month: 'แตะเพื่อเลือกเดือน',
    pick_month: 'เลือกเดือน',
    month_picker_hint: 'แตะเพื่อดูรายการของเดือนนั้น',
    prev_year: 'ปีก่อนหน้า',
    next_year: 'ปีถัดไป',
    this_month: 'เดือนนี้',
    done: 'เสร็จสิ้น',
    close: 'ปิด',

    cycle: 'ตัดรอบ',
    cycle_calendar: 'ตามเดือนปฏิทิน',
    cycle_every_day: 'ทุกวันที่ {day}',
    cycle_range: 'รอบนี้: {start} – {end}',
    settings: 'ตั้งค่า',

    summary_income_received: 'รายรับเข้าแล้ว',
    summary_income_total: 'รายรับรวมเดือนนี้',
    summary_received_pct: 'ได้แล้ว {pct}%',
    summary_remaining: 'เหลือ {amount}',
    summary_over: 'เกิน {amount}',
    summary_income_categories: 'หมวดรายรับ {count} หมวด',

    summary_remaining_from_income: 'คงเหลือจากรายรับ',
    summary_remaining_total_budget: 'งบที่เหลือทั้งหมด',
    summary_spent_pct: 'ใช้ไปแล้ว {pct}%',
    summary_left: 'เหลือ {amount}',
    source_income_actual: 'รายรับเดือนนี้',
    source_income_budget: 'รายรับที่ตั้งไว้เดือนนี้',
    source_expense_budget: 'งบทั้งหมด',
    expense_budget_total_label: 'งบรายจ่ายรวมเดือนนี้',
    summary_from_source: 'จาก{source} {amount}',

    sort_custom: 'เรียงเอง',
    sort_name_asc: 'ชื่อ A - Z',
    sort_name_desc: 'ชื่อ Z - A',
    sort_budget_asc_expense: 'งบน้อย → มาก',
    sort_budget_desc_expense: 'งบมาก → น้อย',
    sort_spent_desc: 'ใช้มาก → น้อย',
    sort_remaining_desc: 'คงเหลือมาก → น้อย',
    sort_received_asc: 'รับน้อย → มาก',
    sort_received_desc: 'รับมาก → น้อย',
    custom_reorder_aria: 'เรียงเอง (จัดลำดับหมวดหมู่)',
    custom_reorder_title: 'เรียงเอง (จัดลำดับ)',

    search_placeholder: 'ค้นหาหมวดหมู่…',
    clear_search: 'ล้างคำค้นหา',
    filter_all: 'ทั้งหมด',
    filter_budgeted: 'ตั้งงบแล้ว',
    filter_unbudgeted: 'ยังไม่ตั้งงบ',
    filter_over: 'เกินงบ',
    budgeted_count: 'ตั้งงบแล้ว {count} หมวด',
    no_budgeted_yet: 'ยังไม่มีหมวดที่ตั้งงบ',
    income_tip: 'แตะที่การ์ดหมวดรายรับเพื่อ “ตั้งเป้ารายรับ” และดูความคืบหน้าแบบเดียวกับรายจ่าย',
    income_target_section: 'มีเป้ารายรับ',
    income_no_target_section: 'ยังไม่มีเป้า',
    section_near_full: 'ใกล้เต็ม',

    edit: 'แก้ไข',
    status_has_target: 'มีเป้า',
    status_no_target: 'ยังไม่มีเป้า',
    status_over_budget: 'เกินงบ',
    status_no_budget: 'ยังไม่ตั้งงบ',
    status_near_full: 'ใกล้เต็ม',
    income_card_with_target: 'เป้า {target} • รับแล้ว {actual}',
    income_card_no_target: 'รับแล้ว {actual}',
    expense_card_left: 'เหลือ {amount}',
    category_count: '{count} หมวด',

    empty_title: 'ยังไม่มีหมวด{type}',
    empty_desc: 'กดปุ่ม “เพิ่มหมวด” เพื่อเพิ่มหมวดใหม่',
    add_category: 'เพิ่มหมวด{type}',
    add_category_short: 'เพิ่มหมวด',
    tap_to_add_category: 'แตะเพื่อเพิ่มหมวดใหม่',
    no_match_title: 'ไม่พบหมวดที่ตรงกับตัวกรอง',
    no_match_desc: 'ลองค้นหาใหม่ หรือกดล้างตัวกรอง',
    clear_filters: 'ล้างตัวกรอง',

    add_modal_title: 'เพิ่มหมวด{type}',
    create_new_category: 'สร้างหมวดใหม่',
    add_modal_desc: 'ตั้งชื่อหมวด และเลือกไอคอน',
    category_name_label: 'ตั้งชื่อหมวด{type}',
    placeholder_expense: 'เช่น ค่าอาหารกลางวัน',
    placeholder_income: 'เช่น เงินเดือน',
    name_hint: 'พิมพ์ชื่อหมวด หรือเลือกจากตัวอย่างด้านล่าง',
    income_optional_title: 'ใส่รายรับเข้าหมวดนี้เลย (ไม่บังคับ)',
    income_optional_desc: 'ถ้าใส่จำนวนเงิน ระบบจะสร้างรายการรายรับให้ทันทีในเดือนที่เลือก',
    amount: 'จำนวนเงิน',
    amount_value: 'ยอดเงิน:',
    popular_presets: 'ตัวอย่างยอดฮิต',
    presets_desc: 'กดเพื่อเลือกชื่อหมวด + ไอคอนอัตโนมัติ',
    tap_to_select: 'แตะเพื่อเลือก',
    choose_icon: 'เลือกไอคอน',
    select_icon_aria: 'เลือกไอคอน {icon}',
    selected: 'เลือกแล้ว:',
    not_selected: 'ยังไม่ได้เลือก',
    clear: 'ล้าง',
    custom_icon: 'ไอคอน (กำหนดเอง)',
    custom_icon_placeholder: 'พิมพ์คีย์ไอคอน (เช่น food, shopping) หรือใส่ Emoji ก็ได้',
    example_prefix: 'เช่น',
    next: 'ต่อไป',
    saving: 'กำลังบันทึก...',

    edit_modal_title: 'แก้ไขหมวด{type}',
    edit_modal_fallback: 'แก้ไขหมวด',
    edit_modal_desc: 'เปลี่ยนชื่อ หรือไอคอน',

    add_income_title: 'เพิ่มรายรับเข้าหมวดนี้',
    add_income_desc: 'บันทึกยอดเพิ่มเข้าไป ระบบจะบวกสะสมให้ในเดือน {month}',
    received: 'รับแล้ว',
    progress_target: 'ความคืบหน้าเป้ารายรับ',
    no_target: 'ยังไม่ได้ตั้งเป้ารายรับ',
    target: 'เป้า',
    remaining_to_target: 'เหลือถึงเป้า',
    over_target: 'เกินเป้า',
    tip_set_target: 'ทิป: แตะที่การ์ดหมวดรายรับ เพื่อ “ตั้งเป้ารายรับ” แล้วจะเห็นเปอร์เซ็นต์เหมือนรายจ่าย',
    add_more: 'เพิ่มอีก',
    to_add: 'ยอดที่จะเพิ่ม',
    new_total: 'รวมใหม่',
    note_optional: 'หมายเหตุ (ไม่บังคับ)',
    add_income: 'เพิ่มรายรับ',
    adding: 'กำลังเพิ่ม...',

    cancel: 'ยกเลิก',
    save: 'บันทึก',
    delete_this_category: 'ลบหมวดนี้',

    delete_category: 'ลบหมวดหมู่',
    warning: 'คำเตือน',
    delete_irreversible: 'การลบหมวดหมู่ไม่สามารถย้อนกลับได้',
    delete_btn: 'ลบหมวด',
    deleting: 'กำลังลบ...',

    set_income_target: 'ตั้งเป้ารายรับ',
    set_budget: 'ตั้งงบ',
    adjust_income_target_desc: 'ปรับเป้าหมายสำหรับหมวดนี้',
    adjust_budget_desc: 'ปรับวงเงินสำหรับหมวดนี้',
    spent: 'ใช้ไป',
    remaining: 'คงเหลือ',
    desired_target_input: 'เป้ารายรับที่ต้องการ (บาท)',
    desired_budget_input: 'วงเงินที่ต้องการ (บาท)',

    settings_title: 'ตั้งค่า',
    settings_budget: 'ตั้งค่างบประมาณ',
    month_to_set_budget: 'เดือนที่ต้องการตั้งงบ',
    choose_month_hint: 'เลือกเดือนจากรายการด้านบน หรือใช้ปุ่มเลื่อนเดือน',
    cycle_desc: 'รายการหลังวันตัดรอบจะถูกนับเป็นเดือนถัดไป',
    mode: 'โหมด',
    calendar_mode: 'ตามปฏิทิน',
    set_cutoff: 'กำหนดวันตัดรอบ',
    cutoff_day: 'วันตัดรอบ',
    day_number: 'วันที่ {day}',
    select_cutoff_day: 'เลือกวันตัดรอบ',
    cycle_for_month: 'รอบของ {month}: {start} – {end}',

    reorder_title: 'จัดเรียงหมวด{type}',
    reorder_desc: 'ลากเพื่อเรียงลำดับ หรือกดขึ้น/ลง',
    order_number: 'ลำดับที่ {n}',
    reset_by_name: 'รีเซ็ตตามชื่อ',
    category_item_aria: 'หมวด {name}',
    move_up: 'เลื่อนขึ้น',
    move_down: 'เลื่อนลง',
    up: 'ขึ้น',
    down: 'ลง',
    no_reorder_items: 'ยังไม่มีหมวดให้จัดเรียง',

    toast_title: 'แจ้งเตือน',
    close_toast: 'ปิดแจ้งเตือน',

    login_required: 'กรุณาเข้าสู่ระบบ',
    enter_category_name: 'กรุณาระบุชื่อหมวดหมู่',
    enter_valid_amount: 'กรุณาใส่จำนวนเงินที่ถูกต้อง',
    category_updated: 'แก้ไขหมวดเรียบร้อยแล้ว',
    category_update_failed: 'ไม่สามารถแก้ไขหมวดได้: {detail}',
    income_added: 'เพิ่มรายรับเรียบร้อยแล้ว',
    income_add_failed: 'เพิ่มรายรับไม่สำเร็จ: {detail}',
    category_deleted: 'ลบหมวดเรียบร้อยแล้ว',
    category_delete_failed: 'ไม่สามารถลบหมวดได้: {detail}',
    budget_saved: 'บันทึกงบประมาณแล้ว',
    budget_save_failed: 'ไม่สามารถบันทึกงบได้: {detail}',
    reorder_saved: 'บันทึกลำดับหมวดหมู่แล้ว',
    category_created: 'สร้างหมวดเรียบร้อยแล้ว',
    category_create_failed: 'ไม่สามารถสร้างหมวดได้: {detail}',
  },
  en: {
    type_expense: 'Expenses',
    type_income: 'Income',

    title_expense_prefix: '{type} budget',
    title_expense_main: 'Budget',
    title_income_main: 'Income this month',

    month: 'Month',
    year_be: 'Year',
    month_prev: 'Previous month',
    month_next: 'Next month',
    open_month_picker: 'Open month picker',
    tap_to_pick_month: 'Tap to select month',
    pick_month: 'Select month',
    month_picker_hint: 'Tap to view that month',
    prev_year: 'Previous year',
    next_year: 'Next year',
    this_month: 'This month',
    done: 'Done',
    close: 'Close',

    cycle: 'Cycle',
    cycle_calendar: 'Calendar month',
    cycle_every_day: 'Every {day}',
    cycle_range: 'This cycle: {start} – {end}',
    settings: 'Settings',

    summary_income_received: 'Income received',
    summary_income_total: 'Total income this month',
    summary_received_pct: '{pct}% received',
    summary_remaining: '{amount} remaining',
    summary_over: '{amount} over',
    summary_income_categories: '{count} income categories',

    summary_remaining_from_income: 'Remaining from income',
    summary_remaining_total_budget: 'Total remaining budget',
    summary_spent_pct: '{pct}% spent',
    summary_left: '{amount} left',
    source_income_actual: 'income this month',
    source_income_budget: 'planned income this month',
    source_expense_budget: 'total budget',
    expense_budget_total_label: 'Total expense budget this month',
    summary_from_source: 'From {source} {amount}',

    sort_custom: 'Custom',
    sort_name_asc: 'Name A–Z',
    sort_name_desc: 'Name Z–A',
    sort_budget_asc_expense: 'Budget low → high',
    sort_budget_desc_expense: 'Budget high → low',
    sort_spent_desc: 'Spent high → low',
    sort_remaining_desc: 'Remaining high → low',
    sort_received_asc: 'Received low → high',
    sort_received_desc: 'Received high → low',
    custom_reorder_aria: 'Custom order (reorder categories)',
    custom_reorder_title: 'Custom order',

    search_placeholder: 'Search categories…',
    clear_search: 'Clear search',
    filter_all: 'All',
    filter_budgeted: 'Budgeted',
    filter_unbudgeted: 'No budget',
    filter_over: 'Over budget',
    budgeted_count: '{count} categories budgeted',
    no_budgeted_yet: 'No budgeted categories yet',
    income_tip: 'Tap an income category card to set a target and track progress.',
    income_target_section: 'With target',
    income_no_target_section: 'No target',
    section_near_full: 'Near limit',

    edit: 'Edit',
    status_has_target: 'Has target',
    status_no_target: 'No target',
    status_over_budget: 'Over budget',
    status_no_budget: 'No budget',
    status_near_full: 'Near limit',
    income_card_with_target: 'Target {target} • Received {actual}',
    income_card_no_target: 'Received {actual}',
    expense_card_left: 'Left {amount}',
    category_count: '{count} categories',

    empty_title: 'No {type} categories yet',
    empty_desc: 'Tap “Add category” to create a new one.',
    add_category: 'Add {type} category',
    add_category_short: 'Add category',
    tap_to_add_category: 'Tap to add a new category',
    no_match_title: 'No categories match your filters',
    no_match_desc: 'Try searching again or clear filters.',
    clear_filters: 'Clear filters',

    add_modal_title: 'Add {type} category',
    create_new_category: 'Create new category',
    add_modal_desc: 'Name the category and pick an icon',
    category_name_label: 'Category name',
    placeholder_expense: 'e.g., Lunch',
    placeholder_income: 'e.g., Salary',
    name_hint: 'Type a name or choose a preset below',
    income_optional_title: 'Add income to this category now (optional)',
    income_optional_desc: 'If you enter an amount, an income transaction will be created for the selected month.',
    amount: 'Amount',
    amount_value: 'Amount:',
    popular_presets: 'Popular presets',
    presets_desc: 'Tap to auto-fill name and icon',
    tap_to_select: 'Tap to select',
    choose_icon: 'Choose an icon',
    select_icon_aria: 'Select icon {icon}',
    selected: 'Selected:',
    not_selected: 'Not selected',
    clear: 'Clear',
    custom_icon: 'Custom icon',
    custom_icon_placeholder: 'Type an icon key (e.g., food, shopping) or an emoji',
    example_prefix: 'e.g.',
    next: 'Create',
    saving: 'Saving...',

    edit_modal_title: 'Edit {type} category',
    edit_modal_fallback: 'Edit category',
    edit_modal_desc: 'Update name or icon',

    add_income_title: 'Add income to this category',
    add_income_desc: 'Add an amount and it will be recorded for {month}',
    received: 'Received',
    progress_target: 'Target progress',
    no_target: 'No target set yet',
    target: 'Target',
    remaining_to_target: 'Remaining',
    over_target: 'Over target',
    tip_set_target: 'Tip: Set a target to track progress like expenses.',
    add_more: 'Add more',
    to_add: 'To add',
    new_total: 'New total',
    note_optional: 'Note (optional)',
    add_income: 'Add income',
    adding: 'Adding...',

    cancel: 'Cancel',
    save: 'Save',
    delete_this_category: 'Delete this category',

    delete_category: 'Delete category',
    warning: 'Warning',
    delete_irreversible: 'Deleting a category cannot be undone.',
    delete_btn: 'Delete',
    deleting: 'Deleting...',

    set_income_target: 'Set income target',
    set_budget: 'Set budget',
    adjust_income_target_desc: 'Adjust target for this category',
    adjust_budget_desc: 'Adjust budget for this category',
    spent: 'Spent',
    remaining: 'Remaining',
    desired_target_input: 'Target amount (THB)',
    desired_budget_input: 'Budget amount (THB)',

    settings_title: 'Settings',
    settings_budget: 'Budget settings',
    month_to_set_budget: 'Month to set budget',
    choose_month_hint: 'Select a month above or use the navigation buttons.',
    cycle_desc: 'Transactions after the cutoff day count toward next month.',
    mode: 'Mode',
    calendar_mode: 'Calendar',
    set_cutoff: 'Set cutoff day',
    cutoff_day: 'Cutoff day',
    day_number: 'Day {day}',
    select_cutoff_day: 'Select cutoff day',
    cycle_for_month: 'Cycle for {month}: {start} – {end}',

    reorder_title: 'Reorder {type} categories',
    reorder_desc: 'Drag to reorder or use up/down buttons',
    order_number: 'Order {n}',
    reset_by_name: 'Reset by name',
    category_item_aria: 'Category {name}',
    move_up: 'Move up',
    move_down: 'Move down',
    up: 'Up',
    down: 'Down',
    no_reorder_items: 'No categories to reorder',

    toast_title: 'Notice',
    close_toast: 'Close notification',

    login_required: 'Please sign in',
    enter_category_name: 'Please enter a category name',
    enter_valid_amount: 'Please enter a valid amount',
    category_updated: 'Category updated',
    category_update_failed: 'Failed to update category: {detail}',
    income_added: 'Income added',
    income_add_failed: 'Failed to add income: {detail}',
    category_deleted: 'Category deleted',
    category_delete_failed: 'Failed to delete category: {detail}',
    budget_saved: 'Budget saved',
    budget_save_failed: 'Failed to save budget: {detail}',
    reorder_saved: 'Saved category order',
    category_created: 'Category created',
    category_create_failed: 'Failed to create category: {detail}',
  },
};

const trForLang = (language, key, vars) => {
  const dict = I18N[language] || I18N.th;
  const template = dict?.[key] ?? I18N.th?.[key] ?? key;
  return formatI18n(template, vars);
};

export default function BudgetManager({ onClose, initialType = 'expense' }) {
  const normalizedInitialType = initialType === 'income' ? 'income' : 'expense';
  const language = useBalanzLanguage('th'); // 'th' | 'en'
  const isEn = language === 'en';
  const uiLocale = isEn ? 'en-US' : 'th-TH';
  const tr = useCallback((key, vars) => trForLang(language, key, vars), [language]);

  const displayMonthLabel = useCallback((label) => {
    if (!isEn) return String(label || '');
    const parsed = parseThaiMonthLabel(label);
    if (!parsed) return String(label || '');
    const name = monthNamesEN[parsed.monthIndex] || String(label || '');
    return `${name} ${parsed.year}`;
  }, [isEn]);

  const monthNamesForUi = useMemo(() => (isEn ? monthNamesEN : monthNamesTH), [isEn]);
  const monthShortDisplay = useMemo(() => (isEn ? monthShortEN : monthShortTH), [isEn]);
  const popularPresets = useMemo(() => (isEn ? POPULAR_CATEGORY_PRESETS.en : POPULAR_CATEGORY_PRESETS.th), [isEn]);
  // --- State ---
  const [mounted, setMounted] = useState(false);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState({}); // Map: { "Month Year": { categoryId: amount } }
  const [monthlyBudget, setMonthlyBudget] = useState({}); // Map: { "Month Year": totalAmount }
  const [editingMonthly, setEditingMonthly] = useState(false);
  const [editMonthlyAmount, setEditMonthlyAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(normalizedInitialType); // 'expense' or 'income'
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempMonthIndex, setTempMonthIndex] = useState(12);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [monthScroll, setMonthScroll] = useState({ canLeft: false, canRight: false });
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => new Date().getFullYear());
  // NOTE: Keep the first render deterministic between server and client to avoid hydration mismatch.
  // Load localStorage values in an effect instead of the useState initializer.
  const [sortBy, setSortBy] = useState('budget_desc');
  const [sortPrefReady, setSortPrefReady] = useState(false);
  const [cutoffDay, setCutoffDay] = useState(0); // 0 = ตามเดือนปฏิทิน, 1-31 = ตัดรอบวันนั้นของทุกเดือน
  const [cutoffPrefReady, setCutoffPrefReady] = useState(false);
  const [categoryOrder, setCategoryOrder] = useState({ expense: [], income: [] }); // string[] by type
  const [categoryOrderPrefReady, setCategoryOrderPrefReady] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [reorderDraftIds, setReorderDraftIds] = useState([]); // string[]
  const reorderDragIdRef = useRef('');
  const showReorderModalRef = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('budget_sort_by');
      const allowed = new Set(['budget_desc', 'budget_asc', 'spent_desc', 'remaining_desc', 'name_asc', 'name_desc', 'custom']);
      if (raw && allowed.has(raw)) setSortBy(raw);
    } catch {
      // ignore
    } finally {
      setSortPrefReady(true);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('budget_cutoff_day_v1');
      const n = Number(raw);
      if (Number.isFinite(n) && n >= 0 && n <= 31) setCutoffDay(Math.round(n));
    } catch {
      // ignore
    } finally {
      setCutoffPrefReady(true);
    }
  }, []);

  useEffect(() => {
    try {
      const expRaw = localStorage.getItem('budget_category_order_v1_expense');
      const incRaw = localStorage.getItem('budget_category_order_v1_income');
      const exp = expRaw ? JSON.parse(expRaw) : null;
      const inc = incRaw ? JSON.parse(incRaw) : null;
      setCategoryOrder({
        expense: Array.isArray(exp) ? exp.map((x) => String(x)).filter(Boolean) : [],
        income: Array.isArray(inc) ? inc.map((x) => String(x)).filter(Boolean) : [],
      });
    } catch {
      setCategoryOrder({ expense: [], income: [] });
    } finally {
      setCategoryOrderPrefReady(true);
    }
  }, []);

  useEffect(() => {
    setSelectedType(normalizedInitialType);
  }, [normalizedInitialType]);

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Modal State for Editing
  const [editingCategory, setEditingCategory] = useState(null); // The category object being edited
  const [editAmount, setEditAmount] = useState('');
  const [editingCategoryMeta, setEditingCategoryMeta] = useState(null); // Edit name/icon
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryIcon, setEditCategoryIcon] = useState('');
  const [editCategoryLoading, setEditCategoryLoading] = useState(false);
  const [incomeQuickAmount, setIncomeQuickAmount] = useState('');
  const [incomeQuickNote, setIncomeQuickNote] = useState('');
  const [incomeQuickLoading, setIncomeQuickLoading] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState(null);
  const [deleteCategoryLoading, setDeleteCategoryLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [newIncomeAmount, setNewIncomeAmount] = useState('');
  const [newIncomeNote, setNewIncomeNote] = useState('');
  const [addCategoryLoading, setAddCategoryLoading] = useState(false);
  const iconOptions = ['food', 'drink', 'shopping', 'transport', 'home', 'bills', 'health', 'education', 'tech', 'pet', 'game', 'music', 'gift', 'salary', 'work', 'money', 'love', 'other'];
  const [toast, setToast] = useState(null); // { id, tone: 'success'|'error'|'info'|'warning', message }
  const toastTimerRef = useRef(null);
  const incomeQuickAmountInputRef = useRef(null);

  const dismissToast = useCallback(() => {
    setToast(null);
    try {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    } catch {
      // ignore
    }
  }, []);

  const showToast = useCallback((tone, message) => {
    const id = Date.now();
    setToast({ id, tone: tone || 'info', message: String(message || '') });
    try {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      toastTimerRef.current = setTimeout(() => setToast(null), 2600);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      } catch {
        // ignore
      }
    };
  }, []);

  // --- Date Logic ---
  const months = useMemo(() => {
    const m = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() + 543;
    const currentMonth = currentDate.getMonth();
    
    for (let i = -12; i <= 12; i++) {
      const monthIndex = (currentMonth + i + 12) % 12;
      const yearOffset = Math.floor((currentMonth + i) / 12);
      const year = currentYear + yearOffset;
      m.push(`${monthNamesTH[monthIndex]} ${year}`);
    }
    return m;
  }, []);

  const selectedMonth = months[currentMonthIndex];
  const monthTabsRef = useRef(null);
  const activeMonthRef = useRef(null);
  const monthDragRef = useRef({ active: false, startX: 0, startScrollLeft: 0 });
  const suppressMonthClickRef = useRef(false);
  const monthScrollRafRef = useRef(0);
  const cutoffInitAppliedRef = useRef(false);

  const getCurrentCycleMonthIndex = useCallback(() => {
    const label = monthLabelFromDateWithCutoff(Date.now(), cutoffDay);
    const idx = (months || []).findIndex((m) => m === label);
    return idx >= 0 ? idx : 12;
  }, [months, cutoffDay]);

  useEffect(() => {
    if (!cutoffPrefReady) return;
    if (cutoffInitAppliedRef.current) return;
    cutoffInitAppliedRef.current = true;
    const idx = getCurrentCycleMonthIndex();
    setCurrentMonthIndex(idx);
    setTempMonthIndex(idx);
  }, [cutoffPrefReady, getCurrentCycleMonthIndex]);

  const updateMonthScroll = useCallback(() => {
    const el = monthTabsRef.current;
    if (!el) return;
    const left = el.scrollLeft > 2;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 2;
    setMonthScroll((prev) => (prev.canLeft === left && prev.canRight === right ? prev : { canLeft: left, canRight: right }));
  }, []);

  const scheduleUpdateMonthScroll = useCallback(() => {
    if (monthScrollRafRef.current) return;
    monthScrollRafRef.current = window.requestAnimationFrame(() => {
      monthScrollRafRef.current = 0;
      updateMonthScroll();
    });
  }, [updateMonthScroll]);

  useEffect(() => {
    const el = activeMonthRef.current;
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } catch {
      // ignore
    }
    scheduleUpdateMonthScroll();
  }, [currentMonthIndex, selectedType, scheduleUpdateMonthScroll]);

  useEffect(() => {
    updateMonthScroll();
    return () => {
      if (monthScrollRafRef.current) window.cancelAnimationFrame(monthScrollRafRef.current);
    };
  }, [currentMonthIndex, months.length, updateMonthScroll]);

  const scrollMonthTabsBy = (deltaX) => {
    const el = monthTabsRef.current;
    if (!el) return;
    try {
      el.scrollBy({ left: deltaX, behavior: 'smooth' });
    } catch {
      el.scrollLeft += deltaX;
    }
  };

  const onMonthWheel = (e) => {
    const el = monthTabsRef.current;
    if (!el) return;
    if (e.shiftKey) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (!e.deltaY) return;
    e.preventDefault();
    el.scrollLeft += e.deltaY;
    scheduleUpdateMonthScroll();
  };

  const onMonthPointerDown = (e) => {
    const el = monthTabsRef.current;
    if (!el) return;
    if (e.pointerType === 'touch') return; // keep native swipe scrolling on touch devices
    if (e.button != null && e.button !== 0) return; // left click only (mouse)
    // If the user clicks a month button, allow the click to go through (don't start drag capture).
    try {
      const target = e?.target;
      if (target && target.closest && target.closest('button')) return;
    } catch {
      // ignore
    }
    suppressMonthClickRef.current = false;
    monthDragRef.current = { active: true, startX: e.clientX, startScrollLeft: el.scrollLeft };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onMonthPointerMove = (e) => {
    const el = monthTabsRef.current;
    const st = monthDragRef.current;
    if (!el || !st.active) return;
    const dx = e.clientX - st.startX;
    if (Math.abs(dx) > 10) suppressMonthClickRef.current = true;
    el.scrollLeft = st.startScrollLeft - dx;
    scheduleUpdateMonthScroll();
  };

  const onMonthPointerUp = () => {
    monthDragRef.current.active = false;
    // allow click again after this tick
    setTimeout(() => { suppressMonthClickRef.current = false; }, 0);
    scheduleUpdateMonthScroll();
  };

  const onMonthClickCapture = (e) => {
    if (!suppressMonthClickRef.current) return;
    e.preventDefault();
    e.stopPropagation();
  };

  const monthIndexMap = useMemo(() => {
    const map = new Map();
    (months || []).forEach((label, idx) => {
      const p = parseThaiMonthLabel(label);
      if (!p) return;
      map.set(`${p.year}-${p.monthIndex}`, idx);
    });
    return map;
  }, [months]);

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
    return monthNamesForUi.map((name, monthIndex) => {
      const idx = monthIndexMap.get(`${y}-${monthIndex}`);
      return { name, monthIndex, idx: typeof idx === 'number' ? idx : null };
    });
  }, [monthIndexMap, monthPickerYear, monthNamesForUi]);

  useEffect(() => {
    if (!showMonthPicker) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowMonthPicker(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [showMonthPicker]);

  const budgetSparkline = useMemo(() => {
    const range = cycleRangeForMonthLabel(selectedMonth, cutoffDay);
    if (!range?.start || !range?.end) return null;
    const start = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
    const end = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
    const daysInRange = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);

    const daily = new Array(daysInRange).fill(0);
    for (const t of transactions || []) {
      if (!t || t.type !== selectedType) continue;
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) continue;
      const dm = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      if (dm < start || dm > end) continue;
      const idx = Math.round((dm.getTime() - start.getTime()) / 86400000);
      if (idx < 0 || idx >= daily.length) continue;
      const amt = Number(t.amount) || 0;
      daily[idx] += Math.max(0, amt);
    }

    let running = 0;
    const cumulative = daily.map((v) => (running += v));
    const max = Math.max(0, ...cumulative);
    if (max <= 0) return null;

    const W = 100;
    const H = 40;
    const pad = 4;
    const usableH = H - pad * 2;
    const sampleCount = Math.min(14, cumulative.length);
    const denom = Math.max(1, sampleCount - 1);

    const points = [];
    for (let i = 0; i < sampleCount; i++) {
      const x = (i / denom) * W;
      const idx = Math.round((i / denom) * (cumulative.length - 1));
      const v = cumulative[idx] || 0;
      const y = pad + (1 - v / max) * usableH;
      points.push({ x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) });
    }

    const dPath = buildSmoothSvgPath(points);
    if (!dPath) return null;
    const first = points[0];
    const last = points[points.length - 1];
    const areaPath = `${dPath} L ${last.x} ${H} L ${first.x} ${H} Z`;
    return { dPath, areaPath };
  }, [selectedMonth, transactions, selectedType, cutoffDay]);

  // --- Data Fetching ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const headers = { Authorization: `Bearer ${token}` };
        
        // Parallel Fetching for speed


        const [catRes, budgetRes, transRes, totalRes] = await Promise.all([
          fetch(`${API_BASE}/api/categories`, { headers }),
          fetch(`${API_BASE}/api/budgets`, { headers }),
          fetch(`${API_BASE}/api/transactions`, { headers }),
          fetch(`${API_BASE}/api/budgets/total`, { headers })
        ]);

        // Helper: parse JSON safely
        const safeJson = async (res) => {
          try {
            const text = await res.text();
            return JSON.parse(text);
          } catch {
            return [];
          }
        };

        const cats = await safeJson(catRes);
        const buds = await safeJson(budgetRes);
        const trans = await safeJson(transRes);
        const totalBudgets = await safeJson(totalRes);

        // Debug logging for budgets response
        try {
          console.log('GET /api/budgets response', { ok: budgetRes.ok, status: budgetRes.status, parsed: buds });
        } catch (e) {
          console.warn('Failed to log budgets response', e);
        }

        if (catRes.ok) setCategories(cats);

	        if (budgetRes.ok) {
	          const budgetMap = {};
	          buds.forEach(b => {
	             const month = b?.month;
	             if (!month) return;
	             if (!budgetMap[month]) budgetMap[month] = {};
	             const catId = (b?.category && typeof b.category === 'object')
	               ? (b.category?._id || '')
	               : (b?.category || '');
	             if (!catId) return;
	             budgetMap[month][catId] = b?.total ?? 0;
	          });
	          setBudgets(budgetMap);
	        }

        if (transRes.ok) setTransactions(trans);

        // สมมติ totalBudgets เป็น [{ month: '...', total: 10000 }, ...]
        if (Array.isArray(totalBudgets)) {
          const map = {};
          totalBudgets.forEach(tb => { map[tb.month] = tb.total; });
          setMonthlyBudget(map);
        }

      } catch (err) {
        console.error("Failed to load data", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!sortPrefReady) return;
    try {
      localStorage.setItem('budget_sort_by', sortBy);
    } catch {
      // ignore
    }
  }, [sortBy, sortPrefReady]);

  useEffect(() => {
    if (!cutoffPrefReady) return;
    try {
      localStorage.setItem('budget_cutoff_day_v1', String(Number(cutoffDay) || 0));
    } catch {
      // ignore
    }
  }, [cutoffDay, cutoffPrefReady]);

  useEffect(() => {
    if (!categoryOrderPrefReady) return;
    try {
      localStorage.setItem('budget_category_order_v1_expense', JSON.stringify(categoryOrder?.expense || []));
      localStorage.setItem('budget_category_order_v1_income', JSON.stringify(categoryOrder?.income || []));
    } catch {
      // ignore
    }
  }, [categoryOrder, categoryOrderPrefReady]);

  useEffect(() => {
    showReorderModalRef.current = Boolean(showReorderModal);
  }, [showReorderModal]);

	    // --- Process Data for Display ---
	    // Combine Categories + Budgets + Transactions for the selected month
			    const processedData = useMemo(() => {
			    const currentMonthTrans = (transactions || []).filter(t => {
			      if (t?.type !== selectedType) return false;
			      return monthLabelFromDateWithCutoff(t?.date, cutoffDay) === selectedMonth;
			    });

        const collator = new Intl.Collator('th-TH', { sensitivity: 'base', numeric: true });
        const selectedTypeKeyLocal = selectedType === 'income' ? 'income' : 'expense';
        const customOrder = Array.isArray(categoryOrder?.[selectedTypeKeyLocal]) ? categoryOrder[selectedTypeKeyLocal] : [];
        const customIndex = new Map(customOrder.map((id, idx) => [String(id), idx]));

        const isIncome = selectedType === 'income';
        let totalReceived = 0;
        let totalSpent = 0;
        let txCount = 0;

        const list = (categories || [])
          .filter((c) => c?.type === selectedType)
          .map((cat) => {
            const budgetAmount = Number(budgets?.[selectedMonth]?.[cat?._id] || 0) || 0;

            let actualAmount = 0;
            let actualCount = 0;
            for (const t of currentMonthTrans) {
              const catVal = t?.category && typeof t.category === 'object' ? t.category?._id : t?.category;
              if (String(catVal || '') !== String(cat?._id || '')) continue;
              const amt = Number(t?.amount) || 0;
              if (amt > 0) actualAmount += amt;
              actualCount += 1;
            }

            if (isIncome) {
              totalReceived += actualAmount;
            } else {
              totalSpent += actualAmount;
            }
            txCount += actualCount;

            const percent = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;
            const remaining = budgetAmount - actualAmount;

            return {
              ...cat,
              budget: budgetAmount,
              received: isIncome ? actualAmount : 0,
              spent: !isIncome ? actualAmount : 0,
              remaining,
              percent,
              txCount: actualCount,
              isOverBudget: !isIncome && budgetAmount > 0 ? actualAmount > budgetAmount : false,
            };
          });

	        const sortedItems = (() => {
	          if (isIncome) {
	            const incomeSortKey =
	              sortBy === 'custom' || sortBy === 'name_asc' || sortBy === 'name_desc' || sortBy === 'budget_asc'
	                ? sortBy
	                : 'budget_desc';

	            return [...list].sort((a, b) => {
	              switch (incomeSortKey) {
                  case 'custom': {
                    const ai = customIndex.has(String(a?._id || '')) ? customIndex.get(String(a?._id || '')) : 999999;
                    const bi = customIndex.has(String(b?._id || '')) ? customIndex.get(String(b?._id || '')) : 999999;
                    if (ai !== bi) return ai - bi;
                    return collator.compare(a?.name || '', b?.name || '');
                  }
	                case 'budget_asc':
	                  return (Number(a?.received) || 0) - (Number(b?.received) || 0);
	                case 'name_asc':
	                  return collator.compare(a?.name || '', b?.name || '');
	                case 'name_desc':
	                  return collator.compare(b?.name || '', a?.name || '');
	                case 'budget_desc':
	                default:
	                  return (Number(b?.received) || 0) - (Number(a?.received) || 0);
	              }
	            });
	          }

	          return [...list].sort((a, b) => {
	            switch (sortBy) {
                case 'custom': {
                  const ai = customIndex.has(String(a?._id || '')) ? customIndex.get(String(a?._id || '')) : 999999;
                  const bi = customIndex.has(String(b?._id || '')) ? customIndex.get(String(b?._id || '')) : 999999;
                  if (ai !== bi) return ai - bi;
                  return collator.compare(a?.name || '', b?.name || '');
                }
	              case 'budget_asc':
	                return (Number(a?.budget) || 0) - (Number(b?.budget) || 0);
	              case 'name_asc':
	                return collator.compare(a?.name || '', b?.name || '');
	              case 'name_desc':
	                return collator.compare(b?.name || '', a?.name || '');
	              case 'spent_desc':
	                return (Number(b?.spent) || 0) - (Number(a?.spent) || 0);
	              case 'remaining_desc':
	                return (Number(b?.remaining) || 0) - (Number(a?.remaining) || 0);
	              case 'budget_desc':
	              default:
	                return (Number(b?.budget) || 0) - (Number(a?.budget) || 0);
	            }
	          });
	        })();

	        const overallMonthly = monthlyBudget[selectedMonth] ?? 0;
	        return {
	          items: sortedItems,
	          summary: {
            totalReceived,
            totalSpent,
            txCount,
            totalBudget: sortedItems.reduce((s, c) => s + (Number(c?.budget) || 0), 0),
            remaining: sortedItems.reduce((s, c) => s + (Number(c?.remaining) || 0), 0),
	            overallMonthly,
	          },
	        };
			    }, [categories, budgets, transactions, selectedMonth, monthlyBudget, selectedType, sortBy, cutoffDay, categoryOrder]);

    // Summary headline: prefer "รายรับ" as the main base, and subtract actual expenses.
    // If no income budget is set, fall back to expense budgets (classic budget mode).
    const headlineSummary = useMemo(() => {
      const monthBudgets = (budgets && selectedMonth) ? (budgets[selectedMonth] || {}) : {};
      const incomeCats = (categories || []).filter((c) => c?.type === 'income');
      const expenseCats = (categories || []).filter((c) => c?.type === 'expense');

      const sumBudgetByCats = (cats) => {
        if (!Array.isArray(cats) || !cats.length) return 0;
        return cats.reduce((s, c) => s + (Number(monthBudgets?.[c._id]) || 0), 0);
      };

      const incomeBudgetTotal = sumBudgetByCats(incomeCats);
      const expenseBudgetTotal = sumBudgetByCats(expenseCats);

	      const monthTxns = (transactions || []).filter((t) => monthLabelFromDateWithCutoff(t?.date, cutoffDay) === selectedMonth);
      const incomeActualTotal = monthTxns
        .filter((t) => t?.type === 'income')
        .reduce((s, t) => s + (Number(t?.amount) || 0), 0);
      const expenseSpentTotal = monthTxns
        .filter((t) => t?.type === 'expense')
        .reduce((s, t) => s + (Number(t?.amount) || 0), 0);

      const baseTotal = incomeActualTotal > 0
        ? incomeActualTotal
        : incomeBudgetTotal > 0
          ? incomeBudgetTotal
          : expenseBudgetTotal;
      const baseMode = incomeActualTotal > 0 ? 'income_actual' : incomeBudgetTotal > 0 ? 'income_budget' : 'expense_budget';
      const remaining = baseTotal - expenseSpentTotal;
      const spentPct = baseTotal > 0 ? Math.round((expenseSpentTotal / baseTotal) * 100) : 0;
      const spentPctClamped = baseTotal > 0 ? Math.min(100, Math.max(0, (expenseSpentTotal / baseTotal) * 100)) : 0;

      return {
        baseMode,
        incomeBudgetTotal,
        incomeActualTotal,
        expenseBudgetTotal,
        expenseSpentTotal,
        baseTotal,
        remaining,
        spentPct,
        spentPctClamped,
      };
	    }, [budgets, categories, transactions, selectedMonth, cutoffDay]);


  // --- Handlers ---
    // Debug: log budgets/categories/month when they change
    useEffect(() => {
      try {
        console.log('BudgetManager debug:', {
          selectedMonth,
          budgetMonths: Object.keys(budgets || {}),
          categoriesCount: (categories || []).length,
        });
      } catch (e) {
        // noop
      }
    }, [budgets, categories, selectedMonth]);
		  const openEditModal = (category) => {
		    setEditingCategory(category);
		    setEditAmount(category.budget === 0 ? '' : category.budget.toString());
		  };

      const openEditCategoryMetaModal = (category) => {
        if (!category?._id) return;
        setIsSortOpen(false);
        setIsSettingsOpen(false);
        setShowAddModal(false);
        setEditingCategory(null);
        setDeleteCategory(null);
        setEditCategoryName(String(category?.name || ''));
        setEditCategoryIcon(String(category?.icon || ''));
        setIncomeQuickAmount('');
        setIncomeQuickNote('');
        setEditingCategoryMeta(category);
      };

      const closeEditCategoryMetaModal = () => {
        if (editCategoryLoading) return;
        if (incomeQuickLoading) return;
        setEditingCategoryMeta(null);
      };

      const handleSaveCategoryMeta = async (e) => {
        e?.preventDefault?.();
        if (!editingCategoryMeta?._id) return;
        const token = localStorage.getItem('token');
        if (!token) {
          showToast('warning', tr('login_required'));
          return;
        }

        const name = String(editCategoryName || '').trim();
        const icon = String(editCategoryIcon || '').trim();
        if (!name) {
          showToast('warning', tr('enter_category_name'));
          return;
        }

        setEditCategoryLoading(true);
        try {
          const res = await fetch(`${API_BASE}/api/categories/${editingCategoryMeta._id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name, icon }),
          });

	          if (!res.ok) {
	            const text = await res.text();
	            throw new Error(text || (isEn ? 'Failed to update category' : 'ไม่สามารถแก้ไขหมวดได้'));
	          }

          let updated = null;
          try {
            updated = await res.json();
          } catch {
            updated = null;
          }

          setCategories((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return list.map((c) => (c && String(c._id) === String(editingCategoryMeta._id) ? { ...c, ...(updated || { name, icon }) } : c));
          });
          setEditingCategoryMeta((prev) => {
            if (!prev || String(prev._id) !== String(editingCategoryMeta._id)) return prev;
            return { ...prev, ...(updated || { name, icon }) };
          });

          setEditingCategoryMeta(null);
          showToast('success', tr('category_updated'));
        } catch (err) {
          console.error('Update category error', err);
          showToast('error', tr('category_update_failed', { detail: err?.message || (isEn ? 'Error' : 'ข้อผิดพลาด') }));
        } finally {
          setEditCategoryLoading(false);
        }
      };

      const handleAddIncomeToCategory = async (e) => {
        e?.preventDefault?.();
        if (!editingCategoryMeta?._id) return;
        const token = localStorage.getItem('token');
        if (!token) {
          showToast('warning', tr('login_required'));
          return;
        }

        const amountNum = Number(incomeQuickAmount);
        if (!Number.isFinite(amountNum) || amountNum <= 0) {
          showToast('warning', tr('enter_valid_amount'));
          return;
        }

        setIncomeQuickLoading(true);
        try {
          const payload = {
            amount: amountNum,
            type: 'income',
            category: editingCategoryMeta._id,
            date: dateStringForSelectedMonthWithCutoff(selectedMonth, cutoffDay),
            notes: String(incomeQuickNote || '').trim() || String(editingCategoryMeta?.name || ''),
          };

          const res = await fetch(`${API_BASE}/api/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
          });
	          if (!res.ok) {
	            const text = await res.text();
	            throw new Error(text || (isEn ? 'Failed to save income' : 'ไม่สามารถบันทึกรายรับได้'));
	          }
          const created = await res.json();
          setTransactions((prev) => {
            const list = Array.isArray(prev) ? prev : [];
            return [...list, created];
          });
          showToast('success', tr('income_added'));
        } catch (err) {
          console.error('Add income error', err);
          showToast('error', tr('income_add_failed', { detail: err?.message || (isEn ? 'Error' : 'ข้อผิดพลาด') }));
        } finally {
          setIncomeQuickLoading(false);
        }
      };

	  const openDeleteCategoryModal = (category) => {
	    if (!category) return;
      if (isReservedOtherCategoryName(category?.name)) {
        showToast('info', 'หมวด “อื่นๆ” ลบไม่ได้');
        return;
      }
	    setIsSortOpen(false);
	    setIsSettingsOpen(false);
	    setShowAddModal(false);
	    setEditingCategory(null);
      setEditingCategoryMeta(null);
	    setDeleteCategory(category);
	  };

  const closeDeleteCategoryModal = () => {
    if (deleteCategoryLoading) return;
    setDeleteCategory(null);
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategory?._id) return;
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('warning', tr('login_required'));
      return;
    }

    setDeleteCategoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/categories/${deleteCategory._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
	      if (!res.ok) {
	        const text = await res.text();
	        throw new Error(text || (isEn ? 'Failed to delete category' : 'ไม่สามารถลบหมวดได้'));
	      }

      let payload = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      const deletedId = deleteCategory._id;
      const reassignedTo = payload?.reassignedTo || null;

      setCategories((prev) => (Array.isArray(prev) ? prev.filter((c) => c && c._id !== deletedId) : []));
      setBudgets((prev) => {
        const next = { ...(prev || {}) };
        for (const m of Object.keys(next)) {
          const monthMap = next[m];
          if (!monthMap || typeof monthMap !== 'object') continue;
          if (Object.prototype.hasOwnProperty.call(monthMap, deletedId)) {
            const { [deletedId]: _removed, ...rest } = monthMap;
            next[m] = rest;
          }
        }
        return next;
      });
      if (reassignedTo) {
        setTransactions((prev) => {
          const list = Array.isArray(prev) ? prev : [];
          return list.map((t) => {
            if (!t) return t;
            const catVal = t.category && typeof t.category === 'object' ? t.category._id : t.category;
            if (String(catVal || '') !== String(deletedId)) return t;
            return { ...t, category: reassignedTo };
          });
        });
      }

      setDeleteCategory(null);
      showToast('success', tr('category_deleted'));
    } catch (err) {
      console.error('Delete category error', err);
      showToast('error', tr('category_delete_failed', { detail: err?.message || (isEn ? 'Error' : 'ข้อผิดพลาด') }));
    } finally {
      setDeleteCategoryLoading(false);
    }
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const total = parseFloat(editAmount) || 0;

    try {
      const res = await fetch(`${API_BASE}/api/budgets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category: editingCategory._id, month: selectedMonth, total }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to save budget');
      }

      // Prefer using the created/updated budget returned by the server to update UI immediately.
      // This keeps the UI consistent even if a subsequent full re-fetch fails (e.g., auth issues).
      try {
        const saved = await res.json();
        const savedMonth = saved.month || selectedMonth;
        const savedCatId = typeof saved.category === 'object' ? saved.category._id : saved.category;
        const savedTotal = saved.total != null ? saved.total : total;
        setBudgets(prev => ({
          ...prev,
          [savedMonth]: {
            ...(prev[savedMonth] || {}),
            [savedCatId]: savedTotal
          }
        }));
      } catch (err) {
        // if parsing fails, fall back to optimistic update
        setBudgets(prev => ({
          ...prev,
          [selectedMonth]: {
            ...(prev[selectedMonth] || {}),
            [editingCategory._id]: total
          }
        }));
      }

      setEditingCategory(null);
      showToast('success', tr('budget_saved'));
    } catch (error) {
      console.error('Save budget error', error);
      showToast('error', tr('budget_save_failed', { detail: error?.message || (isEn ? 'Server error' : 'ข้อผิดพลาดจากเซิร์ฟเวอร์') }));
    }
  };

  const openSettings = () => {
    setIsSortOpen(false);
    setEditingCategory(null);
    setShowAddModal(false);
    setTempMonthIndex(currentMonthIndex);
    setIsSettingsOpen(true);
  };

  const openAddCategoryModal = () => {
    setIsSortOpen(false);
    setIsSettingsOpen(false);
    setEditingCategory(null);
    setNewCategoryName('');
    setNewCategoryIcon('');
    setNewIncomeAmount('');
    setNewIncomeNote('');
    setShowAddModal(true);
  };

  const closeAddCategoryModal = () => {
    setShowAddModal(false);
    setNewCategoryName('');
    setNewCategoryIcon('');
    setNewIncomeAmount('');
    setNewIncomeNote('');
  };

		  const isIncomeMode = selectedType === 'income';
		  const typeLabel = isIncomeMode ? tr('type_income') : tr('type_expense');
	    const selectedTypeKey = isIncomeMode ? 'income' : 'expense';
	    const sortKeyForUI = useMemo(() => {
	      if (!isIncomeMode) return sortBy;
	      if (sortBy === 'custom' || sortBy === 'name_asc' || sortBy === 'name_desc' || sortBy === 'budget_asc') return sortBy;
	      return 'budget_desc';
	    }, [isIncomeMode, sortBy]);

      const sortLabel = useMemo(() => {
        const key = (!isIncomeMode ? sortBy : sortKeyForUI) || 'budget_desc';
        if (key === 'custom') return tr('sort_custom');
        if (key === 'name_asc') return tr('sort_name_asc');
        if (key === 'name_desc') return tr('sort_name_desc');
        if (key === 'budget_asc') return isIncomeMode ? tr('sort_received_asc') : tr('sort_budget_asc_expense');
        if (key === 'spent_desc') return tr('sort_spent_desc');
        if (key === 'remaining_desc') return tr('sort_remaining_desc');
        return isIncomeMode ? tr('sort_received_desc') : tr('sort_budget_desc_expense');
      }, [isIncomeMode, sortBy, sortKeyForUI, tr]);

    const collatorTH = useMemo(() => new Intl.Collator('th-TH', { sensitivity: 'base', numeric: true }), []);
    const categoryById = useMemo(() => {
      const map = new Map();
      (categories || []).forEach((c) => {
        const id = c?._id ? String(c._id) : '';
        if (!id) return;
        map.set(id, c);
      });
      return map;
    }, [categories]);

    useEffect(() => {
      const byType = { expense: [], income: [] };
      (categories || []).forEach((c) => {
        const id = c?._id ? String(c._id) : '';
        if (!id) return;
        const t = c?.type === 'income' ? 'income' : 'expense';
        byType[t].push(id);
      });

      setCategoryOrder((prev) => {
        const next = { ...(prev || {}) };
        (['expense', 'income']).forEach((t) => {
          const validIds = byType[t] || [];
          const validSet = new Set(validIds);
          const existing = Array.isArray(prev?.[t]) ? prev[t].map((x) => String(x)).filter(Boolean) : [];
          const merged = [];
          const seen = new Set();
          existing.forEach((id) => {
            if (!validSet.has(id) || seen.has(id)) return;
            merged.push(id);
            seen.add(id);
          });
          validIds.forEach((id) => {
            if (seen.has(id)) return;
            merged.push(id);
            seen.add(id);
          });
          next[t] = merged;
        });
        return next;
      });
    }, [categories]);

    const openReorderCategoriesModal = () => {
      const list = (categories || [])
        .filter((c) => (c?.type === 'income' ? 'income' : 'expense') === selectedTypeKey)
        .map((c) => String(c?._id || ''))
        .filter(Boolean);
      const set = new Set(list);
      const base = Array.isArray(categoryOrder?.[selectedTypeKey]) ? categoryOrder[selectedTypeKey].filter((id) => set.has(String(id))) : [];
      const merged = [...base];
      const seen = new Set(merged);
      list.forEach((id) => {
        if (seen.has(id)) return;
        merged.push(id);
        seen.add(id);
      });
      setReorderDraftIds(merged);
      reorderDragIdRef.current = '';
      setShowReorderModal(true);
    };

    const moveReorderDraft = (fromIdx, toIdx) => {
      setReorderDraftIds((prev) => {
        const src = Array.isArray(prev) ? [...prev] : [];
        if (fromIdx < 0 || fromIdx >= src.length) return prev;
        const clamped = Math.max(0, Math.min(src.length - 1, Number(toIdx) || 0));
        if (fromIdx === clamped) return prev;
        const [item] = src.splice(fromIdx, 1);
        src.splice(clamped, 0, item);
        return src;
      });
    };

    useEffect(() => {
      if (!showReorderModalRef.current) return;
      setShowReorderModal(false);
    }, [selectedTypeKey]);
	  const budgetedItemCount = (processedData.items || []).filter((c) => (Number(c?.budget) || 0) > 0).length;
	  const [categoryQuery, setCategoryQuery] = useState('');
	  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all' | 'budgeted' | 'unbudgeted' | 'over'

  useEffect(() => {
    if (!isIncomeMode) return;
    if (categoryFilter !== 'all') setCategoryFilter('all');
  }, [isIncomeMode, categoryFilter]);

  const filteredCategories = useMemo(() => {
    const list = Array.isArray(processedData.items) ? processedData.items : [];
    const q = String(categoryQuery || '').trim();
    let out = list;
    if (q) {
      const qLower = q.toLowerCase();
      out = out.filter((c) => String(c?.name || '').toLowerCase().includes(qLower));
    }
    if (isIncomeMode) return out;
    switch (categoryFilter) {
      case 'budgeted':
        out = out.filter((c) => (Number(c?.budget) || 0) > 0);
        break;
      case 'unbudgeted':
        out = out.filter((c) => (Number(c?.budget) || 0) <= 0);
        break;
      case 'over':
        out = out.filter((c) => Boolean(c?.isOverBudget) && (Number(c?.budget) || 0) > 0);
        break;
      case 'all':
      default:
        break;
    }
    return out;
  }, [processedData.items, categoryQuery, categoryFilter, isIncomeMode]);

  const incomeMaxReceived = useMemo(() => {
    if (!isIncomeMode) return 1;
    const list = Array.isArray(filteredCategories) ? filteredCategories : [];
    let max = 0;
    for (const c of list) {
      max = Math.max(max, Number(c?.received) || 0);
    }
    return Math.max(1, max);
  }, [filteredCategories, isIncomeMode]);

  const editingIncomeStats = useMemo(() => {
    const catId = editingCategoryMeta?._id;
    if (!catId) return { received: 0, txCount: 0 };
    let received = 0;
    let txCount = 0;
	    for (const t of transactions || []) {
	      if (!t || t.type !== 'income') continue;
	      if (monthLabelFromDateWithCutoff(t.date, cutoffDay) !== selectedMonth) continue;
	      const catVal = t.category && typeof t.category === 'object' ? t.category?._id : t.category;
	      if (String(catVal || '') !== String(catId)) continue;
	      const amt = Number(t.amount) || 0;
	      if (amt > 0) received += amt;
      txCount += 1;
    }
    return { received, txCount };
	  }, [editingCategoryMeta?._id, transactions, selectedMonth, cutoffDay]);

  const handleClose = () => {
    if (typeof onClose === 'function') onClose();
    else window.history.back();
  };

  const categoryQueryTrimmed = String(categoryQuery || '').trim();

  const renderCategoryCard = (cat) => {
    const actual = isIncomeMode ? (Number(cat?.received) || 0) : (Number(cat?.spent) || 0);
    const budget = Number(cat?.budget) || 0;
    const remaining = budget - actual;
    const pctRaw = budget > 0 ? (actual / budget) * 100 : 0;
    const pct = isIncomeMode ? 100 : (budget > 0 ? Math.round(pctRaw) : 0);
    const progress = isIncomeMode ? 1 : (budget > 0 ? clamp01(actual / budget) : 0);
    const over = !isIncomeMode && budget > 0 && actual > budget;
    const pctText = isIncomeMode ? '100%' : (budget > 0 ? `${Math.max(0, pct)}%` : '—');
    const pctColor = isIncomeMode ? 'text-emerald-200' : over ? 'text-rose-300' : progress >= 0.85 ? 'text-amber-200' : 'text-emerald-200';
	    const barColor = isIncomeMode ? '#34D399' : over ? '#FB7185' : progress >= 0.85 ? '#FACC15' : '#22C55E';
	
	    const statusText = isIncomeMode
	      ? (budget > 0 ? tr('status_has_target') : tr('status_no_target'))
	      : over
	        ? tr('status_over_budget')
	        : budget <= 0
	          ? tr('status_no_budget')
	          : progress >= 0.85
	            ? tr('status_near_full')
	            : '';

    const statusTone = isIncomeMode
      ? (budget > 0 ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200' : 'border-white/10 bg-white/5 text-slate-200')
      : over
        ? 'border-rose-400/25 bg-rose-500/10 text-rose-200'
        : budget <= 0
          ? 'border-white/10 bg-white/5 text-slate-200'
          : progress >= 0.85
            ? 'border-amber-400/25 bg-amber-500/10 text-amber-200'
            : 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200';

    return (
      <div
        key={cat?._id}
        onClick={() => openEditModal(cat)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openEditModal(cat);
          }
        }}
        role="button"
        tabIndex={0}
        className={[
          'w-full rounded-3xl border p-4 text-left shadow-sm shadow-black/10 transition',
          'cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400/25',
          over ? 'border-rose-500/25 bg-[var(--app-surface)]' : 'border-[color:var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-3)]',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="h-12 w-12 rounded-2xl flex items-center justify-center text-xl bg-white/5 ring-1 ring-white/10">
              <CategoryIcon iconKey={cat?.icon} className="w-6 h-6 text-slate-200" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-base font-extrabold text-[color:var(--app-text)]">{cat?.name}</div>
	              <div className="mt-0.5 text-xs font-semibold text-[color:var(--app-muted)]">
	                {isIncomeMode ? (
	                  <>
	                    {budget > 0 ? (
	                      <>
	                        {tr('target')} <span className="text-slate-200">{formatCurrency(budget)}</span>
	                        {' • '}{tr('received')} <span className="text-emerald-200">{formatCurrency(actual)}</span>
	                      </>
	                    ) : (
	                      <>
	                        {tr('received')} <span className="text-emerald-200">{formatCurrency(actual)}</span>
	                      </>
	                    )}
	                  </>
	                ) : (
	                  <>
	                    {tr('expense_card_left', { amount: '' })}{' '}
	                    <span className={remaining < 0 ? 'text-rose-300' : 'text-emerald-200'}>
	                      {formatCurrency(remaining)}
	                    </span>
	                  </>
	                )}
	              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {!isIncomeMode ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditModal(cat);
                  }}
	                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                >
	                  {tr('edit')}
	                </button>
	              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditCategoryMetaModal(cat);
                  }}
	                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-extrabold text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                >
	                  {tr('edit')}
	                </button>
	              )}
            </div>

            <div className="flex flex-col items-end gap-1">
              <div className={`text-sm font-extrabold ${pctColor}`}>{pctText}</div>
              {statusText ? (
                <div className={['rounded-full border px-2 py-0.5 text-[10px] font-extrabold', statusTone].join(' ')}>
                  {statusText}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {((!isIncomeMode && budget > 0) || isIncomeMode) ? (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm font-extrabold text-slate-200">
              <div className="truncate">
                {formatCurrency(actual)} <span className="text-[color:var(--app-muted-2)]">/ {formatCurrency(budget)}</span>
              </div>
            </div>
            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-black/25 ring-1 ring-white/10">
              <div
                className="h-full rounded-full shadow-[0_10px_22px_-14px_rgba(34,197,94,0.8)]"
                style={{
                  width: isIncomeMode ? '100%' : `${Math.min(100, Math.max(0, pct))}%`,
                  backgroundColor: barColor,
                  opacity: 1,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  };

	  const renderAddCategoryCard = ({ spanAll = false } = {}) => (
	    <button
	      type="button"
	      onClick={openAddCategoryModal}
      className={[
        'w-full cursor-pointer rounded-3xl border border-dashed border-white/20 bg-white/0 p-5 text-left',
        'transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-emerald-400/25',
        spanAll ? 'lg:col-span-full' : '',
      ].join(' ')}
	      aria-label={tr('add_category', { type: typeLabel })}
	    >
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-2xl border border-dashed border-white/20 bg-white/5 ring-1 ring-white/10 flex items-center justify-center text-slate-200">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v14m7-7H5" />
          </svg>
        </div>
	        <div className="min-w-0">
	          <div className="text-base font-extrabold text-[color:var(--app-text)]">{tr('add_category', { type: typeLabel })}</div>
	          <div className="mt-1 text-xs font-semibold text-[color:var(--app-muted)]">{tr('tap_to_add_category')}</div>
	        </div>
	      </div>
	    </button>
	  );

  const categorySections = useMemo(() => {
    const list = Array.isArray(filteredCategories) ? filteredCategories : [];
    if (!list.length) return [];

    if (isIncomeMode) {
      const withTarget = list.filter((c) => (Number(c?.budget) || 0) > 0);
      const withoutTarget = list.filter((c) => (Number(c?.budget) || 0) <= 0);
      const out = [];
      if (withTarget.length) out.push({ id: 'income_target', title: tr('income_target_section'), items: withTarget });
      if (withoutTarget.length) out.push({ id: 'income_no_target', title: tr('income_no_target_section'), items: withoutTarget });
      return out.length ? out : [{ id: 'all', title: null, items: list }];
    }

    if (categoryFilter !== 'all' || categoryQueryTrimmed) {
      return [{ id: 'all', title: null, items: list }];
    }

    const over = list.filter((c) => Boolean(c?.isOverBudget) && (Number(c?.budget) || 0) > 0);
    const near = list.filter((c) => {
      const budget = Number(c?.budget) || 0;
      const spent = Number(c?.spent) || 0;
      if (budget <= 0) return false;
      if (spent > budget) return false;
      return spent / Math.max(1, budget) >= 0.85;
    });
    const budgeted = list.filter((c) => {
      const budget = Number(c?.budget) || 0;
      const spent = Number(c?.spent) || 0;
      if (budget <= 0) return false;
      if (spent > budget) return false;
      return spent / Math.max(1, budget) < 0.85;
    });
    const unbudgeted = list.filter((c) => (Number(c?.budget) || 0) <= 0);

    const out = [];
    if (over.length) out.push({ id: 'over', title: tr('filter_over'), items: over });
    if (near.length) out.push({ id: 'near', title: tr('section_near_full'), items: near });
    if (budgeted.length) out.push({ id: 'budgeted', title: tr('filter_budgeted'), items: budgeted });
    if (unbudgeted.length) out.push({ id: 'unbudgeted', title: tr('filter_unbudgeted'), items: unbudgeted });
    return out.length ? out : [{ id: 'all', title: null, items: list }];
  }, [filteredCategories, isIncomeMode, categoryFilter, categoryQueryTrimmed, tr]);

		  return (
		    <div className="fixed inset-0 z-[60] flex h-[100dvh] min-h-0 flex-col overflow-y-auto [-webkit-overflow-scrolling:touch] bg-[var(--app-bg)] text-[color:var(--app-text)] font-sans">
		      {/* Top / Sticky header (removed sticky wrapper) */}
		      <>
		        <div className="mx-auto w-full max-w-lg px-4 pb-4 pt-[calc(env(safe-area-inset-top)+20px)] lg:max-w-6xl lg:px-6">
          {/* Title row */}
		          <div className="relative flex items-center justify-center">
		            <div className="text-center">
		              <div className="text-[11px] font-semibold tracking-wide text-[color:var(--app-muted)]">
	                  {isIncomeMode ? tr('type_income') : tr('title_expense_prefix', { type: typeLabel })}
	                </div>
		              <div className="text-lg font-extrabold text-[color:var(--app-text)]">
	                  {isIncomeMode ? tr('title_income_main') : tr('title_expense_main')}
	                </div>
		            </div>

	          </div>

          {/* Month tabs */}
          {(() => {
            const selectedYear = String((selectedMonth || '').split(' ')[1] || '');
            const yearMonths = months
              .map((label, idx) => ({ label, idx }))
              .filter((x) => String(x.label.split(' ')[1] || '') === selectedYear);
            const tabs = yearMonths.length ? yearMonths : months.map((label, idx) => ({ label, idx }));
            return (
              <div className="mt-4">
                {/* Desktop: calendar-style picker button */}
                <div className="hidden lg:block">
                  <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-2 shadow-sm shadow-black/10">
                    <div className="flex items-center gap-2">
	                      <button
	                        type="button"
	                        onClick={() => setCurrentMonthIndex((p) => Math.max(0, p - 1))}
	                        disabled={currentMonthIndex === 0}
	                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-40"
	                        aria-label={tr('month_prev')}
	                      >
	                        <ChevronLeft className="h-5 w-5" />
	                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const p = parseThaiMonthLabel(selectedMonth);
                          setMonthPickerYear(p?.year || new Date().getFullYear());
                          setShowMonthPicker(true);
	                        }}
	                        className="min-w-0 flex-1 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2 text-center hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
	                        aria-label={tr('open_month_picker')}
	                        aria-expanded={showMonthPicker}
	                      >
	                        <div className="flex items-center justify-center gap-2">
	                          <LayoutGrid className="h-4 w-4 text-[color:var(--app-muted-2)]" aria-hidden="true" />
	                          <div className="truncate text-sm font-extrabold text-[color:var(--app-text)]">{displayMonthLabel(selectedMonth)}</div>
	                        </div>
	                        <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">{tr('tap_to_pick_month')}</div>
	                      </button>

	                      <button
	                        type="button"
	                        onClick={() => setCurrentMonthIndex((p) => Math.min(months.length - 1, p + 1))}
	                        disabled={currentMonthIndex === months.length - 1}
	                        className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-40"
	                        aria-label={tr('month_next')}
	                      >
	                        <ChevronRight className="h-5 w-5" />
	                      </button>
                    </div>
                  </div>
                </div>

	                {/* Mobile/Tablet: scrollable month tabs */}
	                <div className="lg:hidden">
	                  <div className="mb-2 flex items-center justify-between">
	                    <div className="text-xs font-semibold text-[color:var(--app-muted)]">{tr('month')}</div>
	                    <div className="text-xs font-extrabold text-[color:var(--app-text)]">
                        {tr('year_be')} {selectedYear ? (isEn ? (String((Number(selectedYear) || 0) - 543 || selectedYear)) : selectedYear) : '—'}
                      </div>
	                  </div>

                  <div className="relative rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-2 shadow-sm shadow-black/5">
                    <div
                      ref={monthTabsRef}
                      className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-proximity pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none cursor-grab active:cursor-grabbing"
                      onPointerDown={onMonthPointerDown}
                      onPointerMove={onMonthPointerMove}
                      onPointerUp={onMonthPointerUp}
                      onPointerCancel={onMonthPointerUp}
                      onPointerLeave={onMonthPointerUp}
                      onClickCapture={onMonthClickCapture}
                      onWheel={onMonthWheel}
                      onScroll={scheduleUpdateMonthScroll}
                    >
                      {tabs.map(({ label, idx }) => {
                        const monthName = String(label.split(' ')[0] || '');
                        const mIdx = monthIndexFromThaiName(monthName);
                        const short = mIdx >= 0 ? monthShortDisplay[mIdx] : monthName;
                        const active = idx === currentMonthIndex;
                        return (
                          <button
                            key={label}
                            ref={active ? activeMonthRef : null}
                            type="button"
                            onClick={() => setCurrentMonthIndex(idx)}
                            className={[
                              'shrink-0 snap-center px-4 py-2 rounded-2xl text-sm font-extrabold transition',
                              'border ring-1 shadow-sm shadow-black/10 focus:outline-none focus:ring-2',
                              active
                                ? [
                                    'border-emerald-300/60 bg-emerald-500/15 text-emerald-200 ring-emerald-400/25',
                                    'shadow-[0_10px_25px_-18px_rgba(16,185,129,0.9)]',
                                    'focus:ring-emerald-300/40',
                                  ].join(' ')
                                : [
                                    'border-white/10 bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10',
                                    'focus:ring-emerald-400/20',
                                  ].join(' '),
                            ].join(' ')}
                            aria-current={active ? 'date' : undefined}
                            title={label}
                          >
                            {short}
                          </button>
                        );
                      })}
                    </div>

                    {/* Edge fades */}
                    <div
                      className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-3xl"
                      style={{ background: 'linear-gradient(to right, var(--app-surface-2), rgba(0,0,0,0))' }}
                    />
                    <div
                      className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-3xl"
                      style={{ background: 'linear-gradient(to left, var(--app-surface-2), rgba(0,0,0,0))' }}
                    />
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Month Picker Modal (desktop calendar) */}
          {showMonthPicker && (
            <div
              className="fixed inset-0 z-[75] bg-slate-950/45 backdrop-blur-sm flex items-start justify-center p-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+88px)]"
              onClick={(e) => e.target === e.currentTarget && setShowMonthPicker(false)}
            >
              <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-black/40">
	                <div className="flex items-center justify-between gap-3 border-b border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-5 py-4">
	                  <div>
	                    <div className="text-sm font-extrabold text-[color:var(--app-text)]">{tr('pick_month')}</div>
	                    <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{tr('month_picker_hint')}</div>
	                  </div>
	                  <button
	                    type="button"
	                    onClick={() => setShowMonthPicker(false)}
	                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
	                    aria-label={tr('close')}
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
	                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-40"
	                      aria-label={tr('prev_year')}
	                    >
	                      <ChevronLeft className="h-5 w-5" />
	                    </button>

                    <div className="min-w-0 flex-1 text-center">
	                      <div className="text-sm font-extrabold text-[color:var(--app-text)]">
	                        {isEn ? Number(monthPickerYear) : (Number(monthPickerYear) + 543)}
	                      </div>
	                      <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">{tr('year_be')}</div>
	                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const idx = availableYears.indexOf(monthPickerYear);
                        const prev = idx > 0 ? availableYears[idx - 1] : null;
                        if (typeof prev === 'number') setMonthPickerYear(prev);
                      }}
	                      disabled={availableYears.indexOf(monthPickerYear) <= 0}
	                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-40"
	                      aria-label={tr('next_year')}
	                    >
	                      <ChevronRight className="h-5 w-5" />
	                    </button>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {monthPickerMonthsForYear.map((m) => {
                      const isActive = typeof m.idx === 'number' && m.idx === currentMonthIndex;
                      const disabled = m.idx == null;
                      return (
                        <button
                          key={`${monthPickerYear}-${m.monthIndex}`}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (typeof m.idx === 'number') setCurrentMonthIndex(m.idx);
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
	                      setCurrentMonthIndex(getCurrentCycleMonthIndex());
	                      setShowMonthPicker(false);
	                    }}
	                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-extrabold text-slate-100 hover:bg-white/10"
	                  >
	                    {tr('this_month')}
	                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMonthPicker(false)}
                    className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:brightness-95"
                  >
	                    {tr('done')}
	                  </button>
                </div>
              </div>
            </div>
	          )}

		          <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3 shadow-sm shadow-black/10">
		            <div className="flex items-start justify-between gap-3">
		              <div className="min-w-0">
		                <div className="text-[11px] font-extrabold tracking-wide text-[color:var(--app-muted-2)]">{tr('cycle')}</div>
		                <div className="mt-0.5 text-xs font-extrabold text-[color:var(--app-text)]">
		                  {cutoffDay > 0 ? tr('cycle_every_day', { day: cutoffDay }) : tr('cycle_calendar')}
		                </div>
		                {(() => {
		                  const range = cycleRangeForMonthLabel(selectedMonth, cutoffDay);
		                  if (!range?.start || !range?.end) return null;
		                  return (
		                    <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted)] truncate">
		                      {tr('cycle_range', { start: formatThaiDateShort(range.start), end: formatThaiDateShort(range.end) })}
		                    </div>
		                  );
		                })()}
		              </div>
		              <button
		                type="button"
		                onClick={openSettings}
		                className="shrink-0 inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-extrabold text-slate-100 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
		              >
		                {tr('settings')}
		              </button>
		            </div>
		          </div>

			          {/* Summary card */}
			          <div className="mt-4 relative overflow-hidden rounded-[28px] border border-emerald-400/20 bg-gradient-to-br from-emerald-400 via-emerald-400 to-green-500 text-slate-950 shadow-[0_20px_60px_-40px_rgba(16,185,129,0.85)]">
				            <div className="absolute inset-0 opacity-25 [background:radial-gradient(800px_circle_at_10%_20%,rgba(255,255,255,0.6),transparent_45%),radial-gradient(700px_circle_at_70%_80%,rgba(0,0,0,0.2),transparent_55%)]" />
				            <div className="relative p-5">
	                {isIncomeMode ? (() => {
	                  const actual = Number(headlineSummary.incomeActualTotal) || 0;
	                  const target = Number(headlineSummary.incomeBudgetTotal) || 0;
	                  const hasTarget = target > 0;
	                  const catCount = Array.isArray(processedData?.items) ? processedData.items.length : 0;
	                  // UX: show the 1–100% bar for income, but keep it full (100%) always.
	                  const pctUi = 100;
	                  const pctClampedUi = 100;
	                  const diff = target - actual;

	                  return (
	                    <>
	                      <div className="text-sm font-extrabold">{hasTarget ? tr('summary_income_received') : tr('summary_income_total')}</div>
	                      <div className="mt-1 text-4xl font-extrabold tracking-tight">
	                        {formatCurrency(actual)}
	                      </div>
	
	                      <div className="mt-4 flex items-center justify-between text-sm font-extrabold">
	                        <div>
	                          {tr('summary_received_pct', { pct: pctUi })}
	                        </div>
	                        <div>
	                          {hasTarget
	                            ? diff >= 0
	                              ? tr('summary_remaining', { amount: formatCurrency(diff) })
	                              : tr('summary_over', { amount: formatCurrency(Math.abs(diff)) })
	                            : tr('summary_income_categories', { count: catCount })}
	                        </div>
	                      </div>

                      <div className="mt-2 h-3 w-full rounded-full bg-black/15 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-white shadow-[0_10px_25px_-10px_rgba(255,255,255,0.95)]"
                          style={{ width: `${pctClampedUi}%` }}
                        />
                      </div>

                      
                    </>
                  );
                })() : (
	                  <>
	                    <div className="text-sm font-extrabold">
	                      {headlineSummary.baseMode !== 'expense_budget' ? tr('summary_remaining_from_income') : tr('summary_remaining_total_budget')}
	                    </div>
	                    <div className="mt-1 text-4xl font-extrabold tracking-tight">
	                      {formatCurrency(headlineSummary.remaining)}
	                    </div>
	
	                    <div className="mt-4 flex items-center justify-between text-sm font-extrabold">
	                      <div>{tr('summary_spent_pct', { pct: headlineSummary.spentPct })}</div>
	                      <div>{tr('summary_left', { amount: formatCurrency(headlineSummary.remaining) })}</div>
	                    </div>

                    <div className="mt-2 h-3 w-full rounded-full bg-black/15 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-white shadow-[0_10px_25px_-10px_rgba(255,255,255,0.95)]"
                        style={{ width: `${headlineSummary.spentPctClamped}%` }}
                      />
                    </div>

	                    <div className="mt-3 text-sm font-semibold text-slate-950/80">
	                      {(() => {
	                        const sourceKey =
	                          headlineSummary.baseMode === 'income_actual'
	                            ? 'source_income_actual'
	                            : headlineSummary.baseMode === 'income_budget'
	                              ? 'source_income_budget'
	                              : 'source_expense_budget';
	                        return tr('summary_from_source', { source: tr(sourceKey), amount: formatCurrency(headlineSummary.baseTotal) });
	                      })()}
	                    </div>
	                  </>
	                )}
	            </div>
	          </div>

          {/* Type toggle + sort */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="flex rounded-2xl border border-white/10 bg-white/5 p-1 shadow-sm shadow-black/10">
              <button
                type="button"
                onClick={() => setSelectedType('expense')}
                className={[
                  'px-4 py-2 text-sm font-extrabold rounded-2xl transition',
                  selectedType === 'expense'
                    ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25'
                    : 'text-slate-300 hover:text-slate-100',
                ].join(' ')}
	              >
	                {tr('type_expense')}
	              </button>
              <button
                type="button"
                onClick={() => setSelectedType('income')}
                className={[
                  'px-4 py-2 text-sm font-extrabold rounded-2xl transition',
                  selectedType === 'income'
                    ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25'
                    : 'text-slate-300 hover:text-slate-100',
                ].join(' ')}
	              >
	                {tr('type_income')}
	              </button>
            </div>

	            <div className="flex items-center gap-2">
	              <div className="relative">
				                <button
				                  type="button"
				                  onClick={() => setIsSortOpen(v => !v)}
				                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-extrabold text-slate-200 shadow-sm shadow-black/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
				                  aria-haspopup="menu"
				                  aria-expanded={isSortOpen}
				                >
	                  <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
	                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h16"/>
	                  </svg>
                    {sortLabel}
					              </button>

                  {isSortOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsSortOpen(false)} />
		                      <div className="absolute right-0 mt-2 z-40 w-56 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-1 shadow-xl shadow-black/20">
				                      {(!isIncomeMode
			                        ? [
			                            { key: 'budget_desc', label: tr('sort_budget_desc_expense') },
			                            { key: 'budget_asc', label: tr('sort_budget_asc_expense') },
			                            { key: 'spent_desc', label: tr('sort_spent_desc') },
			                            { key: 'remaining_desc', label: tr('sort_remaining_desc') },
		                            { key: 'name_asc', label: tr('sort_name_asc') },
		                            { key: 'name_desc', label: tr('sort_name_desc') },
		                          ]
		                        : [
		                            { key: 'budget_desc', label: tr('sort_received_desc') },
		                            { key: 'budget_asc', label: tr('sort_received_asc') },
		                            { key: 'name_asc', label: tr('sort_name_asc') },
		                            { key: 'name_desc', label: tr('sort_name_desc') },
		                          ]
			                      ).map((opt) => (
				                        <button
				                          key={opt.key}
				                          type="button"
                          onClick={() => {
                            setSortBy(opt.key);
                            setIsSortOpen(false);
                          }}
		                          className={`w-full rounded-xl px-3 py-2 text-left text-sm font-semibold flex items-center justify-between hover:bg-white/5 ${(!isIncomeMode ? sortBy : sortKeyForUI) === opt.key ? 'bg-white/5' : ''}`}
		                          role="menuitem"
		                        >
		                          <span className="text-slate-100">{opt.label}</span>
		                          {((!isIncomeMode ? sortBy : sortKeyForUI) === opt.key) && (
		                            <svg className="h-4 w-4 text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
		                            </svg>
			                          )}
			                        </button>
			                      ))}
		                    </div>
                    </>
                  )}
	              </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSortOpen(false);
                    setSortBy('custom');
                    openReorderCategoriesModal();
                  }}
	                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 shadow-sm shadow-black/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                  aria-label={tr('custom_reorder_aria')}
	                  title={tr('custom_reorder_title')}
	                >
	                  <GripVertical className="h-5 w-5" aria-hidden="true" />
	                </button>
	            </div>
            </div>

	              {!isIncomeMode && (headlineSummary.incomeActualTotal > 0 || headlineSummary.incomeBudgetTotal > 0 || headlineSummary.expenseBudgetTotal > 0) && (
	                <div className="mt-3 text-[11px] font-semibold text-[color:var(--app-muted)]">
	                  {(() => {
	                    const label =
	                      headlineSummary.baseMode === 'income_actual'
	                        ? tr('source_income_actual')
	                        : headlineSummary.baseMode === 'income_budget'
	                          ? tr('source_income_budget')
	                          : tr('expense_budget_total_label');
	                    return `${label}: `;
	                  })()}
	                  <span className="font-extrabold text-slate-200">
	                    {formatCurrency(
	                      headlineSummary.baseMode === 'income_actual'
                        ? headlineSummary.incomeActualTotal
                        : headlineSummary.baseMode === 'income_budget'
                          ? headlineSummary.incomeBudgetTotal
                          : headlineSummary.expenseBudgetTotal
                    )}
                  </span>
                </div>
              )}
	        </div>
	      </>

      {/* Settings Modal */}
      {mounted && isSettingsOpen && createPortal((
        <div
          className="fixed inset-0 z-[52] flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setIsSettingsOpen(false)}
        >
          <div
            className="bg-[var(--app-surface)] w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/40 animate-slideUp border border-[color:var(--app-border)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-500 to-green-500 text-slate-950 px-5 pb-4 pt-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -mr-14 -mt-14" aria-hidden="true" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" aria-hidden="true" />

              <div className="relative">
	                <button
	                  type="button"
	                  onClick={() => setIsSettingsOpen(false)}
	                  className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 hover:bg-white/25 transition"
	                  aria-label={tr('close')}
	                  title={tr('close')}
	                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

	                <div className="mx-auto max-w-[70%] text-center">
	                  <div className="text-[11px] font-extrabold tracking-wide text-slate-950/70">{tr('settings_title')}</div>
	                  <div className="mt-1 truncate text-lg font-extrabold">{tr('settings_budget')}</div>
	                </div>
              </div>
            </div>

            <div className="p-5">
              {(() => {
                const selectedLabel = months[tempMonthIndex] || '';
                const selectedYear = String((selectedLabel || '').split(' ')[1] || '');
                const yearMonths = months
                  .map((label, idx) => ({ label, idx }))
                  .filter((x) => String(x.label.split(' ')[1] || '') === selectedYear);
                const tabs = yearMonths.length ? yearMonths : months.map((label, idx) => ({ label, idx }));
                return (
                  <div>
	                    <div className="flex items-center justify-between">
	                      <div className="text-xs font-semibold text-[color:var(--app-muted)]">{tr('month_to_set_budget')}</div>
	                      <div className="text-xs font-extrabold text-[color:var(--app-text)]">
                          {tr('year_be')} {selectedYear ? (isEn ? (String((Number(selectedYear) || 0) - 543 || selectedYear)) : selectedYear) : '—'}
                        </div>
	                    </div>

                    <div className="mt-2 relative rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-2 shadow-sm shadow-black/5">
                      <div className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-proximity pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden select-none">
                        {tabs.map(({ label, idx }) => {
                          const monthName = String(label.split(' ')[0] || '');
                          const mIdx = monthIndexFromThaiName(monthName);
                          const short = mIdx >= 0 ? monthShortDisplay[mIdx] : monthName;
                          const active = idx === tempMonthIndex;
                          return (
                            <button
                              key={label}
                              type="button"
                              onClick={() => setTempMonthIndex(idx)}
                              className={[
                                'shrink-0 snap-center px-4 py-2 rounded-2xl text-sm font-extrabold transition',
                                'border ring-1 shadow-sm shadow-black/10 focus:outline-none focus:ring-2',
                                active
                                  ? [
                                      'border-emerald-300/60 bg-emerald-500/15 text-emerald-200 ring-emerald-400/25',
                                      'shadow-[0_10px_25px_-18px_rgba(16,185,129,0.9)]',
                                      'focus:ring-emerald-300/40',
                                    ].join(' ')
                                  : [
                                      'border-white/10 bg-white/5 text-slate-300 ring-white/10 hover:bg-white/10',
                                      'focus:ring-emerald-400/20',
                                    ].join(' '),
                              ].join(' ')}
                              aria-current={active ? 'date' : undefined}
                              title={label}
                            >
                              {short}
                            </button>
                          );
                        })}
                      </div>

                      <div
                        className="pointer-events-none absolute inset-y-0 left-0 w-8 rounded-l-3xl"
                        style={{ background: 'linear-gradient(to right, var(--app-surface-2), rgba(0,0,0,0))' }}
                      />
                      <div
                        className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-3xl"
                        style={{ background: 'linear-gradient(to left, var(--app-surface-2), rgba(0,0,0,0))' }}
                      />
                    </div>

	                    <div className="mt-2 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
	                      {tr('choose_month_hint')}
	                    </div>
                  </div>
                );
              })()}

	              <div className="mt-3 flex gap-2">
	                <button
	                  type="button"
	                  disabled={tempMonthIndex <= 0}
	                  onClick={() => setTempMonthIndex(v => Math.max(0, v - 1))}
                  className="flex-1 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-sm font-extrabold text-slate-100 disabled:opacity-40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                >
                  {tr('month_prev')}
                </button>
                <button
                  type="button"
                  disabled={tempMonthIndex >= months.length - 1}
	                  onClick={() => setTempMonthIndex(v => Math.min(months.length - 1, v + 1))}
	                  className="flex-1 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-sm font-extrabold text-slate-100 disabled:opacity-40 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                >
		                  {tr('month_next')}
		                </button>
	              </div>

		              <div className="mt-4 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4 shadow-sm shadow-black/5">
		                <div className="flex items-start justify-between gap-3">
		                  <div className="min-w-0">
		                    <div className="text-sm font-extrabold text-[color:var(--app-text)]">{tr('cycle')}</div>
		                    <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
		                      {tr('cycle_desc')}
		                    </div>
		                  </div>
		                  <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
		                    <div className="text-[10px] font-extrabold text-[color:var(--app-muted-2)]">{tr('mode')}</div>
		                    <div className="text-[11px] font-extrabold text-slate-100">
		                      {cutoffDay > 0 ? tr('cycle_every_day', { day: cutoffDay }) : tr('calendar_mode')}
		                    </div>
		                  </div>
		                </div>

	                <div className="mt-3 grid grid-cols-2 gap-2">
	                  <button
	                    type="button"
	                    onClick={() => setCutoffDay(0)}
	                    className={[
	                      'h-11 rounded-2xl border px-3 text-xs font-extrabold transition',
	                      'focus:outline-none focus:ring-2 focus:ring-emerald-400/25',
	                      cutoffDay <= 0
	                        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
	                        : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10',
	                    ].join(' ')}
		                  >
		                    {tr('cycle_calendar')}
		                  </button>
	                  <button
	                    type="button"
	                    onClick={() => setCutoffDay((prev) => (Number(prev) > 0 ? prev : 25))}
	                    className={[
	                      'h-11 rounded-2xl border px-3 text-xs font-extrabold transition',
	                      'focus:outline-none focus:ring-2 focus:ring-emerald-400/25',
	                      cutoffDay > 0
	                        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
	                        : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10',
	                    ].join(' ')}
		                  >
		                    {tr('set_cutoff')}
		                  </button>
	                </div>

	                {cutoffDay > 0 ? (
	                  <div className="mt-3">
		                    <div className="flex items-center justify-between gap-3">
		                      <div className="text-[11px] font-semibold text-[color:var(--app-muted-2)]">{tr('cutoff_day')}</div>
		                      <div className="text-xs font-extrabold text-slate-100">{tr('day_number', { day: cutoffDay })}</div>
		                    </div>
	                    <input
	                      type="range"
	                      min={1}
	                      max={31}
	                      value={cutoffDay}
		                      onChange={(e) => setCutoffDay(Math.max(1, Math.min(31, Number(e.target.value) || 1)))}
		                      className="mt-2 w-full accent-emerald-400"
		                      aria-label={tr('select_cutoff_day')}
		                    />
	                    <div className="mt-2 flex flex-wrap gap-2">
	                      {[20, 25, 28, 30, 31].map((d) => (
	                        <button
	                          key={`cutoff-${d}`}
	                          type="button"
	                          onClick={() => setCutoffDay(d)}
	                          className={[
	                            'rounded-2xl border px-3 py-2 text-[11px] font-extrabold transition',
	                            'focus:outline-none focus:ring-2 focus:ring-emerald-400/25',
	                            cutoffDay === d
	                              ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200'
	                              : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10',
	                          ].join(' ')}
	                        >
	                          {d}
	                        </button>
	                      ))}
	                    </div>
	                  </div>
	                ) : null}

	                {(() => {
	                  const label = months[tempMonthIndex] || selectedMonth;
	                  const range = cycleRangeForMonthLabel(label, cutoffDay);
	                  if (!range?.start || !range?.end) return null;
		                  return (
		                    <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-[color:var(--app-muted)]">
		                      {tr('cycle_for_month', { month: displayMonthLabel(label), start: formatThaiDateShort(range.start), end: formatThaiDateShort(range.end) })}
		                    </div>
		                  );
		                })()}
	              </div>

	              <div className="mt-5 flex gap-3">
	              <button
	                type="button"
		                onClick={() => setIsSettingsOpen(false)}
		                className="flex-1 py-3 rounded-2xl border border-white/10 font-extrabold text-slate-100 bg-white/5 hover:bg-white/10"
              >
                {tr('cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCurrentMonthIndex(tempMonthIndex);
                  setIsSettingsOpen(false);
                }}
	                className="flex-1 py-3 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20 hover:brightness-95"
              >
                {tr('save')}
              </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Reorder Categories Modal */}
      {mounted && showReorderModal && createPortal((
        <div
          className="fixed inset-0 z-[92] flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setShowReorderModal(false)}
        >
	          <div
	            className="bg-[var(--app-surface)] w-full max-w-none sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/40 animate-slideUp overflow-hidden border border-[color:var(--app-border)] flex flex-col max-h-[92dvh]"
	            onClick={(e) => e.stopPropagation()}
	            role="dialog"
	            aria-modal="true"
	            aria-label={tr('reorder_title', { type: typeLabel })}
	          >
            <div className="relative border-b border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] sm:pt-4">
	              <button
	                type="button"
	                onClick={() => setShowReorderModal(false)}
	                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]"
	                aria-label={tr('close')}
	                title={tr('close')}
	              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>

	              <div className="pr-12">
	                <div className="text-[11px] font-extrabold tracking-wide text-[color:var(--app-muted-2)]">{tr('sort_custom')}</div>
	                <div className="mt-0.5 text-lg font-extrabold text-[color:var(--app-text)]">{tr('reorder_title', { type: typeLabel })}</div>
	                <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted)]">
	                  {tr('reorder_desc')}
	                </div>
	              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] p-4 space-y-2">
              {reorderDraftIds
                .map((id) => ({ id, cat: categoryById.get(String(id)) }))
                .filter((x) => x.cat)
                .map(({ id, cat }, idx) => {
                  const name = String(cat?.name || '');
                  const icon = String(cat?.icon || 'other');
                  const disabledUp = idx <= 0;
                  const disabledDown = idx >= reorderDraftIds.length - 1;
                  return (
                    <div
                      key={`reorder-${id}`}
                      draggable
                      onDragStart={(e) => {
                        reorderDragIdRef.current = String(id);
                        try {
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', String(id));
                        } catch {
                          // ignore
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        try { e.dataTransfer.dropEffect = 'move'; } catch {}
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const fromId = reorderDragIdRef.current || '';
                        const fromIdx = fromId ? reorderDraftIds.findIndex((x) => String(x) === String(fromId)) : -1;
                        if (fromIdx < 0) return;
                        moveReorderDraft(fromIdx, idx);
	                      }}
	                      className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-3 shadow-sm shadow-black/10"
	                      aria-label={tr('category_item_aria', { name })}
	                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 text-slate-200 shrink-0">
                            <CategoryIcon iconKey={icon} className="h-5 w-5" />
                          </div>
	                          <div className="min-w-0">
	                            <div className="truncate text-sm font-extrabold text-[color:var(--app-text)]">{name}</div>
	                            <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted-2)]">{tr('order_number', { n: idx + 1 })}</div>
	                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200">
                            <GripVertical className="h-5 w-5" aria-hidden="true" />
                          </div>
                          <button
                            type="button"
                            onClick={() => moveReorderDraft(idx, idx - 1)}
	                            disabled={disabledUp}
	                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-40"
	                            aria-label={tr('move_up')}
	                            title={tr('up')}
	                          >
                            <ArrowUp className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveReorderDraft(idx, idx + 1)}
	                            disabled={disabledDown}
	                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 disabled:opacity-40"
	                            aria-label={tr('move_down')}
	                            title={tr('down')}
	                          >
                            <ArrowDown className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

	              {reorderDraftIds.length === 0 ? (
	                <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center text-sm font-semibold text-slate-400">
	                  {tr('no_reorder_items')}
	                </div>
	              ) : null}
            </div>

            <div className="border-t border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const list = (categories || [])
                      .filter((c) => (c?.type === 'income' ? 'income' : 'expense') === selectedTypeKey)
                      .slice()
                      .sort((a, b) => collatorTH.compare(String(a?.name || ''), String(b?.name || '')))
                      .map((c) => String(c?._id || ''))
                      .filter(Boolean);
                    setReorderDraftIds(list);
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-slate-100 hover:bg-white/10"
	                >
	                  {tr('reset_by_name')}
	                </button>

                <div className="flex items-center gap-2">
	                  <button
	                    type="button"
	                    onClick={() => setShowReorderModal(false)}
	                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-slate-100 hover:bg-white/10"
	                  >
	                    {tr('cancel')}
	                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryOrder((prev) => ({ ...(prev || {}), [selectedTypeKey]: reorderDraftIds }));
                      setSortBy('custom');
                      setShowReorderModal(false);
                      showToast('success', tr('reorder_saved'));
                    }}
	                    className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 hover:brightness-95"
	                  >
	                    {tr('save')}
	                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Category list */}
      <div>
        <div className="mx-auto w-full max-w-lg p-4 lg:max-w-6xl lg:px-6">
        

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-sm shadow-black/10">
                <div className="flex h-full items-center gap-4 px-4">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 ring-1 ring-white/10" />
                  <div className="flex-1">
                    <div className="h-3 w-2/3 rounded bg-white/10" />
                    <div className="mt-2 h-2 w-1/2 rounded bg-white/10" />
                  </div>
                  <div className="h-3 w-16 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : (
	          processedData.items.length === 0 ? (
	            <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-8 text-center shadow-sm shadow-black/10">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10 text-2xl">
                🗂️
              </div>
	              <div className="text-base font-extrabold text-[color:var(--app-text)]">{tr('empty_title', { type: typeLabel })}</div>
	              <div className="mt-1 text-sm font-semibold text-[color:var(--app-muted)]">{tr('empty_desc')}</div>
	              <div className="mt-5 flex justify-center">
	                <button
	                  type="button"
	                  onClick={openAddCategoryModal}
	                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                >
	                  <Plus className="h-5 w-5" aria-hidden="true" />
		                  {tr('add_category', { type: typeLabel })}
		                </button>
		              </div>
		            </div>
	          ) : (
	            <div className="space-y-3 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
                <div className="space-y-3 lg:col-span-4 lg:sticky lg:top-4 lg:self-start">
                  {/* Filter */}
                  <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-3 shadow-sm shadow-black/10">
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--app-muted-2)]">
                        <Search className="h-5 w-5" aria-hidden="true" />
                      </div>
	                      <input
	                        value={categoryQuery}
	                        onChange={(e) => setCategoryQuery(e.target.value)}
	                        placeholder={tr('search_placeholder')}
	                        className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 pl-10 pr-10 text-sm font-extrabold text-[color:var(--app-text)] placeholder-[color:var(--app-muted-2)] shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                      />
                      {String(categoryQuery || '').trim() ? (
                        <button
                          type="button"
	                          onClick={() => setCategoryQuery('')}
	                          className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                          aria-label={tr('clear_search')}
	                          title={tr('clear')}
	                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>

                    {!isIncomeMode ? (
                      <>
	                        <div className="mt-3 flex flex-wrap gap-2">
	                          {[
	                            { key: 'all', label: tr('filter_all') },
	                            { key: 'budgeted', label: tr('filter_budgeted') },
	                            { key: 'unbudgeted', label: tr('filter_unbudgeted') },
	                            { key: 'over', label: tr('filter_over') },
	                          ].map((opt) => {
                            const active = categoryFilter === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                onClick={() => setCategoryFilter(opt.key)}
                                className={[
                                  'rounded-2xl px-3 py-2 text-xs font-extrabold transition border ring-1 shadow-sm shadow-black/10 focus:outline-none focus:ring-2',
                                  active
                                    ? 'border-emerald-300/60 bg-emerald-500/15 text-emerald-200 ring-emerald-400/25 focus:ring-emerald-300/30'
                                    : 'border-white/10 bg-white/5 text-slate-200 ring-white/10 hover:bg-white/10 focus:ring-emerald-400/20',
                                ].join(' ')}
                              >
                                {opt.label}
                              </button>
                            );
                          })}
                        </div>

	                        <div className="mt-2 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
	                          {budgetedItemCount > 0 ? tr('budgeted_count', { count: budgetedItemCount }) : tr('no_budgeted_yet')}
	                        </div>
	                      </>
	                    ) : (
	                      <div className="mt-2 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
	                        {tr('income_tip')}
	                      </div>
	                    )}
                  </div>

                  <button
                    type="button"
                    onClick={openAddCategoryModal}
                    className="hidden lg:inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                  >
	                    <Plus className="h-5 w-5" aria-hidden="true" />
	                    {tr('add_category', { type: typeLabel })}
	                  </button>
                </div>

                <div className="space-y-3 lg:col-span-8">
	                  {filteredCategories.length === 0 ? (
	                    <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-6 text-center shadow-sm shadow-black/10">
                      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-3xl bg-white/5 ring-1 ring-white/10 text-xl">
                        🔎
                      </div>
	                      <div className="text-sm font-extrabold text-[color:var(--app-text)]">{tr('no_match_title')}</div>
	                      <div className="mt-1 text-xs font-semibold text-[color:var(--app-muted)]">{tr('no_match_desc')}</div>
	                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryQuery('');
                            setCategoryFilter('all');
                          }}
	                          className="flex-1 py-2.5 rounded-2xl border border-white/10 bg-white/5 text-xs font-extrabold text-slate-100 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                        >
	                          {tr('clear_filters')}
	                        </button>
                        <button
                          type="button"
                          onClick={openAddCategoryModal}
	                          className="flex-1 py-2.5 rounded-2xl bg-emerald-500 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                        >
	                          {tr('add_category_short')}
	                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {categorySections.map((section) => (
                        <div key={section.id} className="space-y-3">
                          {section.title ? (
                            <div className="flex items-end justify-between gap-3">
                              <div className="text-sm font-extrabold text-[color:var(--app-text)]">{section.title}</div>
	                              <div className="text-[11px] font-extrabold text-[color:var(--app-muted-2)]">
	                                {tr('category_count', { count: section.items.length })}
	                              </div>
                            </div>
                          ) : null}

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3">
                            {section.items.map(renderCategoryCard)}
                          </div>
                        </div>
                      ))}

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-3">
                        {renderAddCategoryCard({ spanAll: true })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
	          )
	        )}

        <div className="h-24" />
        </div>
      </div>

      {/* Add Category Modal */}
      {mounted && showAddModal && createPortal((
        <div
          className="fixed inset-0 z-[90] flex items-stretch sm:items-center justify-center bg-slate-950/45 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && closeAddCategoryModal()}
        >
	          <div
	            className="bg-[var(--app-surface)] w-full max-w-none rounded-none sm:max-w-md sm:rounded-3xl shadow-2xl shadow-black/40 animate-slideUp overflow-hidden border border-[color:var(--app-border)] flex flex-col h-[100dvh] sm:h-auto sm:max-h-[85dvh]"
	            onClick={(e) => e.stopPropagation()}
	            role="dialog"
	            aria-modal="true"
	          >
            <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-500 to-green-500 text-slate-950 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -mr-14 -mt-14" aria-hidden="true" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" aria-hidden="true" />

              <div className="relative">
                <button
	                  type="button"
	                  onClick={closeAddCategoryModal}
	                  className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 hover:bg-white/25 transition"
	                  aria-label={tr('close')}
	                  title={tr('close')}
	                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

	                <div className="mx-auto max-w-[78%] text-center">
	                  <div className="text-[11px] font-extrabold tracking-wide text-slate-950/70">{tr('add_modal_title', { type: typeLabel })}</div>
	                  <h3 className="mt-1 truncate text-lg font-extrabold">{tr('create_new_category')}</h3>
	                  <p className="mt-1 text-xs font-semibold text-slate-950/70">{tr('add_modal_desc')}</p>
	                </div>
              </div>
            </div>

		            <form onSubmit={async (e) => {
		              e.preventDefault();
		              const token = localStorage.getItem('token');
		              if (!token) { showToast('warning', tr('login_required')); return; }
		              try {
                setAddCategoryLoading(true);
                const res = await fetch(`${API_BASE}/api/categories`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ name: newCategoryName, icon: newCategoryIcon || 'other', type: selectedType })
                });
	                if (!res.ok) {
	                  const text = await res.text();
	                  throw new Error(text || (isEn ? 'Failed to create category' : 'ไม่สามารถสร้างหมวดได้'));
	                }
                let created = null;
                try {
                  created = await res.json();
                } catch {
                  created = null;
                }

                if (created && created._id) {
                  setCategories(prev => {
                    const list = Array.isArray(prev) ? prev : [];
                    if (list.some(c => c && c._id === created._id)) return list;
                    return [...list, created];
                  });

                  // Optional: add an income transaction right after creating an income category.
                  const amountNum = Number(newIncomeAmount);
                  if (selectedType === 'income' && Number.isFinite(amountNum) && amountNum > 0) {
                    try {
                      const txnRes = await fetch(`${API_BASE}/api/transactions`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({
                          amount: amountNum,
                          type: 'income',
                          category: created._id,
                          date: dateStringForSelectedMonthWithCutoff(selectedMonth, cutoffDay),
                          notes: String(newIncomeNote || '').trim() || String(created?.name || ''),
                        }),
                      });
                      if (txnRes.ok) {
                        const txn = await txnRes.json();
                        setTransactions((prevT) => {
                          const listT = Array.isArray(prevT) ? prevT : [];
                          return [...listT, txn];
                        });
                      }
                    } catch {
                      // ignore (category creation succeeded)
                    }
                  }
                } else {
                  const headers = { Authorization: `Bearer ${token}` };
                  const catRes = await fetch(`${API_BASE}/api/categories`, { headers });
                  if (catRes.ok) {
                    const cats = await catRes.json();
                    setCategories(cats);
                  }
                }

                setShowAddModal(false);
                setNewCategoryName('');
                setNewCategoryIcon('');
                setNewIncomeAmount('');
                setNewIncomeNote('');
                showToast('success', tr('category_created'));
              } catch (err) {
                console.error('Create category error', err);
                showToast('error', tr('category_create_failed', { detail: err?.message || (isEn ? 'Error' : 'ข้อผิดพลาด') }));
              } finally {
                setAddCategoryLoading(false);
              }
			            }} className="min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] p-5 pb-[calc(env(safe-area-inset-bottom)+96px)] sm:pb-6">
			              <div>
			                <label className="block text-xs font-semibold text-slate-300 mb-2">{tr('category_name_label', { type: typeLabel })}</label>
			                <div className="relative">
			                  <input
                    className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 py-3 pl-4 pr-11 text-sm font-extrabold text-slate-100 placeholder-slate-500 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
			                    value={newCategoryName}
			                    onChange={(e) => setNewCategoryName(e.target.value)}
			                    required
			                    placeholder={selectedType === 'expense' ? tr('placeholder_expense') : tr('placeholder_income')}
			                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
			                </div>
			                <div className="mt-2 text-[11px] font-semibold text-[color:var(--app-muted-2)]">{tr('name_hint')}</div>
			              </div>

			              {selectedType === 'income' ? (
			                <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/10">
			                  <div className="text-sm font-extrabold text-[color:var(--app-text)]">{tr('income_optional_title')}</div>
			                  <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
			                    {tr('income_optional_desc')}
			                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
			                    <div>
			                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">{tr('amount')}</label>
			                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        className="w-full h-11 rounded-2xl border border-white/10 bg-white/5 px-3 text-sm font-extrabold text-slate-100 placeholder-slate-500 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                        value={newIncomeAmount}
                        onChange={(e) => setNewIncomeAmount(e.target.value)}
                      />
			                      <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
			                        {tr('amount_value')}{' '}<span className="font-extrabold text-slate-200">{formatCurrency(Number(newIncomeAmount) || 0)}</span>
			                      </div>
			                    </div>
                  </div>
                </div>
              ) : null}

			              <div className="mt-5">
			                <div className="text-sm font-extrabold text-[color:var(--app-text)]">{tr('popular_presets')}</div>
			                <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted-2)]">{tr('presets_desc')}</div>

			                <div className="mt-3 grid grid-cols-2 gap-3">
			                  {((popularPresets?.[selectedType] || popularPresets?.expense) || []).map((p) => {
			                    const selected = (newCategoryName || '').trim() === p.name && (newCategoryIcon || '').trim() === p.icon;
			                    return (
                      <button
                        key={`${selectedType}-${p.name}`}
                        type="button"
                        onClick={() => {
                          setNewCategoryName(p.name);
                          setNewCategoryIcon(p.icon);
                        }}
                        className={[
                          'flex items-center gap-3 rounded-2xl border px-3 py-3 text-left shadow-sm transition',
                          selected
                            ? 'border-emerald-400/30 bg-emerald-500/10 ring-2 ring-emerald-400/20'
                            : 'border-white/10 bg-white/5 hover:bg-white/10'
                        ].join(' ')}
                      >
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 text-slate-200">
                          <CategoryIcon iconKey={p.icon} className="w-5 h-5" />
                        </div>
		                        <div className="min-w-0">
		                        <div className="truncate text-sm font-extrabold text-[color:var(--app-text)]">{p.name}</div>
		                        <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted-2)]">{tr('tap_to_select')}</div>
		                        </div>
		                      </button>
		                    );
		                  })}
			                </div>
			              </div>

	              <div className="mt-5">
	                <div className="flex items-center justify-between gap-3">
	                  <label className="text-xs font-semibold text-slate-300">{tr('choose_icon')}</label>
	                  {newCategoryIcon?.trim() ? (
	                    <div className="text-[11px] font-semibold text-[color:var(--app-muted-2)]">
	                      {tr('selected')}{' '}
	                      <span className="font-extrabold text-slate-200">{newCategoryIcon}</span>
	                    </div>
	                  ) : (
	                    <div className="text-[11px] font-semibold text-[color:var(--app-muted-2)]">{tr('not_selected')}</div>
	                  )}
	                </div>

                <div className="mt-3 grid grid-cols-6 gap-2">
                  {iconOptions.map((ic) => (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setNewCategoryIcon(ic)}
                      className={[
                        'h-11 w-11 rounded-2xl border shadow-sm flex items-center justify-center transition',
                        'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
                        newCategoryIcon === ic
                          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
	                      ].join(' ')}
	                      aria-label={tr('select_icon_aria', { icon: ic })}
	                    >
	                      <CategoryIcon iconKey={ic} className="w-5 h-5" />
	                    </button>
	                  ))}
                  <button
                    type="button"
                    onClick={() => setNewCategoryIcon('')}
                    className={[
                      'col-span-2 h-11 rounded-2xl border shadow-sm flex items-center justify-center text-sm font-extrabold transition',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
                      newCategoryIcon === ''
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20'
                        : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                    ].join(' ')}
	                  >
	                    {tr('clear')}
	                  </button>
	                </div>
	
	                <div className="mt-3">
	                  <label className="block text-xs font-semibold text-slate-300 mb-2">{tr('custom_icon')}</label>
	                  <input
                    className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm font-extrabold text-slate-100 placeholder-slate-500 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
	                    value={newCategoryIcon}
	                    onChange={(e) => setNewCategoryIcon(e.target.value)}
	                    placeholder={tr('custom_icon_placeholder')}
	                  />
	                </div>
	              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={addCategoryLoading || !newCategoryName.trim()}
	                  className="w-full rounded-2xl bg-emerald-500 py-3.5 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20 hover:brightness-95 disabled:opacity-50"
	                >
	                  <span className="inline-flex items-center justify-center gap-2">
	                    {addCategoryLoading ? tr('saving') : tr('next')}
	                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
	                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
	                    </svg>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ), document.body)}

      {/* Edit Category (name/icon) Modal */}
      {mounted && editingCategoryMeta && createPortal((
        <div
          className="fixed inset-0 z-[89] flex items-stretch sm:items-center justify-center bg-slate-950/45 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && closeEditCategoryMetaModal()}
        >
          <div
            className="bg-[var(--app-surface)] w-full max-w-none rounded-none sm:max-w-md sm:rounded-3xl shadow-2xl shadow-black/40 animate-slideUp overflow-hidden border border-[color:var(--app-border)] flex flex-col h-[100dvh] sm:h-auto sm:max-h-[85dvh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-500 to-green-500 text-slate-950 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -mr-14 -mt-14" aria-hidden="true" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" aria-hidden="true" />

              <div className="relative">
	                <button
	                  type="button"
	                  onClick={closeEditCategoryMetaModal}
	                  className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 hover:bg-white/25 transition"
	                  aria-label={tr('close')}
	                  title={tr('close')}
	                >
	                  <X className="h-5 w-5" aria-hidden="true" />
	                </button>

	                <div className="mx-auto max-w-[78%] text-center">
	                  <div className="text-[11px] font-extrabold tracking-wide text-slate-950/70">{tr('edit_modal_title', { type: typeLabel })}</div>
	                  <h3 className="mt-1 truncate text-lg font-extrabold">{editingCategoryMeta?.name || tr('edit_modal_fallback')}</h3>
	                  <p className="mt-1 text-xs font-semibold text-slate-950/70">{tr('edit_modal_desc')}</p>
	                </div>
              </div>
            </div>

            <form
              onSubmit={handleSaveCategoryMeta}
	              className="min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] p-5 pb-[calc(env(safe-area-inset-bottom)+96px)] sm:pb-6"
	            >
	              <div>
	                <label className="block text-xs font-semibold text-slate-300 mb-2">{tr('category_name_label', { type: typeLabel })}</label>
	                <input
                  className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm font-extrabold text-slate-100 placeholder-slate-500 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
	                  value={editCategoryName}
	                  onChange={(e) => setEditCategoryName(e.target.value)}
	                  required
	                  placeholder={selectedType === 'expense' ? tr('placeholder_expense') : tr('placeholder_income')}
	                />
	              </div>

	              {selectedType === 'income' ? (
	                <div className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-4 shadow-sm shadow-black/10">
	                  {(() => {
                      const receivedNow = Number(editingIncomeStats?.received) || 0;
                      const targetNow = Number(budgets?.[selectedMonth]?.[editingCategoryMeta?._id] || 0) || 0;
	                      const remainingToTarget = targetNow - receivedNow;
	                      const hasTarget = targetNow > 0;
                        // UX: income shows a full 1–100% bar, always at 100%.
	                      const pctUi = 100;
	                      const pctClampedUi = 100;
	                      const addNum = Number(incomeQuickAmount);
	                      const canAdd = Number.isFinite(addNum) && addNum > 0 && !incomeQuickLoading && !editCategoryLoading;

                      const bumpAmount = (delta) => {
                        setIncomeQuickAmount((prev) => {
                          const cur = Number(prev);
                          const next = (Number.isFinite(cur) ? cur : 0) + (Number(delta) || 0);
                          return String(Math.max(0, Math.round(next)));
                        });
                        try {
                          incomeQuickAmountInputRef.current?.focus?.();
                        } catch {
                          // ignore
                        }
                      };

                      return (
                        <>
	                          <div className="flex items-start justify-between gap-3">
	                            <div>
	                              <div className="text-sm font-extrabold text-[color:var(--app-text)]">{tr('add_income_title')}</div>
	                              <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
	                                {tr('add_income_desc', { month: displayMonthLabel(selectedMonth) })}
	                              </div>
	                            </div>
	                            <div className="shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
	                              <div className="text-[10px] font-extrabold text-[color:var(--app-muted-2)]">{tr('received')}</div>
	                              <div className="text-sm font-extrabold text-slate-100">{formatCurrency(receivedNow)}</div>
	                            </div>
	                          </div>

                          <div className="mt-3 rounded-3xl border border-white/10 bg-white/5 p-3">
                            <div className="flex items-center justify-between gap-3">
		                              <div className="text-[11px] font-semibold text-[color:var(--app-muted-2)]">
		                                {hasTarget ? tr('progress_target') : tr('no_target')}
		                              </div>
	                              <div className="text-[11px] font-extrabold text-slate-200">
	                                {`${pctUi}%`}
	                              </div>
	                            </div>
	                            <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-black/25 ring-1 ring-white/10">
	                              <div
	                                className="h-full rounded-full bg-emerald-400 shadow-[0_10px_22px_-14px_rgba(52,211,153,0.9)]"
	                                style={{ width: `${pctClampedUi}%`, opacity: 1 }}
	                              />
	                            </div>
	                            {hasTarget ? (
	                              <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-[color:var(--app-muted-2)]">
	                                <div>{tr('target')}: <span className="font-extrabold text-slate-200">{formatCurrency(targetNow)}</span></div>
	                                <div>
	                                  {remainingToTarget >= 0
	                                    ? <>{tr('remaining_to_target')}{' '}<span className="font-extrabold text-emerald-200">{formatCurrency(remainingToTarget)}</span></>
	                                    : <>{tr('over_target')}{' '}<span className="font-extrabold text-emerald-200">{formatCurrency(Math.abs(remainingToTarget))}</span></>}
	                                </div>
	                              </div>
	                            ) : (
	                              <div className="mt-2 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
	                                {tr('tip_set_target')}
	                              </div>
	                            )}
                          </div>

	                          <div className="mt-3 grid grid-cols-1 gap-2">
	                            <div>
	                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">{tr('add_more')}</label>
                              <div className="relative">
                                <input
                                  ref={incomeQuickAmountInputRef}
                                  type="number"
                                  inputMode="numeric"
                                  min="0"
                                  className="w-full h-11 rounded-2xl border border-white/10 bg-white/5 pl-3 pr-14 text-sm font-extrabold text-slate-100 placeholder-slate-500 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                                  value={incomeQuickAmount}
                                  onChange={(e) => setIncomeQuickAmount(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key !== 'Enter') return;
                                    e.preventDefault();
                                    if (canAdd) handleAddIncomeToCategory();
                                  }}
                                  placeholder="0"
                                />
                                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-extrabold text-[color:var(--app-muted-2)]">
                                  THB
                                </div>
                              </div>
	                              <div className="mt-1 flex items-center justify-between gap-3 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
	                                <div>{tr('to_add')}: <span className="font-extrabold text-slate-200">{formatCurrency(Number(incomeQuickAmount) || 0)}</span></div>
	                                <div>{tr('new_total')}: <span className="font-extrabold text-slate-200">{formatCurrency(receivedNow + (Number(incomeQuickAmount) || 0))}</span></div>
	                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {[100, 500, 1000, 2000, 5000].map((v) => (
                                <button
                                  key={`bump-${v}`}
                                  type="button"
                                  onClick={() => bumpAmount(v)}
                                  disabled={incomeQuickLoading || editCategoryLoading}
                                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-extrabold text-slate-200 hover:bg-white/10 disabled:opacity-50"
                                >
                                  +{formatCurrency(v)}
                                </button>
                              ))}
	                              <button
	                                type="button"
	                                onClick={() => setIncomeQuickAmount('')}
	                                disabled={incomeQuickLoading || editCategoryLoading}
	                                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-extrabold text-slate-100 hover:bg-white/10 disabled:opacity-50"
	                              >
	                                {tr('clear')}
	                              </button>
                            </div>

	                            <div>
	                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">{tr('note_optional')}</label>
	                              <textarea
                                value={incomeQuickNote}
                                onChange={(e) => setIncomeQuickNote(e.target.value)}
                                rows={2}
                                className="w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 placeholder-slate-500 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
	                                placeholder={`${tr('example_prefix')} ${editingCategoryMeta?.name || tr('type_income')}`}
	                              />
	                            </div>
                          </div>

	                          <button
	                            type="button"
	                            onClick={handleAddIncomeToCategory}
	                            disabled={!canAdd}
	                            className="mt-3 w-full rounded-2xl bg-emerald-500 py-3 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20 hover:brightness-95 disabled:opacity-50"
	                          >
	                            {incomeQuickLoading ? tr('adding') : tr('add_income')}
	                          </button>
                        </>
                      );
                    })()}
	                </div>
	              ) : null}

	              <div className="mt-5">
	                <div className="flex items-center justify-between gap-3">
	                  <label className="text-xs font-semibold text-slate-300">{tr('choose_icon')}</label>
	                  {editCategoryIcon?.trim() ? (
	                    <div className="text-[11px] font-semibold text-[color:var(--app-muted-2)]">
	                      {tr('selected')}{' '}
	                      <span className="font-extrabold text-slate-200">{editCategoryIcon}</span>
	                    </div>
	                  ) : (
	                    <div className="text-[11px] font-semibold text-[color:var(--app-muted-2)]">{tr('not_selected')}</div>
	                  )}
	                </div>

                <div className="mt-3 grid grid-cols-6 gap-2">
                  {iconOptions.map((ic) => (
                    <button
                      key={`edit-${ic}`}
                      type="button"
                      onClick={() => setEditCategoryIcon(ic)}
	                      className={[
                        'h-11 w-11 rounded-2xl border shadow-sm flex items-center justify-center transition',
                        'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
                        editCategoryIcon === ic
                          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20'
                          : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
	                      ].join(' ')}
	                      aria-label={tr('select_icon_aria', { icon: ic })}
	                    >
	                      <CategoryIcon iconKey={ic} className="w-5 h-5" />
	                    </button>
	                  ))}
                  <button
                    type="button"
                    onClick={() => setEditCategoryIcon('')}
                    className={[
                      'col-span-2 h-11 rounded-2xl border shadow-sm flex items-center justify-center text-sm font-extrabold transition',
                      'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
                      editCategoryIcon === ''
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20'
                        : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                    ].join(' ')}
	                  >
	                    {tr('clear')}
	                  </button>
	                </div>

	                <div className="mt-3">
	                  <label className="block text-xs font-semibold text-slate-300 mb-2">{tr('custom_icon')}</label>
	                  <input
                    className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 py-3 px-4 text-sm font-extrabold text-slate-100 placeholder-slate-500 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
	                    value={editCategoryIcon}
	                    onChange={(e) => setEditCategoryIcon(e.target.value)}
	                    placeholder={tr('custom_icon_placeholder')}
	                  />
	                </div>
	              </div>

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={closeEditCategoryMetaModal}
                  disabled={editCategoryLoading}
                  className="py-3 rounded-2xl border border-white/10 font-extrabold text-slate-100 bg-white/5 hover:bg-white/10 disabled:opacity-40"
	                >
	                  {tr('cancel')}
	                </button>
                <button
                  type="submit"
                  disabled={editCategoryLoading || !String(editCategoryName || '').trim()}
	                  className="py-3 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20 hover:brightness-95 disabled:opacity-50"
	                >
	                  {editCategoryLoading ? tr('saving') : tr('save')}
	                </button>
	              </div>

              {!isReservedOtherCategoryName(editingCategoryMeta?.name) ? (
                <button
                  type="button"
                  onClick={() => {
                    const cat = editingCategoryMeta;
                    setEditingCategoryMeta(null);
                    openDeleteCategoryModal(cat);
                  }}
                  disabled={editCategoryLoading}
                  className="mt-3 w-full rounded-2xl border border-rose-500/25 bg-rose-500/10 py-3 text-rose-600 font-extrabold hover:bg-rose-500/15 disabled:opacity-40"
                >
                  {tr('delete_this_category')}
                </button>
              ) : null}
            </form>
          </div>
        </div>
      ), document.body)}

      {/* Delete Category Confirm Modal */}
      {mounted && deleteCategory && createPortal((
        <div
          className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-sm p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && closeDeleteCategoryModal()}
        >
	          <div
	            className="bg-[var(--app-surface)] w-full max-w-none sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/40 animate-slideUp overflow-hidden border border-[color:var(--app-border)]"
	            onClick={(e) => e.stopPropagation()}
	            role="dialog"
	            aria-modal="true"
	            aria-label={tr('delete_category')}
	          >
            <div className="relative px-5 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] sm:pt-4 border-b border-[color:var(--app-border)] bg-[var(--app-surface-2)]">
              <button
                type="button"
	                onClick={closeDeleteCategoryModal}
	                disabled={deleteCategoryLoading}
	                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-40"
	                aria-label={tr('close')}
	                title={tr('close')}
	              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-3 pr-12">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-[color:var(--app-danger)] ring-1 ring-rose-400/20">
                  <Trash2 className="h-6 w-6" aria-hidden="true" />
                </div>
	                <div className="min-w-0">
	                  <div className="text-[11px] font-extrabold tracking-wide text-[color:var(--app-muted-2)]">{tr('delete_category')}</div>
	                  <div className="mt-0.5 truncate text-lg font-extrabold text-[color:var(--app-text)]">
	                    {deleteCategory.name}
	                  </div>
                 
                </div>
              </div>
            </div>

	            <div className="p-5 pb-[calc(env(safe-area-inset-bottom)+24px)] sm:pb-5">
	              <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 ring-1 ring-rose-400/10">
	                <div className="text-xs font-extrabold text-[color:var(--app-danger)]">{tr('warning')}</div>
	                <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-text)]">
	                  {tr('delete_irreversible')}
	                </div>
	              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
	                <button
	                  type="button"
	                  onClick={closeDeleteCategoryModal}
	                  disabled={deleteCategoryLoading}
	                  className="py-3 rounded-2xl border border-[color:var(--app-border)] font-extrabold text-[color:var(--app-text)] bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-3)] disabled:opacity-40"
	                >
	                  {tr('cancel')}
	                </button>
                <button
                  type="button"
                  onClick={handleDeleteCategory}
	                  disabled={deleteCategoryLoading}
	                  className="py-3 rounded-2xl bg-rose-500 text-white font-extrabold shadow-lg shadow-rose-500/20 hover:brightness-95 disabled:opacity-50"
	                >
	                  {deleteCategoryLoading ? tr('deleting') : tr('delete_btn')}
	                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* 4. Edit Budget Bottom Sheet / Modal */}
	        {mounted && editingCategory && createPortal((
	        <div
	          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-sm p-0 sm:p-4"
	          onClick={() => setEditingCategory(null)}
	        >
          <div 
            className="bg-[var(--app-surface)] w-full max-w-none sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/40 animate-slideUp overflow-hidden border border-[color:var(--app-border)] flex flex-col max-h-[90dvh] sm:max-h-[85dvh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-500 to-green-500 text-slate-950 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-4 overflow-hidden">
              <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -mr-14 -mt-14" aria-hidden="true" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" aria-hidden="true" />

              <div className="relative">
	                <button
	                  type="button"
	                  onClick={() => setEditingCategory(null)}
	                  className="absolute right-0 top-0 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 hover:bg-white/25 transition"
	                  aria-label={tr('close')}
	                  title={tr('close')}
	                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-center gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25">
                    <CategoryIcon iconKey={editingCategory.icon} className="w-6 h-6 text-slate-950" />
                  </div>
	                  <div className="min-w-0">
	                    <div className="text-[11px] font-extrabold tracking-wide text-slate-950/70">{displayMonthLabel(selectedMonth)}</div>
	                    <h3 className="mt-0.5 truncate text-lg font-extrabold">
	                      {(editingCategory?.type === 'income' ? tr('set_income_target') : tr('set_budget'))}: {editingCategory.name}
	                    </h3>
	                    <div className="mt-0.5 text-xs font-semibold text-slate-950/70">
	                      {editingCategory?.type === 'income' ? tr('adjust_income_target_desc') : tr('adjust_budget_desc')}
	                    </div>
	                  </div>
	                </div>
              </div>
            </div>

            <form onSubmit={handleSaveBudget} className="min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] p-5 pb-[calc(env(safe-area-inset-bottom)+32px)] sm:pb-6">
              {(() => {
	                const editingIsIncome = editingCategory?.type === 'income';
	                const actual = editingIsIncome ? (Number(editingCategory?.received) || 0) : (Number(editingCategory?.spent) || 0);
	                const remaining = Number(editingCategory?.budget || 0) - actual;
	                const remainingColor = editingIsIncome ? 'text-emerald-500' : remaining < 0 ? 'text-rose-500' : 'text-emerald-500';
	                const inputLabel = editingIsIncome ? tr('desired_target_input') : tr('desired_budget_input');
	                return (
	                  <>
	              <div className="grid grid-cols-2 gap-2">
	                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-3 shadow-sm shadow-black/5">
	                  <div className="text-[11px] font-semibold text-[color:var(--app-muted-2)]">{editingIsIncome ? tr('received') : tr('spent')}</div>
	                  <div className="mt-0.5 text-sm font-extrabold text-[color:var(--app-text)]">{formatCurrency(actual)}</div>
	                </div>
	                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-3 shadow-sm shadow-black/5">
	                  <div className="text-[11px] font-semibold text-[color:var(--app-muted-2)]">{editingIsIncome ? tr('remaining_to_target') : tr('remaining')}</div>
	                  <div className={['mt-0.5 text-sm font-extrabold', remainingColor].join(' ')}>
	                    {formatCurrency(remaining)}
	                  </div>
	                </div>
	              </div>

              <div className="mt-5">
                <label className="block text-xs font-semibold text-[color:var(--app-muted)] mb-2">{inputLabel}</label>
                <div className="relative rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-4 py-3 shadow-sm shadow-black/5 focus-within:ring-2 focus-within:ring-emerald-400/25">
                  <input
                    type="number"
                    className="w-full bg-transparent text-3xl font-extrabold text-[color:var(--app-text)] outline-none placeholder-[color:var(--app-muted-2)]"
                    placeholder="0"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    inputMode="numeric"
                    min="0"
                    autoFocus
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-[color:var(--app-muted-2)]">THB</span>
                </div>
              </div>
                  </>
                );
              })()}

              <div className="mt-6 grid grid-cols-2 gap-2">
                <button
                  type="button"
	                  onClick={() => setEditingCategory(null)}
	                  className="py-3 rounded-2xl border border-[color:var(--app-border)] font-extrabold text-[color:var(--app-text)] bg-[var(--app-surface-2)] hover:bg-[var(--app-surface-3)]"
	                >
	                  {tr('cancel')}
	                </button>
                <button
	                  type="submit"
	                  className="py-3 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20 hover:brightness-95"
	                >
	                  {tr('save')}
	                </button>
	              </div>

              {!isReservedOtherCategoryName(editingCategory?.name) ? (
                <button
                  type="button"
                  onClick={() => openDeleteCategoryModal(editingCategory)}
                  className="mt-3 w-full rounded-2xl border border-rose-500/25 bg-rose-500/10 py-3 text-rose-600 font-extrabold hover:bg-rose-500/15 disabled:opacity-40"
                >
                  {tr('delete_this_category')}
                </button>
              ) : null}
            </form>
          </div>
        </div>
        ), document.body)}

      {/* Toast */}
      {mounted && toast && createPortal((() => {
        const tone = toast.tone || 'info';
        const meta =
          tone === 'success'
            ? { Icon: CheckCircle2, ring: 'ring-emerald-400/20', border: 'border-emerald-400/25', bg: 'bg-emerald-500/10', text: 'text-emerald-600' }
            : tone === 'warning'
              ? { Icon: AlertTriangle, ring: 'ring-amber-400/20', border: 'border-amber-400/25', bg: 'bg-amber-500/10', text: 'text-amber-600' }
              : tone === 'error'
                ? { Icon: AlertTriangle, ring: 'ring-rose-400/20', border: 'border-rose-400/25', bg: 'bg-rose-500/10', text: 'text-rose-600' }
                : { Icon: Info, ring: 'ring-sky-400/20', border: 'border-sky-400/25', bg: 'bg-sky-500/10', text: 'text-sky-600' };
        const IconComp = meta.Icon;
        return (
          <div
            key={toast.id}
            className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-[90] flex justify-center px-4"
            aria-live="polite"
            role="status"
          >
            <div
              className={[
                'pointer-events-auto w-full max-w-md rounded-2xl border shadow-2xl shadow-black/40',
                'bg-[var(--app-surface)] backdrop-blur-md',
                'ring-1',
                meta.border,
                meta.ring,
              ].join(' ')}
            >
              <div className="flex items-start gap-3 p-3.5">
                <div className={['mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl ring-1', meta.bg, meta.ring].join(' ')}>
                  <IconComp className={['h-5 w-5', meta.text].join(' ')} aria-hidden="true" />
                </div>
	                <div className="min-w-0 flex-1">
	                  <div className="text-sm font-extrabold text-[color:var(--app-text)]">{tr('toast_title')}</div>
	                  <div className="mt-0.5 text-sm font-semibold text-[color:var(--app-muted)] break-words">{toast.message}</div>
	                </div>
                <button
	                  type="button"
	                  onClick={dismissToast}
	                  className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
	                  aria-label={tr('close_toast')}
	                  title={tr('close')}
	                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        );
      })(), document.body)}
    </div>
  );
}
