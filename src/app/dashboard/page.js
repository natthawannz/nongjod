"use client";
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { Utensils, ShoppingBag, Car, Home, Zap, Heart, Gamepad2, Stethoscope, GraduationCap, Plane, Briefcase, Gift, Smartphone, Coffee, Music, Dumbbell, PawPrint, Scissors, CreditCard, Landmark, MoreHorizontal, Plus, Settings, Trash2, X, ChevronLeft, ChevronRight, ChevronDown, Check, LayoutGrid, Book, Bus, Train, Truck, Bike, Apple, Banana, Beer, Cake, Camera, Film, Globe, MapPin, Sun, Moon, Star, Trees, Flower, Leaf, Cloud, Snowflake, Droplet, Flame, Key, Lock, Bell, AlarmClock, Wallet, PiggyBank, ShoppingCart, Shirt, Glasses, Watch, Tablet, Tv, Speaker, Headphones, Printer, Cpu, MousePointer, Pen, Pencil, Paintbrush, Ruler, Calculator, Clipboard, Paperclip, Archive, Box, Package, Rocket, Medal, Trophy, Award, Flag, Target, Lightbulb, Battery, Plug, Wifi, Bluetooth, Signal, TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon, Calendar, StickyNote, Mic, ScanLine } from 'lucide-react';

import Currency from '../currency/page';
import LoadingMascot from '@/components/LoadingMascot';
import { formatI18n } from '@/lib/i18n';
import { useBalanzLanguage } from '@/lib/useBalanzLanguage';
const CurrencyModalContent = ({ onClose }) => (
  <Currency onClose={onClose} />
);

// Brand tone (Blue product theme)
const PRIMARY_COLOR = '#2563EB'; // blue-600
const PRIMARY_COLOR_DARK = '#1D4ED8'; // blue-700
const INCOME_COLOR = '#22C55E'; // emerald-500
const EXPENSE_COLOR = '#F43F5E'; // rose-500
const NET_SAVING_COLOR = '#0F172A'; // slate-900
// Use same-origin requests in the browser and rely on Next.js `rewrites()` to reach the backend.
const API_BASE = '';

const I18N = {
  th: {
    welcome_back: 'ยินดีต้อนรับกลับ',
    notifications: 'การแจ้งเตือน',
    new_notifications_aria: 'มีการแจ้งเตือนใหม่ {count} รายการ',

    prev_month: 'เดือนก่อนหน้า',
    next_month: 'เดือนถัดไป',
    open_month_picker: 'เปิดปฏิทินเลือกเดือน',
    selected_month: 'เดือนที่เลือก',
    pick_month: 'เลือกเดือน',
    pick_month_hint: 'แตะเพื่อดูสรุปของเดือนนั้น',
    prev_year: 'ปีก่อนหน้า',
    next_year: 'ปีถัดไป',
    pick_year: 'เลือกปี',
    this_year: 'ปีนี้',
    buddhist_era: 'พ.ศ.',
    this_month: 'เดือนนี้',
    done: 'เสร็จสิ้น',
    close: 'ปิด',

    notif_title: 'การแจ้งเตือน',
    notif_unread: 'ยังไม่อ่าน {count} รายการ',
    notif_unread_none: 'ไม่มีรายการที่ยังไม่อ่าน',
    mark_all_read: 'อ่านแล้วทั้งหมด',
    go_transactions: 'ไปหน้ารายการ',

    expense: 'รายจ่าย',
    income: 'รายรับ',
    tap_expense_only: 'แตะเพื่อดูเฉพาะรายจ่าย',
    tap_income_only: 'แตะเพื่อดูเฉพาะรายรับ',
    left_from_budget: 'เหลือ {amount} จากงบ',
    over_from_budget: 'เกิน {amount} จากงบ',
    left_from_goal: 'เหลือ {amount} จากเป้า',
    over_from_goal: 'เกิน {amount} จากเป้า',

    income_by_category: 'รายรับตามหมวดหมู่',
    income_target_by_category: 'เป้ารายรับตามหมวดหมู่',
    budget: 'งบประมาณ',
    reset_in_days: 'รีเซ็ตใน {count} วัน',
    view_all: 'ดูทั้งหมด',
    spent_today: 'ใช้ไปวันนี้',
    per_day_allowance: 'ใช้ได้ต่อวัน {amount}',
    no_income_this_month: 'ยังไม่มีรายรับเดือนนี้',
    remaining_this_month: 'คงเหลือเดือนนี้',
    received_already: 'รับแล้ว {amount}',
    target_received: 'เป้า {budget} • ได้แล้ว {received}',
    budget_spent: 'งบ {budget} • ใช้ไป {spent}',
    remaining_from_target: 'เหลือ {amount} จากเป้า',
    remaining_amount: 'เหลือ {amount}',

    recent_transactions: 'ธุรกรรมล่าสุด',
    loading: 'กำลังโหลด...',
    no_transactions: 'ยังไม่มีธุรกรรม',
    add_new_hint: 'ลองเพิ่มรายการใหม่ แล้วกลับมาดูอีกครั้ง',
    uncategorized: 'หมวดหมู่ไม่ระบุ',
    unspecified: 'ไม่ระบุ',
    edit: 'แก้ไข',
    delete: 'ลบ',

    add_transaction: 'เพิ่มรายการ',
    amount: 'จำนวนเงิน',
    voice: 'อัดเสียง',
    scan_receipt: 'สแกนใบเสร็จ',
    voice_title: 'อัดเสียง',
    voice_subtitle: 'กดเริ่มอัด → กดหยุด ระบบจะถอดให้เลย',
    status: 'สถานะ',
    time: 'เวลา',
    transcribing: 'กำลังถอดข้อความ...',
    recording: 'กำลังอัดเสียง...',
    recorded: 'อัดเสียงแล้ว',
    ready_to_record: 'พร้อมอัดเสียง',
    stop_auto_transcribe: 'หยุด (ถอดให้อัตโนมัติ)',
    start_recording: 'เริ่มอัดเสียง',
    transcript: 'ข้อความที่ถอดได้',
    cancel: 'ยกเลิก',
    use_autofill: 'ใช้กรอกอัตโนมัติ',

    slip_title: 'อ่านสลิป',
    slip_subtitle: 'เลือกรูปแล้วระบบจะอ่านให้อัตโนมัติ',
    tap_to_change_image: 'แตะเพื่อเปลี่ยนรูป',
    make_amount_date_clear: 'ให้ยอดเงินและวันที่เห็นชัด',
    take_or_upload_slip: 'ถ่ายรูป/อัปโหลดสลิป',
    receipt_support_max: 'รองรับสลิป/ใบเสร็จ (≤ 10MB)',
    slip_reading: 'กำลังอ่าน...',
    slip_ready_auto: 'พร้อมอ่านอัตโนมัติ',
    slip_wait_image: 'รอเลือกรูป',
    please_wait: 'โปรดรอสักครู่',
    try_read_again: 'ลองอ่านอีกครั้ง',

    category: 'หมวดหมู่',
    select_category_before_save: '* ถ้าไม่เลือก ระบบจะบันทึกเป็น “อื่นๆ”',
    today_with_date: 'วันนี้, {label}',
    open_date_picker: 'เปิดตัวเลือกวันที่',
    notes_placeholder: 'ระบุรายละเอียด...',
    save_transaction: 'บันทึกรายการ',

    pick_date: 'เลือกวันที่',
    pick_date_edit_suffix: ' (แก้ไขรายการ)',
    date_picker_hint: 'บันทึกย้อนหลัง/ล่วงหน้าได้ (สูงสุด 1 ปี)',
    tap_day_to_select: 'แตะวันที่เพื่อเลือก',
    today: 'วันนี้',
    finish: 'เสร็จสิ้น',

    edit_transaction: 'แก้ไขรายการ',
    edit_desc: 'อัปเดตข้อมูลธุรกรรม',
    type: 'ประเภท',
    category_select: 'เลือกหมวดหมู่',
    category_options: 'ตัวเลือกหมวดหมู่',
    no_categories: 'ยังไม่มีหมวดหมู่',
    choose: 'เลือก',
    date: 'วันที่',
    open_calendar_pick_date: 'เปิดปฏิทินเลือกวันที่',
    pick_date_placeholder: 'เลือกวันที่',
    tap_to_open_calendar: 'แตะเพื่อเปิดปฏิทิน',
    notes: 'หมายเหตุ',
    notes_edit_placeholder: 'เพิ่มรายละเอียด...',
    save: 'บันทึก',

    delete_confirm_aria: 'ยืนยันการลบ',
    delete_title: 'ลบรายการนี้?',
    delete_cannot_undo: 'การลบจะไม่สามารถกู้คืนได้',
    delete_hint_prefix: 'กด',
    delete_hint_or: 'เพื่อยืนยัน หรือกด',
    delete_hint_suffix: 'เพื่อกลับไปก่อนหน้า',
    deleting: 'กำลังลบ...',

    view_txn_aria: 'ดูรายละเอียดธุรกรรม',
    view_close: 'ปิด',

    err_voice_not_supported: 'เบราว์เซอร์นี้ยังไม่รองรับการอัดเสียง',
    err_voice_recording: 'เกิดข้อผิดพลาดในการอัดเสียง',
    err_voice_open_mic: 'ไม่สามารถเปิดไมโครโฟนได้',
    err_voice_no_audio: 'ยังไม่มีเสียงที่อัดไว้',
    err_voice_transcribe_failed: 'ถอดเสียงไม่สำเร็จ',

    err_select_slip_first: 'กรุณาเลือกรูปสลิปก่อน',
    err_read_slip_failed: 'อ่านสลิปไม่สำเร็จ',

    err_delete_failed: 'ลบรายการไม่สำเร็จ',
    err_amount_gt_zero: 'กรุณากรอกจำนวนเงินที่มากกว่า 0',
    err_choose_category: 'กรุณาเลือกหมวดหมู่',
    err_generic: 'เกิดข้อผิดพลาด',
    err_load_failed: 'เกิดข้อผิดพลาดในการโหลดข้อมูล: {message}',
    err_fetch_txns_failed: 'โหลดธุรกรรมไม่สำเร็จ',

    notif_budget_over_title: 'ใช้จ่ายเกินงบเดือนนี้แล้ว',
    notif_budget_over_body: 'ใช้งบไป {pct}% • เกิน {over}',
    notif_budget_cta_go_budget: 'ไปหน้างบประมาณ',
    notif_budget_near_title: 'ใกล้ถึงงบประมาณเดือนนี้',
    notif_budget_near_body: 'ใช้งบไป {pct}% • เหลือ {left}',
    notif_budget_cta_view_budget: 'ดูงบประมาณ',
    notif_cat_over_title: 'เกินงบหมวด “{name}”',
    notif_cat_over_body: 'ใช้ไป {spent} จากงบ {budget} • เกิน {over}',
    notif_cat_over_cta: 'ดูงบหมวดนี้',
    notif_budget_pace_title: 'ใช้จ่ายเร็วกว่าแผน',
    notif_budget_pace_body: 'ควรใช้ราว {expected} แต่ตอนนี้ใช้ไป {spent}',
    notif_budget_pace_cta: 'ดูสถิติรายจ่าย',
    notif_no_income_title: 'เดือนนี้ยังไม่มีรายรับ',
    notif_no_income_body: 'แต่มีรายจ่าย {expense} ลองบันทึกรายรับเพื่อให้วิเคราะห์แม่นขึ้น',
    notif_no_income_cta: 'ไปหน้ารายการ',
    notif_daily_over_title: 'วันนี้ใช้เกินเป้าที่ตั้งไว้',
    notif_daily_over_body: 'ใช้ไป {spent} จากเป้า {target}',
    notif_daily_over_cta: 'ดูรายการวันนี้',
    notif_leak_top_title: 'หมวดนี้ใช้เยอะเป็นพิเศษ',
    notif_leak_top_body: '{name} คิดเป็น {pct}% ของรายจ่ายเดือนนี้',
    notif_leak_top_cta: 'ดูสัดส่วนรายจ่าย',
    notif_reset_soon_title: 'งบประมาณใกล้รีเซ็ต',
    notif_reset_soon_body: 'เหลืออีก {days} วัน งบเดือนนี้จะรีเซ็ต',
    notif_reset_soon_cta: 'ตรวจงบเดือนนี้',
    notif_all_good_title: 'ทุกอย่างดูโอเค',
    notif_all_good_body: 'ยังไม่พบสิ่งที่ควรแจ้งเตือนในตอนนี้',
    notif_all_good_cta: 'ดูสรุปการเงิน',
  },
  en: {
    welcome_back: 'Welcome back',
    notifications: 'Notifications',
    new_notifications_aria: '{count} new notifications',

    prev_month: 'Previous month',
    next_month: 'Next month',
    open_month_picker: 'Open month picker',
    selected_month: 'Selected month',
    pick_month: 'Pick a month',
    pick_month_hint: 'Tap to view that month’s summary',
    prev_year: 'Previous year',
    next_year: 'Next year',
    pick_year: 'Pick year',
    this_year: 'This year',
    buddhist_era: 'B.E.',
    this_month: 'This month',
    done: 'Done',
    close: 'Close',

    notif_title: 'Notifications',
    notif_unread: '{count} unread',
    notif_unread_none: 'No unread notifications',
    mark_all_read: 'Mark all read',
    go_transactions: 'Go to transactions',

    expense: 'Expenses',
    income: 'Income',
    tap_expense_only: 'Tap to show expenses only',
    tap_income_only: 'Tap to show income only',
    left_from_budget: '{amount} left of budget',
    over_from_budget: '{amount} over budget',
    left_from_goal: '{amount} to goal',
    over_from_goal: '{amount} above goal',

    income_by_category: 'Income by category',
    income_target_by_category: 'Income targets by category',
    budget: 'Budget',
    reset_in_days: 'Resets in {count} days',
    view_all: 'View all',
    spent_today: 'Spent today',
    per_day_allowance: 'Daily allowance {amount}',
    no_income_this_month: 'No income yet this month',
    remaining_this_month: 'Remaining this month',
    received_already: 'Received {amount}',
    target_received: 'Target {budget} • Got {received}',
    budget_spent: 'Budget {budget} • Spent {spent}',
    remaining_from_target: '{amount} remaining',
    remaining_amount: '{amount} left',

    recent_transactions: 'Recent transactions',
    loading: 'Loading…',
    no_transactions: 'No transactions yet',
    add_new_hint: 'Add a transaction and check back.',
    uncategorized: 'Uncategorized',
    unspecified: 'Unspecified',
    edit: 'Edit',
    delete: 'Delete',

    add_transaction: 'Add transaction',
    amount: 'Amount',
    voice: 'Voice',
    scan_receipt: 'Scan receipt',
    voice_title: 'Voice',
    voice_subtitle: 'Tap start → stop. We’ll transcribe automatically.',
    status: 'Status',
    time: 'Time',
    transcribing: 'Transcribing…',
    recording: 'Recording…',
    recorded: 'Recorded',
    ready_to_record: 'Ready',
    stop_auto_transcribe: 'Stop (auto-transcribe)',
    start_recording: 'Start recording',
    transcript: 'Transcript',
    cancel: 'Cancel',
    use_autofill: 'Use to auto-fill',

    slip_title: 'Read receipt',
    slip_subtitle: 'Select an image and we’ll read it automatically.',
    tap_to_change_image: 'Tap to change',
    make_amount_date_clear: 'Make sure amount and date are clear',
    take_or_upload_slip: 'Take photo / upload',
    receipt_support_max: 'Receipts supported (≤ 10MB)',
    slip_reading: 'Reading…',
    slip_ready_auto: 'Ready (auto)',
    slip_wait_image: 'Waiting for image',
    please_wait: 'Please wait',
    try_read_again: 'Try again',

    category: 'Category',
    select_category_before_save: '* If not selected, we’ll use “Other”',
    today_with_date: 'Today, {label}',
    open_date_picker: 'Open date picker',
    notes_placeholder: 'Add details…',
    save_transaction: 'Save',

    pick_date: 'Pick a date',
    pick_date_edit_suffix: ' (Edit)',
    date_picker_hint: 'Backdate / future date allowed (up to 1 year)',
    tap_day_to_select: 'Tap a day to select',
    today: 'Today',
    finish: 'Done',

    edit_transaction: 'Edit transaction',
    edit_desc: 'Update transaction details',
    type: 'Type',
    category_select: 'Select category',
    category_options: 'Category options',
    no_categories: 'No categories yet',
    choose: 'Choose',
    date: 'Date',
    open_calendar_pick_date: 'Open calendar',
    pick_date_placeholder: 'Pick a date',
    tap_to_open_calendar: 'Tap to open',
    notes: 'Notes',
    notes_edit_placeholder: 'Add details…',
    save: 'Save',

    delete_confirm_aria: 'Confirm delete',
    delete_title: 'Delete this transaction?',
    delete_cannot_undo: 'This cannot be undone.',
    delete_hint_prefix: 'Press',
    delete_hint_or: 'to confirm, or',
    delete_hint_suffix: 'to go back.',
    deleting: 'Deleting…',

    view_txn_aria: 'Transaction details',
    view_close: 'Close',

    err_voice_not_supported: 'This browser does not support audio recording',
    err_voice_recording: 'Recording error',
    err_voice_open_mic: 'Unable to access microphone',
    err_voice_no_audio: 'No recording yet',
    err_voice_transcribe_failed: 'Transcription failed',

    err_select_slip_first: 'Please select a receipt image first',
    err_read_slip_failed: 'Failed to read receipt',

    err_delete_failed: 'Delete failed',
    err_amount_gt_zero: 'Please enter an amount greater than 0',
    err_choose_category: 'Please choose a category',
    err_generic: 'Something went wrong',
    err_load_failed: 'Failed to load data: {message}',
    err_fetch_txns_failed: 'Failed to fetch transactions',

    notif_budget_over_title: 'You’re over budget this month',
    notif_budget_over_body: '{pct}% used • Over by {over}',
    notif_budget_cta_go_budget: 'Go to budget',
    notif_budget_near_title: 'You’re close to your monthly budget',
    notif_budget_near_body: '{pct}% used • {left} left',
    notif_budget_cta_view_budget: 'View budget',
    notif_cat_over_title: 'Over budget: “{name}”',
    notif_cat_over_body: '{spent} spent of {budget} • Over by {over}',
    notif_cat_over_cta: 'View this category',
    notif_budget_pace_title: 'Spending faster than plan',
    notif_budget_pace_body: 'Expected ~{expected}, but spent {spent}',
    notif_budget_pace_cta: 'View expense stats',
    notif_no_income_title: 'No income recorded this month',
    notif_no_income_body: 'But you have expenses {expense}. Log income for better insights.',
    notif_no_income_cta: 'Go to transactions',
    notif_daily_over_title: 'Over today’s target',
    notif_daily_over_body: 'Spent {spent} of {target}',
    notif_daily_over_cta: 'View today',
    notif_leak_top_title: 'This category is unusually high',
    notif_leak_top_body: '{name} is {pct}% of this month’s expenses',
    notif_leak_top_cta: 'View expense share',
    notif_reset_soon_title: 'Budget resets soon',
    notif_reset_soon_body: '{days} days left until reset',
    notif_reset_soon_cta: 'Check this month',
    notif_all_good_title: 'All good',
    notif_all_good_body: 'No alerts right now',
    notif_all_good_cta: 'View summary',
  },
};

const tForLang = (language, key, vars) => {
  const dict = I18N[language] || I18N.th;
  const template = dict?.[key] ?? I18N.th?.[key] ?? key;
  return formatI18n(template, vars);
};

const MONTH_NAMES_TH = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม',
];

const parseThaiMonthLabel = (label) => {
  if (!label || typeof label !== 'string') return null;
  const parts = label.trim().split(/\s+/);
  if (parts.length < 2) return null;
  const monthName = parts[0];
  const buddhistYear = Number(parts[1]);
  const monthIndex = MONTH_NAMES_TH.findIndex((m) => m === monthName);
  if (monthIndex < 0 || !Number.isFinite(buddhistYear)) return null;
  return { year: buddhistYear - 543, monthIndex };
};

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
    // Fallback: use local parts (may be inaccurate for users outside TH timezone)
    return { year: d.getFullYear(), monthIndex: d.getMonth(), day: d.getDate() };
  }
};

const toBangkokISODateKey = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  try {
    // en-CA yields YYYY-MM-DD
    return new Intl.DateTimeFormat('en-CA', { timeZone: BANGKOK_TZ }).format(d);
  } catch {
    return toLocalISODateKey(d);
  }
};

const toLocalISODateKey = (dateInput) => {
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const ICON_MAP = {
  'food': Utensils, 'drink': Coffee, 'restaurant': Utensils,
  'shopping': ShoppingBag, 'gift': Gift, 'clothes': Scissors,
  'transport': Car, 'fuel': Zap, 'plane': Plane,
  'home': Home, 'bills': Zap, 'pet': PawPrint,
  'game': Gamepad2, 'music': Music, 'health': Stethoscope, 'sport': Dumbbell,
  'money': Landmark, 'salary': CreditCard, 'work': Briefcase,
  'education': GraduationCap, 'tech': Smartphone,
  'other': MoreHorizontal, 'love': Heart,
  'book': Book, 'bus': Bus, 'train': Train, 'truck': Truck, 'bicycle': Bike,
  'apple': Apple, 'banana': Banana, 'beer': Beer, 'cake': Cake, 'camera': Camera,
  'film': Film, 'globe': Globe, 'mappin': MapPin, 'sun': Sun, 'moon': Moon,
  'star': Star, 'tree': Trees, 'flower': Flower, 'leaf': Leaf, 'cloud': Cloud,
  'snowflake': Snowflake, 'water': Droplet, 'fire': Flame, 'key': Key, 'lock': Lock,
  'bell': Bell, 'alarmclock': AlarmClock, 'wallet': Wallet, 'piggybank': PiggyBank,
  'shoppingcart': ShoppingCart, 'shirt': Shirt, 'glasses': Glasses, 'watch': Watch,
  'tablet': Tablet, 'tv': Tv, 'speaker': Speaker, 'headphones': Headphones,
  'printer': Printer, 'cpu': Cpu, 'mousepointer': MousePointer, 'pen': Pen,
  'pencil': Pencil, 'paintbrush': Paintbrush, 'ruler': Ruler, 'calculator': Calculator,
  'clipboard': Clipboard, 'paperclip': Paperclip, 'archive': Archive, 'box': Box,
  'package': Package, 'truckdelivery': Truck, 'rocket': Rocket, 'medal': Medal,
  'trophy': Trophy, 'award': Award, 'flag': Flag, 'target': Target, 'lightbulb': Lightbulb,
  'battery': Battery, 'plug': Plug, 'wifi': Wifi, 'bluetooth': Bluetooth, 'signal': Signal,
};

const normalizeForMatch = (s) => {
  return String(s || '')
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()'"“”‘’\[\]\\|<>?]/g, '');
};

const AUTO_CATEGORY_RULES = [
  { key: 'food', preferIcons: ['food', 'restaurant'], patterns: ['อาหาร', 'กิน', 'ข้าว', 'ก๋วย', 'ร้าน', 'ผัด', 'กะเพรา', 'กระเพรา', 'ชาบู', 'หมูกระทะ', 'food', 'meal', 'eat', 'restaurant', 'pizza', 'kfc', 'mcd', 'burger', 'grabfood', 'foodpanda', 'lineman'] },
  { key: 'drink', preferIcons: ['drink', 'coffee'], patterns: ['กาแฟ', 'คาเฟ่', 'ชา', 'ชานม', 'starbucks', 'amazon', 'cafe'] },
  { key: 'shopping', preferIcons: ['shopping'], patterns: ['ช้อป', 'shopping', 'market', 'lotus', 'bigc', '7-11', 'เซเว่น', 'เซเว่นอีเลฟเว่น', 'tops', 'makro'] },
  { key: 'transport', preferIcons: ['transport', 'car'], patterns: ['รถ', 'bts', 'mrt', 'รถไฟ', 'แท็กซี่', 'taxi', 'grab', 'bolt', 'ทางด่วน', 'parking', 'จอดรถ'] },
  { key: 'fuel', preferIcons: ['fuel', 'zap'], patterns: ['น้ำมัน', 'เติมน้ำมัน', 'gas', 'ptt', 'shell', 'esso', 'บางจาก'] },
  { key: 'home', preferIcons: ['home'], patterns: ['ค่าเช่า', 'rent', 'บ้าน', 'คอนโด', 'หอ'] },
  { key: 'bills', preferIcons: ['bills', 'zap'], patterns: ['ค่าไฟ', 'ค่าน้ำ', 'internet', 'wifi', 'โทรศัพท์', 'ค่าเน็ต', 'bill', 'invoice'] },
  { key: 'health', preferIcons: ['health'], patterns: ['หมอ', 'โรงพยาบาล', 'ยา', 'pharmacy', 'clinic', 'ตรวจ'] },
  { key: 'pet', preferIcons: ['pet'], patterns: ['สัตว์', 'หมา', 'แมว', 'pet', 'อาหารแมว', 'อาหารหมา'] },
  { key: 'education', preferIcons: ['education'], patterns: ['เรียน', 'คอร์ส', 'course', 'tuition', 'หนังสือ'] },
  { key: 'work', preferIcons: ['work'], patterns: ['งาน', 'office', 'โปรเจค', 'project'] },
];

function renderIcon(iconKey) {
  const IconComp = ICON_MAP[iconKey];
  if (IconComp) return <IconComp className="w-7 h-7" />;
  return <span className="text-2xl">{iconKey || '-'}</span>;
}

export default function Dashboard() {
  const language = useBalanzLanguage('th'); // 'th' | 'en'
  const t = useCallback((key, vars) => tForLang(language, key, vars), [language]);
  const uiLocale = language === 'en' ? 'en-US' : 'th-TH';

  const AUTO_CATEGORY_DEFAULTS_TH = useMemo(() => ({
    food: { name: 'อาหาร', icon: 'food' },
    drink: { name: 'เครื่องดื่ม', icon: 'drink' },
    shopping: { name: 'ช้อปปิ้ง', icon: 'shopping' },
    transport: { name: 'เดินทาง', icon: 'transport' },
    fuel: { name: 'ค่าน้ำมัน', icon: 'fuel' },
    home: { name: 'บ้าน/ที่พัก', icon: 'home' },
    bills: { name: 'บิล/สาธารณูปโภค', icon: 'bills' },
    health: { name: 'สุขภาพ', icon: 'health' },
    pet: { name: 'สัตว์เลี้ยง', icon: 'pet' },
    education: { name: 'การเรียน', icon: 'education' },
    work: { name: 'งาน', icon: 'work' },
    other: { name: 'อื่นๆ', icon: 'other' },
  }), []);

  const [mounted, setMounted] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editCategoryMaxH, setEditCategoryMaxH] = useState(288);
  const [editCategoryPanelStyle, setEditCategoryPanelStyle] = useState(() => ({ left: 12, top: 12, width: 280, transform: 'translateY(0)' }));
  const editCategoryRef = useRef(null);
  const editCategoryButtonRef = useRef(null);
  const editCategoryPanelRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Store JWT token from query string to localStorage (for LINE login)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const token = url.searchParams.get('token');
      const profilePic = url.searchParams.get('profilePic');
      const next = url.searchParams.get('next');
      if (token) {
        localStorage.setItem('token', token);
      }
      if (profilePic) {
        try {
          localStorage.setItem('profilePic', profilePic);
        } catch {
          // ignore
        }
      }
      if (token || profilePic || next) {
        // Remove token/profilePic/next from URL for security and to avoid loops
        url.searchParams.delete('token');
        url.searchParams.delete('profilePic');
        url.searchParams.delete('next');
        window.history.replaceState({}, document.title, url.pathname + url.search);
        if (token && next && String(next).startsWith('/')) {
          window.location.replace(String(next));
        }
      }
    }
  }, []);

  // NOTE: Keep the first render identical between server and client to avoid hydration mismatch.
  // Load localStorage values in an effect instead of the useState initializer.
  const [userProfile, setUserProfile] = useState({ name: '', profilePic: '' });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      setUserProfile({
        name: localStorage.getItem('user_name') || '',
        profilePic: localStorage.getItem('profilePic') || '',
      });
    } catch {
      // ignore
    }
  }, []);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [monthPickerYear, setMonthPickerYear] = useState(() => getBangkokDateParts(Date.now())?.year || new Date().getFullYear());
  const [monthPickerYearMenuOpen, setMonthPickerYearMenuOpen] = useState(false);
  const [readNotifMap, setReadNotifMap] = useState(() => ({}));
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    recentTransactions: [],
    recentIncome: [],
    recentExpense: [],
    todayExpenseTotal: 0,
    currentMonthIncomeTotal: 0,
    currentMonthExpenseTotal: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTransactionId, setDeletingTransactionId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [recentTxnType, setRecentTxnType] = useState('all'); // 'all' | 'expense' | 'income'
  const [showAddModal, setShowAddModal] = useState(false);
  const [addInlinePanel, setAddInlinePanel] = useState('none'); // 'none' | 'slip' | 'voice'
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreviewUrl, setSlipPreviewUrl] = useState('');
  const [slipLoading, setSlipLoading] = useState(false);
  const [slipError, setSlipError] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState('');
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState('');
  const voiceRecorderRef = useRef(null);
  const voiceStreamRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceStartMsRef = useRef(0);
  const voiceAutoApplyToFormRef = useRef(false);
  const monthPickerYearMenuRef = useRef(null);
  const voiceAutoTranscribeRef = useRef(false);
  const voicePendingAutoCategoryRef = useRef(null); // { text: string, type: 'income'|'expense' }
  const slipInputRef = useRef(null);
	  const slipAutoReadKeyRef = useRef('');
	  const readSlipRef = useRef(null);
	  const [categories, setCategories] = useState([]);
	  const [categoryOrder, setCategoryOrder] = useState({ expense: [], income: [] }); // string[] by type (from Budget page reorder)
	  const [budgetsByMonth, setBudgetsByMonth] = useState({}); // { [monthLabel]: { [categoryId]: number } }
	  const [monthlyBudgetTotals, setMonthlyBudgetTotals] = useState({}); // { [monthLabel]: number }
	  const [budgetCategoryTypeById, setBudgetCategoryTypeById] = useState({}); // { [categoryId]: 'expense'|'income'|... }
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
  const [autoCategorize, setAutoCategorize] = useState(false);
  const [addFormData, setAddFormData] = useState({
    amount: '',
    type: 'expense',
    category: '',
    date: toBangkokISODateKey(Date.now()),
    notes: '',
  });
  const [autoCategoryApplied, setAutoCategoryApplied] = useState('');
  const autoCatTimerRef = useRef(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerTarget, setDatePickerTarget] = useState('add'); // 'add' | 'edit'
  const [datePickerMonthMenuOpen, setDatePickerMonthMenuOpen] = useState(false);
  const [datePickerYearMenuOpen, setDatePickerYearMenuOpen] = useState(false);
  const datePickerMonthMenuRef = useRef(null);
  const datePickerYearMenuRef = useRef(null);
	  const [datePickerMonth, setDatePickerMonth] = useState(() => {
	    const p = getBangkokDateParts(Date.now());
	    return { year: p?.year || new Date().getFullYear(), monthIndex: p?.monthIndex ?? new Date().getMonth() };
	  });

	  useEffect(() => {
	    if (typeof window === 'undefined') return;
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
	      // ignore
	    }
	  }, []);

	  const categoryOrderIndex = useMemo(() => {
	    const exp = new Map();
	    const inc = new Map();
	    (categoryOrder?.expense || []).forEach((id, idx) => exp.set(String(id), idx));
	    (categoryOrder?.income || []).forEach((id, idx) => inc.set(String(id), idx));
	    return { expense: exp, income: inc };
	  }, [categoryOrder]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const load = () => {
      try {
        const raw = localStorage.getItem('autoCategorize');
        if (raw === null) {
          // Default ON for faster logging.
          setAutoCategorize(true);
          return;
        }
        setAutoCategorize(JSON.parse(raw) === true);
      } catch {
        setAutoCategorize(true);
      }
    };
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  useEffect(() => {
    if (!slipPreviewUrl) return;
    return () => {
      try { URL.revokeObjectURL(slipPreviewUrl); } catch {}
    };
  }, [slipPreviewUrl]);

  useEffect(() => {
    if (!voiceAudioUrl) return;
    return () => {
      try { URL.revokeObjectURL(voiceAudioUrl); } catch {}
    };
  }, [voiceAudioUrl]);

  useEffect(() => {
    if (!showVoiceModal) return;
    return () => {
      try {
        if (voiceRecorderRef.current && voiceRecorderRef.current.state !== 'inactive') {
          voiceRecorderRef.current.stop();
        }
      } catch {}
      try {
        if (voiceStreamRef.current) {
          voiceStreamRef.current.getTracks().forEach((t) => t.stop());
        }
      } catch {}
      voiceRecorderRef.current = null;
      voiceStreamRef.current = null;
      voiceChunksRef.current = [];
      setVoiceRecording(false);
      setVoiceSeconds(0);
    };
  }, [showVoiceModal]);

  useEffect(() => {
    if (!voiceRecording) return;
    const tick = () => {
      const start = voiceStartMsRef.current || Date.now();
      setVoiceSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [voiceRecording]);

  const resetSlipState = () => {
    setSlipFile(null);
    setSlipError('');
    setSlipLoading(false);
    slipAutoReadKeyRef.current = '';
    setSlipPreviewUrl((prev) => {
      try { if (prev) URL.revokeObjectURL(prev); } catch {}
      return '';
    });
  };

  const cleanupVoiceDevices = () => {
    try {
      if (voiceRecorderRef.current && voiceRecorderRef.current.state !== 'inactive') {
        voiceRecorderRef.current.stop();
      }
    } catch {}
    try {
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    } catch {}
    voiceRecorderRef.current = null;
    voiceStreamRef.current = null;
    voiceChunksRef.current = [];
    setVoiceRecording(false);
  };

  const resetVoiceState = () => {
    setVoiceError('');
    setVoiceLoading(false);
    setVoiceTranscript('');
    setVoiceBlob(null);
    setVoiceSeconds(0);
    voiceStartMsRef.current = 0;
    voiceAutoTranscribeRef.current = false;
    setVoiceAudioUrl((prev) => {
      try { if (prev) URL.revokeObjectURL(prev); } catch {}
      return '';
    });
    voiceChunksRef.current = [];
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddInlinePanel('none');
    setSlipError('');
    resetSlipState();
    cleanupVoiceDevices();
    resetVoiceState();
  };

  const toggleAutoCategorize = () => {
    setAutoCategorize((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('autoCategorize', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const ensureCategoryIdByName = useCallback(async ({ type, name, icon } = {}) => {
    const safeType = type === 'income' ? 'income' : 'expense';
    const safeName = String(name || '').trim();
    if (!safeName) return '';

    const existing = (categories || []).find((c) => c?._id && c?.type === safeType && String(c?.name || '').trim() === safeName);
    if (existing?._id) return String(existing._id);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!token) return '';

    const createRes = await fetch(`${API_BASE}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: safeName, icon: String(icon || '').trim() || 'other', type: safeType }),
    });

    const created = await createRes.json().catch(() => null);
    if (createRes.ok && created?._id) {
      setCategories((prev) => {
        const arr = Array.isArray(prev) ? prev : [];
        if (arr.some((c) => String(c?._id || '') === String(created._id))) return arr;
        return [...arr, created];
      });
      return String(created._id);
    }

    // Race/duplicate fallback: refetch categories and retry.
    const res = await fetch(`${API_BASE}/api/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (res.ok && Array.isArray(data)) setCategories(data);
    const retry = (res.ok && Array.isArray(data))
      ? (data.find((c) => c?._id && c?.type === safeType && String(c?.name || '').trim() === safeName)?._id || '')
      : '';
    return retry ? String(retry) : '';
  }, [categories]);

  const pickAutoCategoryRuleKey = useCallback((noteNorm) => {
    const s = String(noteNorm || '');
    if (!s) return '';
    let bestKey = '';
    let bestHits = 0;
    for (const rule of AUTO_CATEGORY_RULES) {
      const hits = (rule?.patterns || []).reduce((acc, p) => acc + (s.includes(normalizeForMatch(p)) ? 1 : 0), 0);
      if (hits > bestHits) {
        bestHits = hits;
        bestKey = String(rule?.key || '');
      }
    }
    return bestHits > 0 ? bestKey : '';
  }, []);

  const suggestCategoryId = useMemo(() => (args) => {
    const { type, notes } = args || {};
    if (!type) return null;
    const noteRaw = String(notes || '').trim();
    if (!noteRaw) return null;
    const noteNorm = normalizeForMatch(noteRaw);
    if (!noteNorm) return null;

    const list = (categories || []).filter((c) => c?.type === type && c?._id);
    if (!list.length) return null;

	    let best = null;
	    for (const c of list) {
	      const name = String(c?.name || '').trim();
	      const icon = String(c?.icon || '').trim().toLowerCase();
	      const nameNorm = normalizeForMatch(name);
	      let score = 0;

      if (name && noteRaw.includes(name)) score += 10;
      if (nameNorm && noteNorm.includes(nameNorm)) score += 8;

	      const tokens = nameNorm ? nameNorm.split(/[^a-z0-9\u0E00-\u0E7F]+/).filter(Boolean) : [];
	      tokens.forEach((t) => {
	        if (t.length >= 2 && noteNorm.includes(t)) score += 3;
	      });

	      for (const rule of AUTO_CATEGORY_RULES) {
	        const matched = rule.patterns.some((p) => noteNorm.includes(normalizeForMatch(p)));
	        if (!matched) continue;
	        const nameMatchesRule = !!nameNorm && rule.patterns.some((p) => nameNorm.includes(normalizeForMatch(p)));
	        if (rule.preferIcons.includes(icon)) score += 5;
	        if (nameMatchesRule) score += 4;
	        else score += 1;
	      }

      if (!best || score > best.score) best = { id: c._id, name, score };
    }

	    if (!best || best.score < 3) return null;
	    return best;
	  }, [categories]);

  useEffect(() => {
    if (!showAddModal) {
      setAutoCategoryApplied('');
      return;
    }

    if (!categories?.length) return;

    if (!autoCategorize) return;
    if (addFormData.category) return;

    if (autoCatTimerRef.current) {
      try { clearTimeout(autoCatTimerRef.current); } catch {}
    }

    autoCatTimerRef.current = setTimeout(() => {
      const suggested = suggestCategoryId({ type: addFormData.type, notes: addFormData.notes });
      if (!suggested?.id) return;
      setAddFormData((prev) => (prev.category ? prev : { ...prev, category: suggested.id }));
      setAutoCategoryApplied(suggested.name || '');
    }, 220);

    return () => {
      if (autoCatTimerRef.current) {
        try { clearTimeout(autoCatTimerRef.current); } catch {}
        autoCatTimerRef.current = null;
      }
    };
  }, [showAddModal, autoCategorize, addFormData.type, addFormData.notes, addFormData.category, categories, suggestCategoryId]);

  const applySlipParsedToAddForm = (parsed) => {
    const p = parsed && typeof parsed === 'object' ? parsed : {};
    const direction = String(p.direction || '').toLowerCase();
    const mappedType = direction === 'in' ? 'income' : direction === 'out' ? 'expense' : '';
    const amount = Number(p.amount);
    const nextAmount = Number.isFinite(amount) && amount > 0 ? String(amount) : '';
    const nextDate = typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : '';
    const nextNotes = typeof p.notes === 'string' ? p.notes : '';

    setAddFormData((prev) => ({
      ...prev,
      type: mappedType || prev.type,
      amount: nextAmount || prev.amount,
      date: nextDate || prev.date,
      notes: nextNotes || prev.notes,
    }));
    setAutoCategoryApplied('');
  };

  const startVoiceRecording = async () => {
    if (voiceRecording) return;
    setVoiceError('');
    setVoiceTranscript('');
    setVoiceBlob(null);
    setVoiceAudioUrl('');
    setVoiceSeconds(0);
    voiceStartMsRef.current = Date.now();
    voiceAutoTranscribeRef.current = false;
    voiceChunksRef.current = [];

    if (typeof window === 'undefined') return;
    if (!navigator?.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setVoiceError(t('err_voice_not_supported'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;

      const opts = {};
      try {
        if (window.MediaRecorder?.isTypeSupported?.('audio/webm;codecs=opus')) {
          opts.mimeType = 'audio/webm;codecs=opus';
        } else if (window.MediaRecorder?.isTypeSupported?.('audio/webm')) {
          opts.mimeType = 'audio/webm';
        }
      } catch {}

      const recorder = new MediaRecorder(stream, opts);
      voiceRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e?.data && e.data.size > 0) voiceChunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        setVoiceError(t('err_voice_recording'));
      };
      recorder.onstop = () => {
        try {
          const chunks = voiceChunksRef.current || [];
          if (!chunks.length) return;
          const mimeType = recorder.mimeType || 'audio/webm';
          const blob = new Blob(chunks, { type: mimeType });
          setVoiceBlob(blob);
          const url = URL.createObjectURL(blob);
          setVoiceAudioUrl(url);
          if (voiceAutoTranscribeRef.current) {
            voiceAutoTranscribeRef.current = false;
            // Auto-transcribe after stopping (1-tap flow).
            Promise.resolve()
              .then(() => transcribeVoice(blob))
              .catch(() => {});
          }
        } catch {}
      };

      recorder.start();
      setVoiceRecording(true);
    } catch (e) {
      setVoiceError(e?.message ? String(e.message) : t('err_voice_open_mic'));
      setVoiceRecording(false);
      try {
        if (voiceStreamRef.current) voiceStreamRef.current.getTracks().forEach((t) => t.stop());
      } catch {}
      voiceStreamRef.current = null;
      voiceRecorderRef.current = null;
      voiceChunksRef.current = [];
    }
  };

  const stopVoiceRecording = (opts) => {
    if (!voiceRecording) return;
    voiceAutoTranscribeRef.current = Boolean(opts?.autoTranscribe);
    voiceAutoApplyToFormRef.current = Boolean(opts?.autoTranscribe);
    setVoiceRecording(false);
    try {
      if (voiceRecorderRef.current && voiceRecorderRef.current.state !== 'inactive') {
        voiceRecorderRef.current.stop();
      }
    } catch {}
    try {
      if (voiceStreamRef.current) voiceStreamRef.current.getTracks().forEach((t) => t.stop());
    } catch {}
    voiceStreamRef.current = null;
  };

  const formatVoiceDuration = (sec) => {
    const s = Math.max(0, Number(sec) || 0);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const transcribeVoice = async (blobOverride) => {
    if (voiceLoading) return;
    const blob = blobOverride || voiceBlob;
    if (!blob) {
      setVoiceError(t('err_voice_no_audio'));
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      setVoiceLoading(true);
      setVoiceError('');
      const fd = new FormData();
      fd.append('audio', blob, 'recording.webm');
      const res = await fetch(`${API_BASE}/api/ai/transcribe`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || t('err_voice_transcribe_failed'));
      }
      const text = String(data?.text || '').trim();
      setVoiceTranscript(text);
      if (voiceAutoApplyToFormRef.current && text) {
        voiceAutoApplyToFormRef.current = false;
        void applyVoiceTextToAddForm(text);
      }
    } catch (e) {
      setVoiceError(e?.message ? String(e.message) : t('err_voice_transcribe_failed'));
    } finally {
      setVoiceLoading(false);
      voiceAutoApplyToFormRef.current = false;
    }
  };

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

  const getBangkokWeekdayIndex = (year, monthIndex, day) => {
    try {
      const iso = toISOFromParts(year, monthIndex, day);
      const d = new Date(`${iso}T00:00:00+07:00`);
      const w = new Intl.DateTimeFormat('en-US', { timeZone: BANGKOK_TZ, weekday: 'short' }).format(d);
      const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return typeof map[w] === 'number' ? map[w] : d.getDay();
    } catch {
      const d = new Date(year, monthIndex, day);
      return d.getDay();
    }
  };

  const openDatePicker = (target = 'add') => {
    const nextTarget = target === 'edit' ? 'edit' : 'add';
    setDatePickerTarget(nextTarget);
    const activeISO = nextTarget === 'edit' ? editFormData?.date : addFormData?.date;
    const parsed = parseISODateKey(activeISO);
    if (parsed) setDatePickerMonth({ year: parsed.year, monthIndex: parsed.monthIndex });
    else {
      const p = getBangkokDateParts(Date.now());
      setDatePickerMonth({ year: p?.year || new Date().getFullYear(), monthIndex: p?.monthIndex ?? new Date().getMonth() });
    }
    setShowDatePicker(true);
  };

  const inferTxnTypeFromVoice = (text) => {
    const norm = normalizeForMatch(text);
    if (!norm) return '';

    const incomeHints = [
      'รายรับ', 'income', 'เงินเข้า', 'โอนเข้า', 'ได้รับ', 'ได้เงิน', 'เงินเดือน', 'salary', 'โบนัส', 'bonus',
    ];
    const expenseHints = [
      'รายจ่าย', 'expense', 'เงินออก', 'โอนออก', 'จ่าย', 'ซื้อ', 'ค่า', 'ชำระ', 'จ่ายบิล', 'bill', 'เติม',
    ];

    let inc = 0;
    let exp = 0;
    incomeHints.forEach((h) => { if (norm.includes(normalizeForMatch(h))) inc += 1; });
    expenseHints.forEach((h) => { if (norm.includes(normalizeForMatch(h))) exp += 1; });

    if (!inc && !exp) return '';
    if (inc > exp) return 'income';
    if (exp > inc) return 'expense';
    return '';
  };

  const extractAmountFromVoice = (text) => {
    const s = String(text || '');
    if (!s) return '';

    const candidates = [];
    const re = /(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/g;
    for (const m of s.matchAll(re)) {
      const raw = String(m[0] || '');
      const idx = typeof m.index === 'number' ? m.index : -1;
      const before = idx >= 2 ? s.slice(Math.max(0, idx - 2), idx) : '';
      const after = idx >= 0 ? s.slice(idx + raw.length, idx + raw.length + 2) : '';

      // Skip numbers that look like they are part of a date/time token: "2026-03-07", "7/3", etc.
      if ((before.includes('-') || before.includes('/') || after.includes('-') || after.includes('/')) && raw.length <= 4) {
        continue;
      }

      const n = Number(raw.replace(/,/g, ''));
      if (!Number.isFinite(n) || n <= 0) continue;
      if (n > 1_000_000_000) continue;

      candidates.push({ n, raw: raw.replace(/,/g, '') });
    }

    if (!candidates.length) return '';
    // Prefer the largest plausible number (usually the amount, not a day number).
    candidates.sort((a, b) => b.n - a.n);
    return candidates[0].raw || '';
  };

  const categoryMatchesType = (categoryId, type) => {
    if (!categoryId || !type) return false;
    return (categories || []).some((c) => String(c?._id) === String(categoryId) && String(c?.type) === String(type));
  };

  const applyVoiceTextToAddForm = useCallback(async (rawText) => {
    const text = String(rawText || '').trim();
    if (!text) return;

    const typeGuess = inferTxnTypeFromVoice(text);
    const amountGuess = extractAmountFromVoice(text);
    const noteNorm = normalizeForMatch(text);

    // If no category matches, allow creating a sensible default category (e.g. "อาหาร") for expense.
    const ensureType = typeGuess || addFormData?.type || 'expense';
    let ensuredCategoryId = '';
    let ensuredCategoryName = '';
    if (ensureType === 'expense') {
      const ruleKey = pickAutoCategoryRuleKey(noteNorm);
      const def = ruleKey ? AUTO_CATEGORY_DEFAULTS_TH?.[ruleKey] : null;
      if (def?.name) {
        ensuredCategoryName = String(def.name);
        ensuredCategoryId = await ensureCategoryIdByName({ type: 'expense', name: def.name, icon: def.icon || ruleKey });
      }
    }

    setAddFormData((prev) => {
      const prevAmount = String(prev?.amount || '').trim();
      const prevNotes = String(prev?.notes || '').trim();

      const nextType = typeGuess || prev.type || 'expense';

      let nextCategory = prev.category || '';
      if (nextCategory && !categoryMatchesType(nextCategory, nextType)) nextCategory = '';

      const suggested = suggestCategoryId({ type: nextType, notes: text });
      if (!nextCategory && suggested?.id) nextCategory = suggested.id;
      if (!nextCategory && ensuredCategoryId && categoryMatchesType(ensuredCategoryId, nextType)) nextCategory = ensuredCategoryId;

      voicePendingAutoCategoryRef.current = !nextCategory ? { text, type: nextType } : null;

      const nextNotes = !prevNotes
        ? text
        : prevNotes.includes(text)
          ? prevNotes
          : `${prevNotes}\n${text}`;

      return {
        ...prev,
        type: nextType,
        amount: prevAmount ? prev.amount : (amountGuess || prev.amount),
        category: nextCategory,
        notes: nextNotes,
      };
    });

    setShowVoiceModal(false);
    setAddInlinePanel('none');
    setShowAddModal(true);
    if (ensuredCategoryId && ensuredCategoryName) setAutoCategoryApplied(ensuredCategoryName);
  }, [
    addFormData?.type,
    AUTO_CATEGORY_DEFAULTS_TH,
    ensureCategoryIdByName,
    inferTxnTypeFromVoice,
    extractAmountFromVoice,
    pickAutoCategoryRuleKey,
    suggestCategoryId,
    categoryMatchesType,
  ]);

  const applyVoiceTranscriptToAddForm = () => {
    const text = String(voiceTranscript || '').trim();
    if (!text) return;
    void applyVoiceTextToAddForm(text);
  };

  useEffect(() => {
    const pending = voicePendingAutoCategoryRef.current;
    if (!pending?.text) return;
    if (addFormData?.category) {
      voicePendingAutoCategoryRef.current = null;
      return;
    }
    if (!Array.isArray(categories) || categories.length === 0) return;

    const notesNow = String(addFormData?.notes || '');
    if (!notesNow.includes(pending.text)) return;

    const suggested = suggestCategoryId({ type: pending.type || addFormData?.type || 'expense', notes: pending.text });
    if (!suggested?.id) return;

    setAddFormData((prev) => (prev?.category ? prev : { ...prev, category: suggested.id }));
    voicePendingAutoCategoryRef.current = null;
  }, [categories, addFormData?.category, addFormData?.notes, addFormData?.type, suggestCategoryId]);

  const readSlip = async () => {
    if (slipLoading) return;
    if (!slipFile) {
      setSlipError(t('err_select_slip_first'));
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      setSlipLoading(true);
      setSlipError('');
      const fd = new FormData();
      fd.append('image', slipFile);

      const res = await fetch(`${API_BASE}/api/ai/slip`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || data?.message || t('err_read_slip_failed'));
      }
      applySlipParsedToAddForm(data?.parsed || {});
      setAddInlinePanel('none');
      resetSlipState();
    } catch (e) {
      setSlipError(e?.message ? String(e.message) : t('err_read_slip_failed'));
    } finally {
      setSlipLoading(false);
    }
  };

  readSlipRef.current = readSlip;

  useEffect(() => {
    const active = showAddModal && addInlinePanel === 'slip';
    if (!active) {
      slipAutoReadKeyRef.current = '';
      return;
    }
    if (slipLoading) return;
    if (!slipFile) return;
    const key = `${slipFile.name}_${slipFile.size}_${slipFile.lastModified}`;
    if (key === slipAutoReadKeyRef.current) return;
    slipAutoReadKeyRef.current = key;
    const id = setTimeout(() => {
      try {
        readSlipRef.current && readSlipRef.current();
      } catch {
        // ignore
      }
    }, 220);
    return () => clearTimeout(id);
  }, [showAddModal, addInlinePanel, slipFile, slipLoading]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('dashboard_notif_read_v1');
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') setReadNotifMap(parsed);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('dashboard_notif_read_v1', JSON.stringify(readNotifMap || {}));
    } catch {
      // ignore
    }
  }, [readNotifMap]);

  useEffect(() => {
    if (!showNotifications) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setShowNotifications(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [showNotifications]);

  useEffect(() => {
    if (!showMonthPicker) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (monthPickerYearMenuOpen) setMonthPickerYearMenuOpen(false);
      else setShowMonthPicker(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [showMonthPicker, monthPickerYearMenuOpen]);

  useEffect(() => {
    if (!monthPickerYearMenuOpen) return;
    const onDown = (e) => {
      const el = monthPickerYearMenuRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setMonthPickerYearMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('touchstart', onDown, true);
    };
  }, [monthPickerYearMenuOpen]);

  useEffect(() => {
    if (!showDatePicker) return;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (datePickerMonthMenuOpen) setDatePickerMonthMenuOpen(false);
      else if (datePickerYearMenuOpen) setDatePickerYearMenuOpen(false);
      else setShowDatePicker(false);
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [showDatePicker, datePickerMonthMenuOpen, datePickerYearMenuOpen]);

  useEffect(() => {
    if (!showDatePicker) {
      if (datePickerMonthMenuOpen) setDatePickerMonthMenuOpen(false);
      if (datePickerYearMenuOpen) setDatePickerYearMenuOpen(false);
    }
  }, [showDatePicker, datePickerMonthMenuOpen, datePickerYearMenuOpen]);

  useEffect(() => {
    if (!datePickerMonthMenuOpen) return;
    const onDown = (e) => {
      const el = datePickerMonthMenuRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setDatePickerMonthMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('touchstart', onDown, true);
    };
  }, [datePickerMonthMenuOpen]);

  useEffect(() => {
    if (!datePickerYearMenuOpen) return;
    const onDown = (e) => {
      const el = datePickerYearMenuRef.current;
      if (!el) return;
      if (el.contains(e.target)) return;
      setDatePickerYearMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, true);
    return () => {
      document.removeEventListener('mousedown', onDown, true);
      document.removeEventListener('touchstart', onDown, true);
    };
  }, [datePickerYearMenuOpen]);

  const recomputeEditCategoryPanel = useCallback(() => {
    if (typeof window === 'undefined') return;
    const btn = editCategoryButtonRef.current;
    if (!btn || !btn.getBoundingClientRect) return;
    const rect = btn.getBoundingClientRect();
    const vh = window.innerHeight || document.documentElement?.clientHeight || 0;
    const vw = window.innerWidth || document.documentElement?.clientWidth || 0;
    if (!vh) return;

    const margin = 12;
    const below = Math.max(0, vh - rect.bottom - margin);
    const above = Math.max(0, rect.top - margin);

    const minNeeded = 220; // enough to show a few options
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
      const root = editCategoryRef.current;
      const panel = editCategoryPanelRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
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

  /* --- Data & Logic Setup --- */
	  const getMonths = () => {
	    const currentDate = new Date();
	    const nowParts = getBangkokDateParts(currentDate) || { year: currentDate.getFullYear(), monthIndex: currentDate.getMonth() };
	    const currentYear = (nowParts.year || currentDate.getFullYear()) + 543; 
	    const currentMonth = typeof nowParts.monthIndex === 'number' ? nowParts.monthIndex : currentDate.getMonth();
	    const months = [];
	    const span = 120; // ±10 years

    for (let i = -span; i <= span; i++) { 
      const monthIndex = (currentMonth + i) % 12;
      let yearOffset = Math.floor((currentMonth + i) / 12);
      if (monthIndex < 0) {
        yearOffset -= 1; 
      }
      const actualMonthIndex = (monthIndex + 12) % 12;
      const year = currentYear + yearOffset;
      months.push(`${MONTH_NAMES_TH[actualMonthIndex]} ${year}`);
    }
    return months;
  };

  const months = getMonths();
  const nowBkk = getBangkokDateParts(Date.now());
  const currentDate = new Date();
  const currentMonthYear = (() => {
    const p = nowBkk || getBangkokDateParts(currentDate) || { year: currentDate.getFullYear(), monthIndex: currentDate.getMonth() };
    return `${MONTH_NAMES_TH[p.monthIndex]} ${p.year + 543}`;
  })();
  
  const currentMonthInitialIndex = months.findIndex(m => m === currentMonthYear);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(currentMonthInitialIndex !== -1 ? currentMonthInitialIndex : Math.floor(months.length / 2));
  const selectedMonth = months[currentMonthIndex];

  const monthIndexMap = useMemo(() => {
    const map = new Map();
    months.forEach((label, idx) => {
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
    const cells = MONTH_NAMES_TH.map((name, monthIndex) => {
      const idx = monthIndexMap.get(`${y}-${monthIndex}`);
      return { name, monthIndex, idx: typeof idx === 'number' ? idx : null };
    });
    return cells;
  }, [monthIndexMap, monthPickerYear]);

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error((await res.json()).message || t('err_fetch_txns_failed'));
      }     
      const transactions = await res.json();
      const allTransactions = Array.isArray(transactions) ? transactions : [];
      const getTxnDateInput = (txn) => txn?.date || txn?.datetime || txn?.createdAt || null;

      // Always compute "today spend" from ALL transactions (not only the selected month),
      // so the card stays correct even when viewing past/future months.
      const todayKey = toBangkokISODateKey(Date.now());
      const todayExpenseTotal = allTransactions
        .filter((t) => t?.type === 'expense' && toBangkokISODateKey(getTxnDateInput(t)) === todayKey)
        .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);

      // Also compute current-month totals from ALL transactions (for "ต่อวัน" targets).
      const nowParts = getBangkokDateParts(Date.now());
      const cmIncome = allTransactions
        .filter((t) => {
          if (t?.type !== 'income') return false;
          if (!nowParts) return false;
          const p = getBangkokDateParts(getTxnDateInput(t));
          return !!p && p.year === nowParts.year && p.monthIndex === nowParts.monthIndex;
        })
        .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
      const cmExpense = allTransactions
        .filter((t) => {
          if (t?.type !== 'expense') return false;
          if (!nowParts) return false;
          const p = getBangkokDateParts(getTxnDateInput(t));
          return !!p && p.year === nowParts.year && p.monthIndex === nowParts.monthIndex;
        })
        .reduce((sum, t) => sum + (Number(t?.amount) || 0), 0);
      
      const selectedMonthName = selectedMonth.split(' ')[0];
      const selectedYear = selectedMonth.split(' ')[1];

      const filteredTransactions = allTransactions.filter(t => {
        const p = getBangkokDateParts(getTxnDateInput(t));
        if (!p) return false;
        const tMonthIndex = p.monthIndex;
        const tYearBuddhist = p.year + 543;
        return MONTH_NAMES_TH[tMonthIndex] === selectedMonthName && String(tYearBuddhist) === String(selectedYear);
      });

      const sortedRecentSelected = [...filteredTransactions].sort((a, b) => {
        const ad = a?.date || a?.datetime || a?.createdAt || 0;
        const bd = b?.date || b?.datetime || b?.createdAt || 0;
        return new Date(bd) - new Date(ad);
      });
      const totalIncome = filteredTransactions
        .filter((t) => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = filteredTransactions
        .filter((t) => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
        
      setStats({
        totalIncome,
        totalExpenses,
        netSavings: totalIncome - totalExpenses,
        recentTransactions: sortedRecentSelected.slice(0, 5),
        recentIncome: sortedRecentSelected.filter((t) => t?.type === 'income').slice(0, 5),
        recentExpense: sortedRecentSelected.filter((t) => t?.type === 'expense').slice(0, 5),
        transactionsAll: filteredTransactions,
        todayExpenseTotal,
        currentMonthIncomeTotal: Number(cmIncome) || 0,
        currentMonthExpenseTotal: Number(cmExpense) || 0,
      });
      setError('');
      
    } catch (error) {
      setError(t('err_load_failed', { message: error?.message ? String(error.message) : t('err_generic') }));
      setStats({ totalIncome: 0, totalExpenses: 0, netSavings: 0, recentTransactions: [], recentIncome: [], recentExpense: [], todayExpenseTotal: 0, currentMonthIncomeTotal: 0, currentMonthExpenseTotal: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    let refreshTimer = null;
    let refreshInFlight = false;

    const safeJson = async (res) => {
      try {
        const text = await res.text();
        return JSON.parse(text);
      } catch {
        return null;
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setCategories(data || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    const fetchBudgets = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [budgetRes, totalRes] = await Promise.all([
          fetch(`${API_BASE}/api/budgets`, { headers }),
          fetch(`${API_BASE}/api/budgets/total`, { headers }),
        ]);

        const buds = await safeJson(budgetRes);
        const totals = await safeJson(totalRes);

        if (budgetRes.ok && Array.isArray(buds)) {
          const map = {};
          const typeMap = {};
          buds.forEach((b) => {
            const month = b?.month;
            if (!month) return;
            if (!map[month]) map[month] = {};
            const catId = (b?.category && typeof b.category === 'object')
              ? (b.category?._id || '')
              : (b?.category || '');
            if (!catId) return;
            map[month][catId] = Number(b?.total ?? 0) || 0;
            if (b?.category && typeof b.category === 'object') {
              const t = b.category?.type;
              if (typeof t === 'string' && t) typeMap[catId] = t;
            }
          });
          setBudgetsByMonth(map);
          setBudgetCategoryTypeById(typeMap);
        }

        if (totalRes.ok && Array.isArray(totals)) {
          const tMap = {};
          totals.forEach((tb) => {
            const month = tb?.month;
            if (!month) return;
            tMap[month] = Number(tb?.total ?? 0) || 0;
          });
          setMonthlyBudgetTotals(tMap);
        }
      } catch (e) {
        // ignore budgets load errors (dashboard can still work)
      }
    };

    if (!token) {
        window.location.href = '/login';
        return;
    }

    const refreshAll = () => {
      if (refreshInFlight) return;
      refreshInFlight = true;
      Promise.allSettled([fetchStats(), fetchCategories(), fetchBudgets()])
        .finally(() => { refreshInFlight = false; });
    };

    const scheduleRefresh = () => {
      try {
        if (refreshTimer) clearTimeout(refreshTimer);
      } catch {}
      refreshTimer = setTimeout(() => refreshAll(), 120);
    };

    refreshAll();

    const onFocus = () => scheduleRefresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') scheduleRefresh();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    
    return () => {
      try {
        if (refreshTimer) clearTimeout(refreshTimer);
      } catch {}
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [selectedMonth]);

  // Fetch profile from backend (LINE user is linked to our User model)
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!token) return;

    let cancelled = false;
    const loadMe = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          // token expired/invalid
          if (res.status === 401) {
            try { localStorage.removeItem('token'); } catch {}
            if (!cancelled) window.location.href = '/login';
          }
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const next = {
          name: data?.name || '',
          profilePic: data?.profilePic || (typeof window !== 'undefined' ? (localStorage.getItem('profilePic') || '') : ''),
        };
        setUserProfile(next);
        try {
          localStorage.setItem('user_name', next.name || '');
          if (next.profilePic) localStorage.setItem('profilePic', next.profilePic);
        } catch {
          // ignore
        }
      } catch (err) {
        // ignore profile load errors (dashboard can still work)
      }
    };

    loadMe();
    return () => { cancelled = true; };
  }, []);

  const handleView = (transaction) => {
    setViewingTransaction(transaction);
    setShowViewModal(true);
  };

  const handleEdit = (transaction) => {
    setEditingTransaction(transaction);
    setEditFormData({
      amount: transaction.amount,
      type: transaction.type,
      category: transaction.category?._id || '',
      date: new Date(transaction.date).toISOString().split('T')[0],
      notes: transaction.notes || '',
    });
    setShowEditModal(true);
  };

  const handleDelete = (transactionId) => {
    if (!transactionId) return;
    setDeletingTransactionId(transactionId);
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const transactionId = deletingTransactionId;
    if (!transactionId || deleteLoading) return;

    try {
      setDeleteLoading(true);
      setDeleteError('');

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || t('err_delete_failed'));
      }

      setShowDeleteModal(false);
      setDeletingTransactionId(null);
      fetchStats();
    } catch (err) {
      setDeleteError(err?.message ? String(err.message) : t('err_delete_failed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!editFormData.amount || parseFloat(editFormData.amount) <= 0) {
      setError(t('err_amount_gt_zero'));
      return;
    }
    if (!editFormData.category) {
      setError(t('err_choose_category'));
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE = '';
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
      if (!res.ok) {
        throw new Error(data.message || t('err_generic'));
      }

      setShowEditModal(false);
      setEditingTransaction(null);
      fetchStats();
    } catch (error) {
      setError(t('err_load_failed', { message: error?.message ? String(error.message) : t('err_generic') }));
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!addFormData.amount || parseFloat(addFormData.amount) <= 0) {
      setError(t('err_amount_gt_zero'));
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const categoryId = addFormData.category
        ? String(addFormData.category)
        : (await ensureCategoryIdByName({ type: addFormData.type, name: 'อื่นๆ', icon: 'other' }));
      if (!categoryId) {
        setError(t('err_choose_category'));
        return;
      }
      const res = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...addFormData,
          category: categoryId,
          amount: parseFloat(addFormData.amount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || t('err_generic'));
      }

      setShowAddModal(false);
      setAddFormData({
        amount: '',
        type: 'expense',
        category: '',
        date: toBangkokISODateKey(Date.now()),
        notes: '',
      });
      fetchStats();
    } catch (error) {
      setError(t('err_load_failed', { message: error?.message ? String(error.message) : t('err_generic') }));
    }
  };

  const formatCurrentDate = () => {
    const p = getBangkokDateParts(Date.now());
    if (!p) {
      const d = new Date();
      const m = MONTH_NAMES_TH[d.getMonth()];
      const day = d.getDate();
      const year = d.getFullYear() + 543;
      return `${m} ${day}, ${year}`;
    }
    const m = MONTH_NAMES_TH[p.monthIndex];
    return `${m} ${p.day}, ${p.year + 543}`;
  };

  const formatTHB = useCallback((value) => {
    const n = Number(value) || 0;
    const abs = Math.abs(n);
    const formatted = abs.toLocaleString(uiLocale);
    return `${n < 0 ? '-' : ''}฿${formatted}`;
  }, [uiLocale]);

  const selectedParsed = useMemo(() => parseThaiMonthLabel(selectedMonth), [selectedMonth]);
  const monthExpenseBudgetTotal = useMemo(() => {
    const monthBudgets = budgetsByMonth?.[selectedMonth] || {};
    const entries = Object.entries(monthBudgets || {});
    if (!entries.length) return 0;
    let sum = 0;
    for (const [categoryId, total] of entries) {
      const cat = (categories || []).find((c) => c?._id === categoryId);
      const type = (cat?.type || budgetCategoryTypeById?.[categoryId] || '').toString();
      if (type && type !== 'expense') continue;
      sum += Number(total) || 0;
    }
    return Number(sum) || 0;
  }, [budgetsByMonth, selectedMonth, categories, budgetCategoryTypeById]);

  const currentMonthIncomeBudgetTotal = useMemo(() => {
    const monthBudgets = budgetsByMonth?.[currentMonthYear] || {};
    const entries = Object.entries(monthBudgets || {});
    if (!entries.length) return 0;
    let sum = 0;
    for (const [categoryId, total] of entries) {
      const cat = (categories || []).find((c) => c?._id === categoryId);
      const type = (cat?.type || budgetCategoryTypeById?.[categoryId] || '').toString();
      if (type && type !== 'income') continue;
      sum += Number(total) || 0;
    }
    return Number(sum) || 0;
  }, [budgetsByMonth, currentMonthYear, categories, budgetCategoryTypeById]);

  const monthIncomeBudgetTotal = useMemo(() => {
    const monthBudgets = budgetsByMonth?.[selectedMonth] || {};
    const entries = Object.entries(monthBudgets || {});
    if (!entries.length) return 0;
    let sum = 0;
    for (const [categoryId, total] of entries) {
      const cat = (categories || []).find((c) => c?._id === categoryId);
      const type = (cat?.type || budgetCategoryTypeById?.[categoryId] || '').toString();
      if (type && type !== 'income') continue;
      sum += Number(total) || 0;
    }
    return Number(sum) || 0;
  }, [budgetsByMonth, selectedMonth, categories, budgetCategoryTypeById]);

  const monthIncomeTotal = useMemo(() => {
    const src = Array.isArray(stats.transactionsAll) ? stats.transactionsAll : [];
    return src.filter((t) => t?.type === 'income').reduce((s, t) => s + (Number(t?.amount) || 0), 0);
  }, [stats.transactionsAll]);

  const monthExpenseTotal = useMemo(() => {
    const src = Array.isArray(stats.transactionsAll) ? stats.transactionsAll : [];
    return src.filter((t) => t?.type === 'expense').reduce((s, t) => s + (Number(t?.amount) || 0), 0);
  }, [stats.transactionsAll]);

  const todaySpend = useMemo(() => Number(stats?.todayExpenseTotal) || 0, [stats?.todayExpenseTotal]);

  const daysInSelectedMonth = useMemo(() => {
    const parsed = selectedParsed;
    if (!parsed) return 30;
    const d = new Date(parsed.year, parsed.monthIndex + 1, 0);
    const n = d.getDate();
    return Number.isFinite(n) && n > 0 ? n : 30;
  }, [selectedParsed]);

  const daysInCurrentMonth = useMemo(() => {
    const p = nowBkk;
    if (!p) return 30;
    const d = new Date(p.year, p.monthIndex + 1, 0);
    const n = d.getDate();
    return Number.isFinite(n) && n > 0 ? n : 30;
  }, [nowBkk]);

  const daysUntilReset = useMemo(() => {
    const parsed = selectedParsed;
    if (!parsed) return 0;
    const nowParts = nowBkk;
    if (!nowParts || nowParts.year !== parsed.year || nowParts.monthIndex !== parsed.monthIndex) return 0;
    return Math.max(0, (Number(daysInSelectedMonth) || 0) - (Number(nowParts.day) || 0) + 1);
  }, [selectedParsed, nowBkk, daysInSelectedMonth]);

  const dailyTargetToday = useMemo(() => {
    const incomeActual = Number(stats?.currentMonthIncomeTotal) || 0;
    const incomeBudget = Number(currentMonthIncomeBudgetTotal) || 0;
    const base = incomeActual > 0 ? incomeActual : incomeBudget;
    if (base > 0) return base / Math.max(1, daysInCurrentMonth);
    return 0;
  }, [stats?.currentMonthIncomeTotal, currentMonthIncomeBudgetTotal, daysInCurrentMonth]);

  const monthRemaining = useMemo(() => {
    const incomeActual = Number(monthIncomeTotal) || 0;
    const expenseActual = Number(monthExpenseTotal) || 0;
    const incomeBudget = Number(monthIncomeBudgetTotal) || 0;
    const expenseBudget = Number(monthExpenseBudgetTotal) || 0;

    // Prefer actual income as the base for "remaining this month".
    // If the user has no income transactions yet, fall back to income budget (if any),
    // then to expense budget (classic budget mode).
    const base = incomeActual > 0 ? incomeActual : incomeBudget > 0 ? incomeBudget : expenseBudget;
    return base - expenseActual;
  }, [monthExpenseBudgetTotal, monthExpenseTotal, monthIncomeTotal, monthIncomeBudgetTotal]);

  const leakItems = useMemo(() => {
    const src = Array.isArray(stats.transactionsAll) ? stats.transactionsAll : [];
    const map = new Map();
    for (const txn of src) {
      if (!txn || txn.type !== 'expense') continue;
      const amt = Number(txn.amount) || 0;
      if (amt <= 0) continue;
      const id = txn.category?._id || txn.category || '_none';
      const name = txn.category?.name || t('unspecified');
      const icon = txn.category?.icon || 'other';
      const prev = map.get(id) || { id, name, icon, amount: 0 };
      prev.amount += amt;
      map.set(id, prev);
    }
    return Array.from(map.values()).sort((a, b) => b.amount - a.amount).slice(0, 3);
  }, [stats.transactionsAll, t]);

  const notifications = useMemo(() => {
    if (loading) return [];

    const income = Number(monthIncomeTotal) || 0;
    const expense = Math.max(0, Number(monthExpenseTotal) || 0);
    const budgetTotal = Number(monthExpenseBudgetTotal) || 0;
    const hasBudget = budgetTotal > 0;

    const parsed = selectedParsed;
    const nowParts = nowBkk;
    const isCurrentMonth = !!parsed && !!nowParts && nowParts.year === parsed.year && nowParts.monthIndex === parsed.monthIndex;
    const progress = isCurrentMonth ? Math.max(0.05, Math.min(1, (Number(nowParts?.day) || 1) / Math.max(1, daysInSelectedMonth))) : 1;
    const expectedSpendSoFar = hasBudget ? budgetTotal * progress : 0;

    const list = [];
    const push = (n) => { if (n && n.id) list.push(n); };

    if (hasBudget && expense > budgetTotal) {
      push({
        id: `budget_over_${selectedMonth}`,
        tone: 'rose',
        icon: TrendingDownIcon,
        title: t('notif_budget_over_title'),
        body: t('notif_budget_over_body', {
          pct: Math.round((expense / Math.max(1, budgetTotal)) * 100),
          over: formatTHB(expense - budgetTotal),
        }),
        href: '/budget',
        cta: t('notif_budget_cta_go_budget'),
      });
    } else if (hasBudget && expense / Math.max(1, budgetTotal) >= 0.85) {
      push({
        id: `budget_near_${selectedMonth}`,
        tone: 'amber',
        icon: Target,
        title: t('notif_budget_near_title'),
        body: t('notif_budget_near_body', {
          pct: Math.round((expense / Math.max(1, budgetTotal)) * 100),
          left: formatTHB(Math.max(0, budgetTotal - expense)),
        }),
        href: '/budget',
        cta: t('notif_budget_cta_view_budget'),
      });
    }

    // Category-level budget alerts (expense categories only)
    if (hasBudget) {
      const monthBudgets = budgetsByMonth?.[selectedMonth] || {};
      const entries = Object.entries(monthBudgets || {});
      if (entries.length) {
        const spentByCategory = new Map();
        const src = Array.isArray(stats.transactionsAll) ? stats.transactionsAll : [];
        for (const t of src) {
          if (!t || t.type !== 'expense') continue;
          const id = t.category?._id || t.category || '';
          if (!id) continue;
          spentByCategory.set(id, (spentByCategory.get(id) || 0) + (Number(t.amount) || 0));
        }

        const overList = [];
        for (const [categoryId, rawBudget] of entries) {
          const budget = Number(rawBudget) || 0;
          if (budget <= 0) continue;
          const cat = (categories || []).find((c) => c?._id === categoryId) || null;
          const type = String(cat?.type || budgetCategoryTypeById?.[categoryId] || '').toLowerCase();
          if (type && type !== 'expense') continue;
          const spent = Math.max(0, Number(spentByCategory.get(categoryId) || 0));
          if (spent <= budget) continue;
          overList.push({
            categoryId,
            name: cat?.name || t('category'),
            spent,
            budget,
            over: spent - budget,
            pct: budget > 0 ? spent / budget : 0,
          });
        }

        overList
          .sort((a, b) => (b.over - a.over) || (b.pct - a.pct))
          .slice(0, 2)
          .forEach((r) => {
            push({
              id: `cat_budget_over_${selectedMonth}_${r.categoryId}`,
              tone: 'rose',
              icon: Target,
              title: t('notif_cat_over_title', { name: r.name }),
              body: t('notif_cat_over_body', {
                spent: formatTHB(r.spent),
                budget: formatTHB(r.budget),
                over: formatTHB(r.over),
              }),
              href: '/budget',
              cta: t('notif_cat_over_cta'),
            });
          });
      }
    }

    if (hasBudget && isCurrentMonth && expectedSpendSoFar > 0 && expense / expectedSpendSoFar >= 1.15) {
      push({
        id: `budget_pace_${selectedMonth}`,
        tone: 'amber',
        icon: Zap,
        title: t('notif_budget_pace_title'),
        body: t('notif_budget_pace_body', { expected: formatTHB(expectedSpendSoFar), spent: formatTHB(expense) }),
        href: '/analytics',
        cta: t('notif_budget_pace_cta'),
      });
    }

    if (income <= 0 && expense > 0) {
      push({
        id: `no_income_${selectedMonth}`,
        tone: 'rose',
        icon: Wallet,
        title: t('notif_no_income_title'),
        body: t('notif_no_income_body', { expense: formatTHB(expense) }),
        href: '/transactions',
        cta: t('notif_no_income_cta'),
      });
    }

    if (isCurrentMonth && dailyTargetToday > 0 && todaySpend > dailyTargetToday * 1.25) {
      push({
        id: `daily_over_${selectedMonth}`,
        tone: 'amber',
        icon: TrendingDownIcon,
        title: t('notif_daily_over_title'),
        body: t('notif_daily_over_body', { spent: formatTHB(todaySpend), target: formatTHB(dailyTargetToday) }),
        href: '/transactions',
        cta: t('notif_daily_over_cta'),
      });
    }

    if (Array.isArray(leakItems) && leakItems[0] && expense > 0) {
      const top = leakItems[0];
      const pct = top.amount / Math.max(1, expense);
      if (pct >= 0.35) {
        push({
          id: `leak_top_${selectedMonth}`,
          tone: 'sky',
          icon: TrendingDownIcon,
          title: t('notif_leak_top_title'),
          body: t('notif_leak_top_body', { name: top.name, pct: Math.round(pct * 100) }),
          href: '/analytics',
          cta: t('notif_leak_top_cta'),
        });
      }
    }

    if (isCurrentMonth && daysUntilReset > 0 && daysUntilReset <= 3 && hasBudget) {
      push({
        id: `reset_soon_${selectedMonth}`,
        tone: 'sky',
        icon: AlarmClock,
        title: t('notif_reset_soon_title'),
        body: t('notif_reset_soon_body', { days: daysUntilReset }),
        href: '/budget',
        cta: t('notif_reset_soon_cta'),
      });
    }

    if (list.length === 0) {
      push({
        id: `all_good_${selectedMonth}`,
        tone: 'emerald',
        icon: TrendingUpIcon,
        title: t('notif_all_good_title'),
        body: t('notif_all_good_body'),
        href: '/analytics',
        cta: t('notif_all_good_cta'),
      });
    }

    return list;
  }, [
    loading,
    monthIncomeTotal,
    monthExpenseTotal,
    monthExpenseBudgetTotal,
    budgetsByMonth,
    categories,
    budgetCategoryTypeById,
    stats.transactionsAll,
    selectedParsed,
    daysInSelectedMonth,
    daysUntilReset,
    todaySpend,
    dailyTargetToday,
    leakItems,
    selectedMonth,
    nowBkk,
    t,
    formatTHB,
  ]);

  const unreadNotifCount = useMemo(() => {
    const read = readNotifMap || {};
    return (notifications || []).reduce((acc, n) => acc + (read?.[n.id] ? 0 : 1), 0);
  }, [notifications, readNotifMap]);

  const markNotifRead = (id) => {
    if (!id) return;
    setReadNotifMap((prev) => {
      const curr = prev && typeof prev === 'object' ? prev : {};
      if (curr[id]) return curr;
      return { ...curr, [id]: Date.now() };
    });
  };

  const markAllNotifsRead = () => {
    setReadNotifMap((prev) => {
      const curr = prev && typeof prev === 'object' ? prev : {};
      const next = { ...curr };
      (notifications || []).forEach((n) => {
        if (n?.id && !next[n.id]) next[n.id] = Date.now();
      });
      return next;
    });
  };

  const notifToneUI = (tone) => {
    if (tone === 'rose') return { iconBg: 'bg-rose-500/15 text-rose-200 ring-rose-400/20', border: 'border-rose-400/15' };
    if (tone === 'amber') return { iconBg: 'bg-amber-500/15 text-amber-200 ring-amber-400/20', border: 'border-amber-400/15' };
    if (tone === 'sky') return { iconBg: 'bg-sky-500/15 text-sky-200 ring-sky-400/20', border: 'border-sky-400/15' };
    return { iconBg: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/20', border: 'border-emerald-400/15' };
  };

	  const budgetRowsExpense = useMemo(() => {
	    const monthBudgets = budgetsByMonth?.[selectedMonth] || {};
	    const entries = Object.entries(monthBudgets || {});
	    if (!entries.length) return [];

    const spentByCategory = new Map();
    const src = Array.isArray(stats.transactionsAll) ? stats.transactionsAll : [];
    for (const t of src) {
      if (!t || t.type !== 'expense') continue;
      const id = t.category?._id || t.category || '';
      if (!id) continue;
      spentByCategory.set(id, (spentByCategory.get(id) || 0) + (Number(t.amount) || 0));
    }

	    const colors = ['#FB7185', '#FACC15', '#38BDF8']; // rose, amber, sky
	    const rows = entries
	      .map(([categoryId, total]) => {
	        const cat = (categories || []).find((c) => c?._id === categoryId);
	        const type = (cat?.type || budgetCategoryTypeById?.[categoryId] || '').toString();
	        if (type && type !== 'expense') return null;
	        const budget = Number(total) || 0;
	        const spent = Math.max(0, Number(spentByCategory.get(categoryId) || 0));
	        return {
	          id: categoryId,
	          name: cat?.name || t('category'),
	          icon: cat?.icon || 'other',
	          spent,
	          budget,
	          pct: budget > 0 ? Math.max(0, Math.min(1, spent / budget)) : 0,
	        };
	      })
	      .filter(Boolean)
	      .filter((r) => r.budget > 0);

	    const idxMap = categoryOrderIndex.expense;
	    const sorted = [...rows].sort((a, b) => {
	      const ia = idxMap.has(String(a.id)) ? idxMap.get(String(a.id)) : Number.POSITIVE_INFINITY;
	      const ib = idxMap.has(String(b.id)) ? idxMap.get(String(b.id)) : Number.POSITIVE_INFINITY;
	      if (ia !== ib) return ia - ib;
	      return (Number(b.pct) || 0) - (Number(a.pct) || 0);
	    });

	    return sorted.map((r, idx) => ({ ...r, color: colors[idx % colors.length] }));
	  }, [budgetsByMonth, selectedMonth, stats.transactionsAll, categories, budgetCategoryTypeById, categoryOrderIndex, t]);

	  const budgetRowsIncome = useMemo(() => {
	    const monthBudgets = budgetsByMonth?.[selectedMonth] || {};
	    const entries = Object.entries(monthBudgets || {});
	    if (!entries.length) return [];

    const receivedByCategory = new Map();
    const src = Array.isArray(stats.transactionsAll) ? stats.transactionsAll : [];
    for (const t of src) {
      if (!t || t.type !== 'income') continue;
      const id = t.category?._id || t.category || '';
      if (!id) continue;
      receivedByCategory.set(id, (receivedByCategory.get(id) || 0) + (Number(t.amount) || 0));
    }

	    const colors = ['#34D399', '#38BDF8', '#A78BFA']; // emerald, sky, violet
	    const rows = entries
	      .map(([categoryId, total]) => {
	        const cat = (categories || []).find((c) => c?._id === categoryId);
	        const type = (cat?.type || budgetCategoryTypeById?.[categoryId] || '').toString();
	        if (type && type !== 'income') return null;
	        const budget = Number(total) || 0;
	        const received = Math.max(0, Number(receivedByCategory.get(categoryId) || 0));
	        const pctRaw = budget > 0 ? received / budget : 0;
	        const pctClamped = Math.max(0, Math.min(1, pctRaw));
	        const alpha = 0.25 + 0.75 * pctClamped; // keep visible even when pct is low
	        return {
	          id: categoryId,
	          name: cat?.name || t('category'),
	          icon: cat?.icon || 'other',
	          received,
	          budget,
	          pct: pctClamped,
	          alpha,
	        };
	      })
	      .filter(Boolean)
	      .filter((r) => r.budget > 0);

	    const idxMap = categoryOrderIndex.income;
	    const sorted = [...rows].sort((a, b) => {
	      const ia = idxMap.has(String(a.id)) ? idxMap.get(String(a.id)) : Number.POSITIVE_INFINITY;
	      const ib = idxMap.has(String(b.id)) ? idxMap.get(String(b.id)) : Number.POSITIVE_INFINITY;
	      if (ia !== ib) return ia - ib;
	      return (Number(b.pct) || 0) - (Number(a.pct) || 0);
	    });

	    return sorted.map((r, idx) => ({ ...r, color: colors[idx % colors.length] }));
	  }, [budgetsByMonth, selectedMonth, stats.transactionsAll, categories, budgetCategoryTypeById, categoryOrderIndex, t]);

  const budgetCardType = recentTxnType === 'income' ? 'income' : 'expense';
  const budgetRows = budgetCardType === 'income' ? budgetRowsIncome : budgetRowsExpense;

		  const incomeMonthCategoryRows = useMemo(() => {
		    const src = Array.isArray(stats.transactionsAll) ? stats.transactionsAll : [];
		    const map = new Map();
    for (const txn of src) {
      if (!txn || txn.type !== 'income') continue;
      const id = txn.category?._id || txn.category || '_none';
      const amt = Number(txn.amount) || 0;
      if (amt <= 0) continue;
      const prev = map.get(id) || {
        id,
        name: txn.category?.name || t('unspecified'),
        icon: txn.category?.icon || 'other',
        received: 0,
        txCount: 0,
      };
      prev.received += amt;
      prev.txCount += 1;
      map.set(id, prev);
    }

	    const colors = ['#34D399', '#38BDF8', '#A78BFA', '#FACC15', '#FB7185', '#60A5FA'];
	    const idxMap = categoryOrderIndex.income;
	    const list = Array.from(map.values()).sort((a, b) => {
	      const ia = idxMap.has(String(a.id)) ? idxMap.get(String(a.id)) : Number.POSITIVE_INFINITY;
	      const ib = idxMap.has(String(b.id)) ? idxMap.get(String(b.id)) : Number.POSITIVE_INFINITY;
	      if (ia !== ib) return ia - ib;
	      return (Number(b.received) || 0) - (Number(a.received) || 0);
	    });
	    const maxReceived = Math.max(1, ...list.map((r) => Number(r?.received) || 0));
	    return list.map((r, idx) => {
	      const pct01 = Math.max(0, Math.min(1, (Number(r?.received) || 0) / maxReceived));
	      const alpha = 0.25 + 0.75 * pct01;
	      return { ...r, color: colors[idx % colors.length], alpha };
	    });
	  }, [stats.transactionsAll, categoryOrderIndex, t]);

  const showIncomeRowsWithoutTarget =
    budgetCardType === 'income' &&
    (budgetRowsIncome?.length || 0) === 0 &&
    (incomeMonthCategoryRows?.length || 0) > 0;

  const budgetCardTitle =
    budgetCardType === 'income'
      ? (showIncomeRowsWithoutTarget ? t('income_by_category') : t('income_target_by_category'))
      : t('budget');

  const recentTransactionsFiltered = useMemo(() => {
    if (recentTxnType === 'income') return Array.isArray(stats?.recentIncome) ? stats.recentIncome : [];
    if (recentTxnType === 'expense') return Array.isArray(stats?.recentExpense) ? stats.recentExpense : [];
    return Array.isArray(stats?.recentTransactions) ? stats.recentTransactions : [];
  }, [stats?.recentTransactions, stats?.recentIncome, stats?.recentExpense, recentTxnType]);

  /* --- JSX Rendering --- */

  return (
    <main className="min-h-[100dvh] bg-[var(--app-bg)] text-[color:var(--app-text)]">
      <div className="mx-auto w-full max-w-lg px-4 pt-5 pb-[calc(env(safe-area-inset-bottom)+88px)] space-y-4 lg:max-w-6xl lg:px-6 lg:space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-11 w-11 rounded-full bg-[var(--app-surface)] shadow-sm shadow-black/10 border border-[color:var(--app-border)] flex items-center justify-center shrink-0">
              {userProfile.profilePic ? (
                <img
                  src={userProfile.profilePic}
                  alt={userProfile.name || 'Profile'}
                  className="h-10 w-10 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-500/15 text-blue-200 ring-1 ring-blue-400/25 flex items-center justify-center font-extrabold">
                  {(userProfile.name || 'B').trim().slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-[color:var(--app-muted)] truncate">{t('welcome_back')}</div>
              <div className="text-lg font-extrabold text-[color:var(--app-text)] truncate">{userProfile.name || 'Balanz'}</div>
              <div className="text-[11px] font-semibold text-[color:var(--app-muted-2)]">{formatCurrentDate()}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            

            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--app-surface)] shadow-sm shadow-black/10 border border-[color:var(--app-border)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition"
              aria-label={t('notifications')}
              title={t('notifications')}
            >
              {unreadNotifCount > 0 && (
                <span
                  className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-extrabold text-white ring-2 ring-[color:var(--app-bg)]"
                  aria-label={t('new_notifications_aria', { count: unreadNotifCount })}
                >
                  {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                </span>
              )}
              <Bell className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Month selector */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-2 shadow-sm shadow-black/10">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonthIndex((p) => Math.max(0, p - 1))}
                disabled={currentMonthIndex === 0}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-40"
                aria-label={t('prev_month')}
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
                aria-label={t('open_month_picker')}
              >
                <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('selected_month')}</div>
                <div className="truncate text-sm font-extrabold text-[color:var(--app-text)]">{selectedMonth}</div>
              </button>

              <button
                type="button"
                onClick={() => setCurrentMonthIndex((p) => Math.min(months.length - 1, p + 1))}
                disabled={currentMonthIndex === months.length - 1}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-40"
                aria-label={t('next_month')}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Currency Modal */}
        {showCurrencyModal && (
          <CurrencyModalContent onClose={() => setShowCurrencyModal(false)} />
        )}

        {/* Month Picker Modal */}
        {showMonthPicker && (
          <div
            className="fixed inset-0 z-[75] bg-slate-950/45 backdrop-blur-sm flex items-start justify-center p-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+88px)]"
            onClick={(e) => e.target === e.currentTarget && setShowMonthPicker(false)}
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between gap-3 border-b border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-5 py-4">
                <div>
                  <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('pick_month')}</div>
                  <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('pick_month_hint')}</div>
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
                    className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-40"
                    aria-label={t('prev_year')}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

	                  <div ref={monthPickerYearMenuRef} className="min-w-0 flex-1 text-center relative">
	                    <button
	                      type="button"
	                      onClick={() => setMonthPickerYearMenuOpen((v) => !v)}
	                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-4 py-2 text-sm font-extrabold text-[color:var(--app-text)] shadow-sm shadow-black/10 hover:bg-[var(--app-surface-3)] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition"
	                      aria-label={t('pick_year')}
	                      aria-haspopup="listbox"
	                      aria-expanded={monthPickerYearMenuOpen}
	                    >
	                      <span className="tabular-nums">{Number(monthPickerYear) + 543}</span>
	                    </button>

	                    {monthPickerYearMenuOpen && (
	                      <div
	                        role="listbox"
	                        className="absolute left-1/2 z-10 mt-2 w-[min(260px,100%)] -translate-x-1/2 overflow-hidden rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)]/95 backdrop-blur shadow-2xl shadow-black/40 ring-1 ring-white/10"
	                      >
	                        <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-2">
	                          <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('pick_year')}</div>
	                          <button
	                            type="button"
	                            onClick={() => {
	                              const y = getBangkokDateParts(Date.now())?.year || new Date().getFullYear();
	                              setMonthPickerYear(y);
	                              setMonthPickerYearMenuOpen(false);
	                            }}
	                            className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-extrabold text-slate-100 hover:bg-white/10"
	                          >
	                            {t('this_year')}
	                          </button>
	                        </div>

	                        <div className="max-h-56 overflow-y-auto p-1.5">
	                          {availableYears.map((y) => {
	                            const active = Number(y) === Number(monthPickerYear);
	                            return (
	                              <button
	                                key={y}
	                                type="button"
	                                role="option"
	                                aria-selected={active}
	                                onClick={() => {
	                                  setMonthPickerYear(y);
	                                  setMonthPickerYearMenuOpen(false);
	                                }}
	                                className={[
	                                  'w-full rounded-xl px-3 py-2 text-sm font-extrabold transition',
	                                  'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
	                                  active
	                                    ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/25'
	                                    : 'text-slate-100 hover:bg-white/10',
	                                ].join(' ')}
	                              >
	                                <span className="flex items-center justify-between gap-2">
	                                  <span className="tabular-nums">{y + 543}</span>
	                                  {active && <Check className="h-4 w-4" aria-hidden="true" />}
	                                </span>
	                              </button>
	                            );
	                          })}
	                        </div>
	                      </div>
	                    )}

	                    <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">{t('buddhist_era')}</div>
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
                    aria-label={t('next_year')}
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
	                        }}
	                        className={[
	                          'relative h-11 rounded-2xl border px-3 text-sm font-extrabold transition',
	                          'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
	                          disabled
	                            ? 'border-white/10 bg-white/5 text-[color:var(--app-muted-2)] opacity-50 cursor-not-allowed'
	                            : isActive
	                              ? 'border-emerald-400/30 bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20'
	                              : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 active:scale-[0.99]',
	                        ].join(' ')}
	                      >
	                        <span className="inline-flex items-center justify-center gap-1.5">
	                          {m.name}
	                          {isActive && <Check className="h-4 w-4" aria-hidden="true" />}
	                        </span>
	                      </button>
	                    );
	                  })}
	                </div>
              </div>

              <div className="border-t border-white/10 bg-white/5 p-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const idx = currentMonthInitialIndex !== -1 ? currentMonthInitialIndex : currentMonthIndex;
                    setCurrentMonthIndex(idx);
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

        {/* Notifications Modal */}
        {showNotifications && (
          <div
            className="fixed inset-0 z-[70] bg-slate-950/45 backdrop-blur-sm flex items-start justify-center p-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-[calc(env(safe-area-inset-bottom)+88px)]"
            onClick={(e) => e.target === e.currentTarget && setShowNotifications(false)}
          >
            <div className="w-full max-w-md overflow-hidden rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-white/5 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/5 ring-1 ring-white/10 text-slate-200">
                    <Bell className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('notif_title')}</div>
                    <div className="text-[11px] font-semibold text-slate-400">
                      {unreadNotifCount > 0 ? t('notif_unread', { count: unreadNotifCount }) : t('notif_unread_none')}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                  aria-label={t('close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[62dvh] overflow-y-auto p-4 space-y-3">
                {notifications.map((n) => {
                  const read = !!readNotifMap?.[n.id];
                  const Icon = n.icon || Bell;
                  const ui = notifToneUI(n.tone);
                  const row = (
                    <div
                      className={[
                        'rounded-3xl border bg-white/0 p-4 transition',
                        'hover:bg-white/5',
                        ui.border,
                        read ? 'opacity-80' : 'opacity-100',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            'h-11 w-11 rounded-2xl shrink-0 ring-1 flex items-center justify-center',
                            ui.iconBg,
                          ].join(' ')}
                          aria-hidden="true"
                        >
                          <Icon className="h-5 w-5" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-extrabold text-[color:var(--app-text)]">{n.title}</div>
                              <div className="mt-1 text-xs font-semibold text-slate-400">{n.body}</div>
                            </div>
                            {!read && <span className="mt-1 h-2 w-2 rounded-full bg-rose-400" aria-hidden="true" />}
                          </div>

                          {n.cta && (
                            <div className="mt-3 inline-flex items-center gap-2 text-xs font-extrabold text-emerald-200">
                              {n.cta}
                              <ChevronRight className="h-4 w-4" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  if (n.href) {
                    return (
                      <Link
                        key={n.id}
                        href={n.href}
                        onClick={() => {
                          markNotifRead(n.id);
                          setShowNotifications(false);
                        }}
                        className="block focus:outline-none focus:ring-2 focus:ring-emerald-400/30 rounded-3xl"
                      >
                        {row}
                      </Link>
                    );
                  }

                  return (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => markNotifRead(n.id)}
                      className="block w-full text-left focus:outline-none focus:ring-2 focus:ring-emerald-400/30 rounded-3xl"
                    >
                      {row}
                    </button>
                  );
                })}
              </div>

              <div className="border-t border-white/10 bg-white/5 p-3 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => { markAllNotifsRead(); }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-extrabold text-slate-100 hover:bg-white/10"
                >
                  {t('mark_all_read')}
                </button>
                <Link
                  href="/transactions"
                  onClick={() => setShowNotifications(false)}
                  className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:brightness-95"
                >
                  {t('go_transactions')}
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-200 shadow-sm">
            <svg className="w-5 h-5 text-rose-200 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            <p className="text-rose-200 font-semibold text-sm">{error}</p>
          </div>
        )}

        {/* Desktop layout: split into 2 columns; mobile stays stacked */}
        <div className="space-y-4 lg:grid lg:grid-cols-12 lg:gap-6 lg:space-y-0">
          <div className="space-y-4 lg:col-span-5">
            {/* Income / Expense quick filter (tap to filter list + budgets) */}
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              {(() => {
                const expense = Math.max(0, Number(monthExpenseTotal) || 0);
                const expenseBudget = Math.max(0, Number(monthExpenseBudgetTotal) || 0);
                const expHasTarget = expenseBudget > 0;
                const expPct = expHasTarget ? Math.round((expense / expenseBudget) * 100) : null;
                const expPctClamped = expHasTarget ? Math.max(0, Math.min(100, (expense / expenseBudget) * 100)) : 0;
                const expDiff = expenseBudget - expense;
                const expActive = recentTxnType === 'expense';

                const income = Math.max(0, Number(monthIncomeTotal) || 0);
                const incomeTarget = Math.max(0, Number(monthIncomeBudgetTotal) || 0);
                const incHasTarget = incomeTarget > 0;
                const incPct = incHasTarget ? Math.round((income / incomeTarget) * 100) : null;
                const incPctClamped = incHasTarget ? Math.max(0, Math.min(100, (income / incomeTarget) * 100)) : 0;
                const incDiff = incomeTarget - income;
                const incActive = recentTxnType === 'income';
                const incVisualPct = incHasTarget ? incPctClamped : (income > 0 ? 100 : 8);
                const incVisualPctClamped = Math.max(1, Math.min(100, Number(incVisualPct) || 0));

                return (
                  <>
                    <button
                      type="button"
                      onClick={() => setRecentTxnType((p) => (p === 'expense' ? 'all' : 'expense'))}
                      className={[
                        'rounded-3xl border p-4 text-left shadow-sm shadow-black/10 transition focus:outline-none focus:ring-2',
                        expActive
                          ? 'border-rose-400/30 bg-rose-500/10 focus:ring-rose-400/25'
                          : 'border-[color:var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-3)] focus:ring-emerald-400/20',
                      ].join(' ')}
                      aria-pressed={expActive}
                    >
                      <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('expense')}</div>
                      <div className="mt-1 text-xl font-extrabold text-rose-300">{formatTHB(expense)}</div>
                      {expHasTarget ? (
                        <>
                          <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
                            {expDiff >= 0
                              ? t('left_from_budget', { amount: formatTHB(expDiff) })
                              : t('over_from_budget', { amount: formatTHB(Math.abs(expDiff)) })}{' '}
                            • {expPct}%
                          </div>
                          <div className="mt-2 h-2.5 w-full rounded-full bg-black/25 ring-1 ring-white/10 overflow-hidden">
                            <div className="h-full rounded-full bg-rose-400" style={{ width: `${expPctClamped}%` }} />
                          </div>
                        </>
                      ) : (
                        <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted-2)]">{t('tap_expense_only')}</div>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecentTxnType((p) => (p === 'income' ? 'all' : 'income'))}
                      className={[
                        'rounded-3xl border p-4 text-left shadow-sm shadow-black/10 transition focus:outline-none focus:ring-2',
                        incActive
                          ? 'border-emerald-400/30 bg-emerald-500/10 focus:ring-emerald-400/25'
                          : 'border-[color:var(--app-border)] bg-[var(--app-surface)] hover:bg-[var(--app-surface-3)] focus:ring-emerald-400/20',
                      ].join(' ')}
                      aria-pressed={incActive}
                    >
                      <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('income')}</div>
                      <div className="mt-1 text-xl font-extrabold text-emerald-300">{formatTHB(income)}</div>
                      <div className="mt-1 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
                        {incHasTarget
                          ? (incDiff >= 0
                            ? t('left_from_goal', { amount: formatTHB(incDiff) })
                            : t('over_from_goal', { amount: formatTHB(Math.abs(incDiff)) }))
                          : t('tap_income_only')}
                      </div>
                      <div className="mt-2 h-2.5 w-full rounded-full bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${incVisualPctClamped}%` }} />
                      </div>
                    </button>
                  </>
                );
              })()}
            </div>

            {/* Budget */}
            <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm shadow-black/10">
              <div className="flex items-center justify-between">
                <div className="text-lg font-extrabold text-[color:var(--app-text)]">{budgetCardTitle}</div>
                <div className="flex items-center gap-3">
                  <div className="text-xs font-semibold text-[color:var(--app-muted-2)]">{t('reset_in_days', { count: daysUntilReset })}</div>
                  {budgetRows.length > 5 && (
                    <Link href="/budget" className="text-xs font-extrabold text-sky-300 hover:text-sky-200">
                      {t('view_all')}
                    </Link>
                  )}
                </div>
              </div>

              {/* Summary grid (match reference UI) */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm shadow-black/10">
                  <div className="text-xs font-semibold text-slate-400">{t('spent_today')}</div>
                  <div className="mt-1 flex flex-col sm:flex-row sm:items-end gap-1 sm:gap-2 min-w-0">
                    <div className="text-xl sm:text-2xl font-extrabold text-[color:var(--app-text)] break-words">{formatTHB(todaySpend)}</div>
                    <div className="sm:pb-1 text-xs sm:text-sm font-semibold text-[color:var(--app-muted-2)] break-words">
                      {dailyTargetToday > 0 ? t('per_day_allowance', { amount: formatTHB(dailyTargetToday) }) : t('no_income_this_month')}
                    </div>
                  </div>
                  <div className="mt-3 h-2.5 w-full rounded-full bg-black/25 ring-1 ring-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400"
                      style={{ width: `${dailyTargetToday > 0 ? Math.max(0, Math.min(100, (todaySpend / dailyTargetToday) * 100)) : 0}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm shadow-black/10">
                  <div className="text-xs font-semibold text-slate-400">{t('remaining_this_month')}</div>
                  <div className={`mt-1 text-2xl sm:text-3xl font-extrabold break-words ${monthRemaining < 0 ? 'text-rose-300' : 'text-[color:var(--app-text)]'}`}>
                    {loading ? '—' : formatTHB(monthRemaining)}
                  </div>
                </div>
              </div>

              {showIncomeRowsWithoutTarget ? (
                <div className="mt-4 space-y-4">
                  {incomeMonthCategoryRows.slice(0, 5).map((r) => (
                    <div key={r.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                            <div className="scale-90">{renderIcon(r.icon)}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                              <div className="text-sm font-extrabold text-[color:var(--app-text)] truncate">{r.name}</div>
                            </div>
                            <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
                              {t('received_already', { amount: formatTHB(r.received) })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-extrabold text-emerald-300">{formatTHB(r.received)}</div>
                        </div>
                      </div>
                      <div className="mt-2 h-2.5 w-full rounded-full bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: r.color, opacity: r.alpha }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : budgetRows.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {budgetRows.slice(0, 5).map((r) => (
                    <div key={r.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-2xl bg-white/5 ring-1 ring-white/10 flex items-center justify-center shrink-0">
                            <div className="scale-90">{renderIcon(r.icon)}</div>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                              <div className="text-sm font-extrabold text-[color:var(--app-text)] truncate">{r.name}</div>
                            </div>
                            <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
                              {budgetCardType === 'income'
                                ? t('target_received', { budget: formatTHB(r.budget), received: formatTHB(r.received) })
                                : t('budget_spent', { budget: formatTHB(r.budget), spent: formatTHB(r.spent) })}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-extrabold text-slate-100">
                            {budgetCardType === 'income' ? '' : `${Math.round(r.pct * 100)}%`}
                          </div>
                          <div className="text-[11px] font-semibold text-[color:var(--app-muted-2)]">
                            {budgetCardType === 'income'
                              ? t('remaining_from_target', { amount: formatTHB(Math.max(0, r.budget - r.received)) })
                              : t('remaining_amount', { amount: formatTHB(Math.max(0, r.budget - r.spent)) })}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 h-2.5 w-full rounded-full bg-black/25 ring-1 ring-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: budgetCardType === 'income' ? '100%' : `${Math.round(r.pct * 100)}%`,
                            backgroundColor: r.color,
                            opacity: budgetCardType === 'income' ? (r.alpha ?? 1) : 1,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          {/* Recent Transactions Section */}
          <div className="lg:col-span-7">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 rounded-full bg-emerald-400" />
                <h2 className="text-lg sm:text-xl font-extrabold text-[color:var(--app-text)]">{t('recent_transactions')}</h2>
              </div>
              <Link href="/transactions" className="text-sm font-extrabold text-emerald-300 hover:text-emerald-200">
                {t('view_all')}
              </Link>
            </div>

            <div className="mt-3 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5 shadow-sm shadow-black/10">
              {loading ? (
                <div className="text-center py-10">
                  <LoadingMascot label={t('loading')} size={72} />
                </div>
              ) : recentTransactionsFiltered.length === 0 ? (
                <div className="text-center py-10">
                  <svg className="w-16 h-16 mx-auto text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                  </svg>
                  <p className="text-slate-200 text-sm font-extrabold">{t('no_transactions')}</p>
                  <p className="text-slate-400 text-xs mt-1 font-semibold">{t('add_new_hint')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTransactionsFiltered.map((txn, index) => (
                    <div
                      key={txn._id}
                      onClick={() => handleView(txn)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleView(txn);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      className="group w-full cursor-pointer rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-3)] p-4 text-left shadow-sm shadow-black/10 hover:bg-[var(--app-surface-3)] hover:shadow-md transition active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={[
                              'h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0',
                              txn.type === 'income'
                                ? 'bg-gradient-to-br from-emerald-500 to-green-500'
                                : 'bg-gradient-to-br from-rose-500 to-rose-600',
                            ].join(' ')}
                            aria-hidden="true"
                          >
                            {renderIcon(txn.category?.icon)}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-extrabold text-[color:var(--app-text)]">
                                  {txn.category?.name || t('uncategorized')}
                                </div>
                                <div className="mt-1 truncate text-xs font-semibold text-slate-400">
                                  {txn.notes || '—'}
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 text-[11px] font-semibold text-[color:var(--app-muted-2)]">
                              {new Date(txn.date).toLocaleDateString(uiLocale, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="text-sm font-extrabold" style={{ color: txn.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR }}>
                            {txn.type === 'expense' ? '-' : '+'}{Number(txn.amount || 0).toLocaleString(uiLocale)} ฿
                          </div>
                          <div className="mt-2 flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleEdit(txn); }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 shadow-sm shadow-black/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                              title={t('edit')}
                              aria-label={t('edit')}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleDelete(txn._id); }}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 shadow-sm shadow-black/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-rose-400/25"
                              title={t('delete')}
                              aria-label={t('delete')}
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
      
    
      {/* Floating Add Button */}
      <button
        type="button"
        onClick={() => {
          setSlipError('');
          setVoiceError('');
          setError('');
          resetSlipState();
          resetVoiceState();
          setAutoCategoryApplied('');
          setAddInlinePanel('none');
          setAddFormData({
            amount: '',
            type: 'expense',
            category: '',
            date: toBangkokISODateKey(Date.now()),
            notes: '',
          });
          setShowAddModal(true);
          setShowDatePicker(false);
        }}
	        className={[
            'fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-[60] inline-flex h-14 w-14 items-center justify-center rounded-3xl',
            'bg-emerald-500 text-slate-950',
            'border border-[color:var(--app-border)] ring-1 ring-emerald-400/25',
            'shadow-2xl shadow-black/20 hover:brightness-95',
            'focus:outline-none focus:ring-2 focus:ring-emerald-400/40',
            'lg:right-8',
          ].join(' ')}
        title={t('add_transaction')}
        aria-label={t('add_transaction')}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Voice Modal */}
      {mounted && showVoiceModal && createPortal((
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[env(safe-area-inset-bottom)] sm:pb-0"
          onClick={(e) => e.target === e.currentTarget && !voiceRecording && !voiceLoading && setShowVoiceModal(false)}
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-black/40 overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-5 py-4">
              <div>
                <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('voice_title')}</div>
                <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('voice_subtitle')}</div>
              </div>
              <button
                type="button"
                onClick={() => { if (!voiceRecording && !voiceLoading) setShowVoiceModal(false); }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-50"
                aria-label={t('close')}
                disabled={voiceRecording || voiceLoading}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {voiceError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                  {voiceError}
                </div>
              ) : null}

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('status')}</div>
                    <div className="mt-1 text-sm font-extrabold text-[color:var(--app-text)]">
                      {voiceRecording ? t('recording') : voiceBlob ? t('recorded') : t('ready_to_record')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('time')}</div>
                    <div className="mt-1 text-sm font-extrabold text-slate-100 tabular-nums">
                      {formatVoiceDuration(voiceSeconds)}
                    </div>
                  </div>
                </div>
                {voiceLoading ? (
                  <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--app-muted)]">
                    <span className="inline-flex h-4 w-4 rounded-full border-2 border-white/20 border-t-violet-300 animate-spin" aria-hidden="true" />
                    {t('transcribing')}
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => {
                  if (voiceLoading) return;
                  if (voiceRecording) stopVoiceRecording({ autoTranscribe: true });
                  else startVoiceRecording();
                }}
                disabled={voiceLoading}
                className={[
                  'h-14 w-full rounded-3xl font-extrabold transition flex items-center justify-center gap-3',
                  voiceRecording
                    ? 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/25 hover:bg-rose-500/20'
                    : 'bg-emerald-500 text-slate-950 hover:brightness-95',
                  voiceLoading ? 'opacity-70 cursor-wait' : '',
                ].join(' ')}
              >
                <Mic className="h-5 w-5" aria-hidden="true" />
                {voiceRecording ? t('stop_auto_transcribe') : t('start_recording')}
              </button>

              <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('transcript')}</div>
                <div className="mt-2 text-sm font-semibold text-[color:var(--app-text)] whitespace-pre-wrap break-words">
                  {voiceTranscript ? voiceTranscript : '—'}
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-white/5 p-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => { if (!voiceRecording && !voiceLoading) setShowVoiceModal(false); }}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-extrabold text-slate-100 hover:bg-white/10 disabled:opacity-60"
                disabled={voiceRecording || voiceLoading}
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={applyVoiceTranscriptToAddForm}
                disabled={!String(voiceTranscript || '').trim() || voiceRecording || voiceLoading}
                className="rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-extrabold text-slate-950 hover:brightness-95 disabled:opacity-60"
              >
                {t('use_autofill')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* Add Transaction Modal */}
      {mounted && showAddModal && createPortal((
        <div
          className="fixed inset-0 z-[10005] bg-slate-950/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+8px)] sm:pb-0"
          onClick={(e) => e.target === e.currentTarget && closeAddModal()}
        >
	          <form
	            onSubmit={handleAddSubmit}
	            className="w-full sm:max-w-md max-h-[92dvh] flex flex-col bg-[var(--app-surface)] text-[color:var(--app-text)] rounded-t-[32px] sm:rounded-[32px] border border-[color:var(--app-border)] shadow-2xl shadow-black/20 overflow-hidden"
	            onClick={(e) => e.stopPropagation()}
	          >
	            <div className="relative px-5 pt-5 pb-4 sm:pt-6 sm:pb-5">
	              <button
	                type="button"
	                onClick={() => closeAddModal()}
	                className="absolute left-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]"
	                aria-label={t('close')}
	              >
	                <X className="h-5 w-5" aria-hidden="true" />
	              </button>
	              <div className="text-center text-base font-extrabold tracking-wide">{t('add_transaction')}</div>
	            </div>

              <>
                  <div className="px-5">
                    <div className="grid grid-cols-2 rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAutoCategoryApplied('');
                          setAddFormData((prev) => ({
                            ...prev,
                            type: 'expense',
                            category: prev.category && (categories || []).some((c) => c?._id === prev.category && c?.type === 'expense')
                              ? prev.category
                              : '',
                          }));
                        }}
                        className={[
                          'h-11 rounded-full text-sm font-extrabold transition',
                          addFormData.type === 'expense'
                            ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/20'
                            : 'text-[color:var(--app-muted)] hover:bg-[var(--app-surface-3)]',
                        ].join(' ')}
                      >
                        {t('expense')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAutoCategoryApplied('');
                          setAddFormData((prev) => ({
                            ...prev,
                            type: 'income',
                            category: prev.category && (categories || []).some((c) => c?._id === prev.category && c?.type === 'income')
                              ? prev.category
                              : '',
                          }));
                        }}
                        className={[
                          'h-11 rounded-full text-sm font-extrabold transition',
                          addFormData.type === 'income'
                            ? 'bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-400/20'
                            : 'text-[color:var(--app-muted)] hover:bg-[var(--app-surface-3)]',
                        ].join(' ')}
                      >
                        {t('income')}
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto [-webkit-overflow-scrolling:touch] px-5 pt-6 pb-5 space-y-5">
                    <div className="text-center">
                      <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('amount')}</div>
                      <div className="mt-3 flex items-center justify-center gap-2">
                        <div className="text-emerald-300 text-2xl font-extrabold">฿</div>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={addFormData.amount}
                          onChange={(e) => setAddFormData((prev) => ({ ...prev, amount: e.target.value }))}
                          placeholder="0.00"
                          className="w-[240px] bg-transparent text-center text-6xl font-extrabold tracking-tight text-[color:var(--app-text)] outline-none placeholder:text-[color:var(--app-muted-2)]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSlipError('');
                          resetSlipState();
                          setAddInlinePanel('voice');
                          resetVoiceState();
                          cleanupVoiceDevices();
                          startVoiceRecording();
                        }}
                        className="h-14 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] font-extrabold flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                      >
                        <Mic className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                        {t('voice')}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setVoiceError('');
                          resetVoiceState();
                          cleanupVoiceDevices();
                          setAddInlinePanel('slip');
                          resetSlipState();
                          try { slipInputRef.current && slipInputRef.current.click(); } catch {}
                        }}
                        className="h-14 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] font-extrabold flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-400/25"
                      >
                        <ScanLine className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                        {t('scan_receipt')}
                      </button>
                    </div>

                    <input
                      ref={slipInputRef}
	                      id="add-slip-upload-input-inline"
	                      type="file"
	                      accept="image/*"
	                      className="hidden"
	                      onChange={(e) => {
	                        const f = e.target.files?.[0] || null;
	                        setSlipFile(f);
                        setSlipError('');
                        if (slipPreviewUrl) {
                          try { URL.revokeObjectURL(slipPreviewUrl); } catch {}
                        }
                        if (f) {
                          const url = URL.createObjectURL(f);
                          setSlipPreviewUrl(url);
                          setAddInlinePanel('slip');
                        } else {
                          setSlipPreviewUrl('');
                        }
                      }}
                      disabled={slipLoading}
                    />

                    {addInlinePanel === 'voice' ? (
                      <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('voice_title')}</div>
                            <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">
                              {t('voice_subtitle')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (voiceRecording || voiceLoading) return;
                              cleanupVoiceDevices();
                              resetVoiceState();
                              setAddInlinePanel('none');
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-50"
                            aria-label={t('close')}
                            title={t('close')}
                            disabled={voiceRecording || voiceLoading}
                          >
                            <X className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>

                        {voiceError ? (
                          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                            {voiceError}
                          </div>
                        ) : null}

                        <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('status')}</div>
                              <div className="mt-1 text-sm font-extrabold text-[color:var(--app-text)]">
                                {voiceRecording ? t('recording') : voiceBlob ? t('recorded') : t('ready_to_record')}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('time')}</div>
                              <div className="mt-1 text-sm font-extrabold tabular-nums text-[color:var(--app-text)]">
                                {formatVoiceDuration(voiceSeconds)}
                              </div>
                            </div>
                          </div>
                          {voiceLoading ? (
                            <div className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--app-muted)]">
                              <span className="inline-flex h-4 w-4 rounded-full border-2 border-[color:var(--app-border)] border-t-violet-400 animate-spin" aria-hidden="true" />
                              {t('transcribing')}
                            </div>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (voiceLoading) return;
                            if (voiceRecording) stopVoiceRecording({ autoTranscribe: true });
                            else startVoiceRecording();
                          }}
                          disabled={voiceLoading}
                          className={[
                            'h-12 w-full rounded-2xl font-extrabold transition flex items-center justify-center gap-3',
                            voiceRecording
                              ? 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/25 hover:bg-rose-500/20'
                              : 'bg-emerald-500 text-slate-950 hover:brightness-95',
                            voiceLoading ? 'opacity-70 cursor-wait' : '',
                          ].join(' ')}
                        >
                          <Mic className="h-5 w-5" aria-hidden="true" />
                          {voiceRecording ? t('stop_auto_transcribe') : t('start_recording')}
                        </button>

                        <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4">
                          <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('transcript')}</div>
                          <div className="mt-2 text-sm font-semibold text-[color:var(--app-text)] whitespace-pre-wrap break-words">
                            {voiceTranscript ? voiceTranscript : '—'}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (voiceRecording || voiceLoading) return;
                              cleanupVoiceDevices();
                              resetVoiceState();
                              setAddInlinePanel('none');
                            }}
                            className="h-12 flex-1 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 text-sm font-extrabold text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-60"
                            disabled={voiceRecording || voiceLoading}
                          >
                            {t('cancel')}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              applyVoiceTranscriptToAddForm();
                              setAddInlinePanel('none');
                            }}
                            disabled={!String(voiceTranscript || '').trim() || voiceRecording || voiceLoading}
                            className="h-12 flex-1 rounded-2xl bg-emerald-500 px-4 text-sm font-extrabold text-slate-950 hover:brightness-95 disabled:opacity-60"
                          >
                            {t('use_autofill')}
                          </button>
                        </div>
                      </div>
                    ) : null}

                    {addInlinePanel === 'slip' ? (
                      <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('slip_title')}</div>
                            <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">
                              {t('slip_subtitle')}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (slipLoading) return;
                              resetSlipState();
                              setAddInlinePanel('none');
                            }}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-50"
                            aria-label={t('close')}
                            title={t('close')}
                            disabled={slipLoading}
                          >
                            <X className="h-5 w-5" aria-hidden="true" />
                          </button>
                        </div>

                        {slipError ? (
                          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                            {slipError}
                          </div>
                        ) : null}

                        <button
                          type="button"
                          onClick={() => { try { slipInputRef.current && slipInputRef.current.click(); } catch {} }}
                          disabled={slipLoading}
                          className={[
                            'block w-full rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] overflow-hidden text-left',
                            'hover:bg-[var(--app-surface-3)] transition',
                            slipLoading ? 'opacity-80 cursor-wait' : '',
                          ].join(' ')}
                        >
                          {slipPreviewUrl ? (
                            <div className="relative">
                              <img
                                src={slipPreviewUrl}
                                alt="slip preview"
                                className="w-full max-h-[40vh] object-contain bg-black/10"
                              />
                              <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/60 via-black/20 to-transparent">
                                <div className="text-xs font-extrabold text-white">{t('tap_to_change_image')}</div>
                                <div className="mt-0.5 text-[11px] font-semibold text-white/70">{t('make_amount_date_clear')}</div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/20">
                                  <Camera className="h-6 w-6" aria-hidden="true" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('take_or_upload_slip')}</div>
                                  <div className="mt-0.5 text-xs font-semibold text-[color:var(--app-muted)]">{t('receipt_support_max')}</div>
                                </div>
                                <ChevronRight className="h-5 w-5 text-[color:var(--app-muted)]" aria-hidden="true" />
                              </div>
                            </div>
                          )}
                        </button>

                        <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-4 py-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-extrabold text-[color:var(--app-text)]">
                              {slipLoading ? t('slip_reading') : slipFile ? t('slip_ready_auto') : t('slip_wait_image')}
                            </div>
                            {slipLoading ? (
                              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[color:var(--app-muted)]">
                                <span className="inline-flex h-4 w-4 rounded-full border-2 border-[color:var(--app-border)] border-t-emerald-400 animate-spin" aria-hidden="true" />
                                {t('please_wait')}
                              </div>
                            ) : null}
                          </div>
                          {!slipLoading && slipError && slipFile ? (
                            <div className="mt-2 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={readSlip}
                                className="rounded-2xl bg-emerald-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:brightness-95"
                              >
                                {t('try_read_again')}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="text-sm font-extrabold text-[color:var(--app-text)]">{t('category')}</div>
                      <div className="mt-4 grid grid-cols-4 gap-4">
                        {(() => {
                          const list = (categories || []).filter((c) => c?.type === addFormData.type);
                          const top = list.slice(0, 8);
                          const selectedId = addFormData.category;
                          if (selectedId && !top.some((c) => String(c?._id) === String(selectedId))) {
                            const picked = list.find((c) => String(c?._id) === String(selectedId));
                            if (picked) return [picked, ...top.slice(0, 7)];
                          }
                          return top;
                        })().map((c) => {
                          const selected = addFormData.category === c._id;
                          return (
                            <button
                              key={c._id}
                              type="button"
                              onClick={() => {
                                setAutoCategoryApplied('');
                                setAddFormData((prev) => ({ ...prev, category: c._id }));
                              }}
                              className="flex flex-col items-center gap-2"
                              aria-pressed={selected}
                            >
                              <div
                                className={[
                                  'h-14 w-14 rounded-full flex items-center justify-center ring-1 transition',
                                  selected
                                    ? 'bg-emerald-500/20 text-emerald-200 ring-emerald-400/30 shadow-sm shadow-emerald-500/10'
                                    : 'bg-[var(--app-surface-2)] text-[color:var(--app-text)] ring-[color:var(--app-border)] hover:bg-[var(--app-surface-3)]',
                                ].join(' ')}
                                aria-hidden="true"
                              >
                                <div className="scale-90">{renderIcon(c.icon || 'other')}</div>
                              </div>
                              <div className="text-[11px] font-semibold text-[color:var(--app-muted)] truncate max-w-[76px]">{c.name}</div>
                            </button>
                          );
                        })}
                      </div>
                      {!addFormData.category ? (
                        <div className="mt-3 text-[11px] font-semibold text-[color:var(--app-muted-2)]">{t('select_category_before_save')}</div>
                      ) : null}
                    </div>

                    <div className="relative rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-4 py-4 hover:bg-[var(--app-surface-3)] transition">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[color:var(--app-muted-2)]" aria-hidden="true" />
                      <div className="pl-8">
                        <div className="text-sm font-extrabold text-[color:var(--app-text)]">
                          {(() => {
                            const iso = String(addFormData.date || '');
                            const today = toBangkokISODateKey(Date.now());
                            const label = (() => {
                              try {
                                const d = iso ? new Date(`${iso}T00:00:00`) : new Date();
                                return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
                              } catch {
                                return iso || '-';
                              }
                            })();
                            return iso === today ? t('today_with_date', { label }) : label;
                          })()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => openDatePicker('add')}
                        className="absolute inset-0"
                        aria-label={t('open_date_picker')}
                      />
                    </div>

                    <div className="relative rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-4 py-4 hover:bg-[var(--app-surface-3)] transition">
                      <StickyNote className="absolute left-4 top-4 h-5 w-5 text-[color:var(--app-muted-2)]" aria-hidden="true" />
                      <div className="pl-8">
                        <textarea
                          value={addFormData.notes}
                          onChange={(e) => setAddFormData((prev) => ({ ...prev, notes: e.target.value }))}
                          rows={2}
                          placeholder={t('notes_placeholder')}
                          className="w-full bg-transparent text-sm font-semibold text-[color:var(--app-text)] outline-none placeholder:text-[color:var(--app-muted-2)] resize-none"
                        />
                      </div>
                    </div>

                    {error ? (
                      <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-200">
                        {error}
                      </div>
                    ) : null}
                  </div>

                  <div className="px-5 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-2 border-t border-[color:var(--app-border)] bg-[var(--app-surface)]">
                    <button
                      type="submit"
                      className="h-14 w-full rounded-full bg-emerald-500 text-slate-950 font-extrabold text-base shadow-lg shadow-emerald-500/15 hover:brightness-95 disabled:opacity-60"
                      disabled={!addFormData.amount || Number(addFormData.amount) <= 0}
                    >
                      {t('save_transaction')}
                    </button>
                  </div>
              </>
          </form>
        </div>
      ), document.body)}

      {/* Date Picker Modal (custom calendar) */}
      {mounted && showDatePicker && createPortal((
        <div
          className="fixed inset-0 z-[10006] bg-slate-950/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 pb-[calc(env(safe-area-inset-bottom)+8px)] sm:pb-0"
          onClick={(e) => e.target === e.currentTarget && setShowDatePicker(false)}
        >
          <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-2xl shadow-black/20 overflow-hidden text-[color:var(--app-text)]">
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-5 py-4">
              <div>
                <div className="text-sm font-extrabold">
                  {t('pick_date')}{datePickerTarget === 'edit' ? t('pick_date_edit_suffix') : ''}
                </div>
                <div className="text-[11px] font-semibold text-[color:var(--app-muted)]">{t('date_picker_hint')}</div>
              </div>
              <button
                type="button"
                onClick={() => setShowDatePicker(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]"
                aria-label={t('close')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {(() => {
              const FUTURE_DAYS_LIMIT = 365;
              const todayKey = toBangkokISODateKey(Date.now());
              const maxKey = toBangkokISODateKey(Date.now() + FUTURE_DAYS_LIMIT * 86400000);
              const todayParsed = parseISODateKey(todayKey) || { year: new Date().getFullYear(), monthIndex: new Date().getMonth(), day: new Date().getDate() };
              const maxParsed = parseISODateKey(maxKey) || todayParsed;
              const activeISO = datePickerTarget === 'edit' ? editFormData?.date : addFormData?.date;
              const selectedParsed = parseISODateKey(activeISO) || todayParsed;
              const { year, monthIndex } = datePickerMonth || todayParsed;
              const canGoNext = year < maxParsed.year || (year === maxParsed.year && monthIndex < maxParsed.monthIndex);

              const weekStartsOnMonday = language !== 'en';
              const weekdayLabels = weekStartsOnMonday
                ? ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา']
                : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

              const isBeyondMax = (d) => {
                const iso = toISOFromParts(year, monthIndex, d);
                return iso > maxKey;
              };

              const selectDay = (d) => {
                if (isBeyondMax(d)) return;
                const iso = toISOFromParts(year, monthIndex, d);
                if (datePickerTarget === 'edit') setEditFormData((prev) => ({ ...prev, date: iso }));
                else setAddFormData((prev) => ({ ...prev, date: iso }));
                setShowDatePicker(false);
              };

              const goPrev = () => {
                const m = monthIndex - 1;
                if (m >= 0) setDatePickerMonth({ year, monthIndex: m });
                else setDatePickerMonth({ year: year - 1, monthIndex: 11 });
              };

              const goNext = () => {
                if (!canGoNext) return;
                const m = monthIndex + 1;
                if (m <= 11) setDatePickerMonth({ year, monthIndex: m });
                else setDatePickerMonth({ year: year + 1, monthIndex: 0 });
              };

              const clampToMax = (nextYear, nextMonthIndex) => {
                let y = Number(nextYear);
                let m = Number(nextMonthIndex);
                if (!Number.isFinite(y)) y = year;
                if (!Number.isFinite(m)) m = monthIndex;
                if (y > maxParsed.year) y = maxParsed.year;
                if (y === maxParsed.year && m > maxParsed.monthIndex) m = maxParsed.monthIndex;
                if (m < 0) m = 0;
                if (m > 11) m = 11;
                return { year: y, monthIndex: m };
              };

              const firstWeekdayRaw = getBangkokWeekdayIndex(year, monthIndex, 1); // 0=Sun
              const firstWeekday = weekStartsOnMonday ? (firstWeekdayRaw + 6) % 7 : firstWeekdayRaw;
              const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

              const monthHeaderLabel = `${MONTH_NAMES_TH[monthIndex] || ''} ${year + 543}`;

              const cells = [];
              for (let i = 0; i < firstWeekday; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);
              while (cells.length % 7 !== 0) cells.push(null);

              const minYear = Math.max(1970, todayParsed.year - 50);
              const yearOptions = [];
              for (let y = maxParsed.year; y >= minYear; y--) yearOptions.push(y);

              return (
                <>
                  <div className="px-5 pt-4">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={goPrev}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]"
                        aria-label={t('prev_month')}
                      >
                        <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                      </button>

                      <div className="min-w-0 flex-1 text-center">
                        <div className="text-lg font-extrabold tracking-tight">{monthHeaderLabel}</div>
                        <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted)]">{t('tap_day_to_select')}</div>

                        <div className="mx-auto mt-3 grid w-full max-w-[320px] grid-cols-2 gap-2">
                          <div ref={datePickerMonthMenuRef} className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setDatePickerYearMenuOpen(false);
                                setDatePickerMonthMenuOpen((v) => !v);
                              }}
                              className="h-11 w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-3 text-left text-sm font-extrabold text-[color:var(--app-text)] outline-none shadow-sm shadow-black/10 hover:bg-[var(--app-surface-3)] focus:ring-2 focus:ring-emerald-400/30"
                              aria-label={t('pick_month')}
                              aria-haspopup="listbox"
                              aria-expanded={datePickerMonthMenuOpen}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate">{MONTH_NAMES_TH[monthIndex] || ''}</span>
                                <ChevronDown className="h-4 w-4 text-[color:var(--app-muted-2)]" aria-hidden="true" />
                              </span>
                            </button>

                            {datePickerMonthMenuOpen && (
                              <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-xl shadow-black/25">
                                <div className="border-b border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2 text-[11px] font-extrabold text-[color:var(--app-muted)]">
                                  {t('pick_month')}
                                </div>
                                <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-label={t('pick_month')}>
                                  {MONTH_NAMES_TH.map((name, mi) => {
                                    const disabled = year === maxParsed.year && mi > maxParsed.monthIndex;
                                    const active = mi === monthIndex;
                                    return (
                                      <button
                                        key={name}
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        disabled={disabled}
                                        onClick={() => {
                                          if (disabled) return;
                                          setDatePickerMonth(clampToMax(year, mi));
                                          setDatePickerMonthMenuOpen(false);
                                        }}
                                        className={[
                                          'w-full rounded-xl px-3 py-2 text-sm font-extrabold transition text-left',
                                          'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
                                          disabled
                                            ? 'bg-transparent text-[color:var(--app-muted-2)] opacity-50 cursor-not-allowed'
                                            : active
                                              ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/25'
                                              : 'text-[color:var(--app-text)] hover:bg-[var(--app-surface-2)]',
                                        ].join(' ')}
                                      >
                                        <span className="flex items-center justify-between gap-2">
                                          <span className="truncate">{name}</span>
                                          {active && <Check className="h-4 w-4" aria-hidden="true" />}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>

                          <div ref={datePickerYearMenuRef} className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setDatePickerMonthMenuOpen(false);
                                setDatePickerYearMenuOpen((v) => !v);
                              }}
                              className="h-11 w-full rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-3 text-left text-sm font-extrabold text-[color:var(--app-text)] outline-none shadow-sm shadow-black/10 hover:bg-[var(--app-surface-3)] focus:ring-2 focus:ring-emerald-400/30"
                              aria-label={t('pick_year')}
                              aria-haspopup="listbox"
                              aria-expanded={datePickerYearMenuOpen}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="tabular-nums">{year + 543}</span>
                                <ChevronDown className="h-4 w-4 text-[color:var(--app-muted-2)]" aria-hidden="true" />
                              </span>
                            </button>

                            {datePickerYearMenuOpen && (
                              <div className="absolute left-0 right-0 z-20 mt-2 overflow-hidden rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] shadow-xl shadow-black/25">
                                <div className="flex items-center justify-between gap-2 border-b border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-3 py-2">
                                  <div className="text-[11px] font-extrabold text-[color:var(--app-muted)]">{t('pick_year')}</div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDatePickerMonth(clampToMax(todayParsed.year, todayParsed.monthIndex));
                                      setDatePickerYearMenuOpen(false);
                                    }}
                                    className="rounded-xl border border-[color:var(--app-border)] bg-[var(--app-surface)] px-2.5 py-1 text-[11px] font-extrabold text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)]"
                                  >
                                    {t('this_year')}
                                  </button>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-1.5" role="listbox" aria-label={t('pick_year')}>
                                  {yearOptions.map((y) => {
                                    const active = Number(y) === Number(year);
                                    return (
                                      <button
                                        key={y}
                                        type="button"
                                        role="option"
                                        aria-selected={active}
                                        onClick={() => {
                                          setDatePickerMonth(clampToMax(y, monthIndex));
                                          setDatePickerYearMenuOpen(false);
                                        }}
                                        className={[
                                          'w-full rounded-xl px-3 py-2 text-sm font-extrabold transition text-left',
                                          'focus:outline-none focus:ring-2 focus:ring-emerald-400/30',
                                          active
                                            ? 'bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/25'
                                            : 'text-[color:var(--app-text)] hover:bg-[var(--app-surface-2)]',
                                        ].join(' ')}
                                      >
                                        <span className="flex items-center justify-between gap-2">
                                          <span className="tabular-nums">{y + 543}</span>
                                          {active && <Check className="h-4 w-4" aria-hidden="true" />}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={goNext}
                        disabled={!canGoNext}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] disabled:opacity-40"
                        aria-label={t('next_month')}
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-4 rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-3 shadow-sm shadow-black/10">
                      <div className="grid grid-cols-7 gap-1.5">
                        {weekdayLabels.map((w) => (
                          <div key={w} className="text-center text-[11px] font-extrabold text-[color:var(--app-muted-2)]">
                            {w}
                          </div>
                        ))}

                        {cells.map((d, idx) => {
                          if (!d) return <div key={`e-${idx}`} className="h-10" />;
                          const iso = toISOFromParts(year, monthIndex, d);
                          const selected = iso === String(addFormData?.date || '');
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
                                  ? 'bg-transparent text-[color:var(--app-muted-2)] opacity-50 cursor-not-allowed'
                                  : selected
                                    ? 'bg-emerald-400 text-slate-950 shadow-sm shadow-emerald-500/20'
                                    : today
                                      ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/25 hover:bg-emerald-500/20'
                                      : 'bg-[var(--app-surface)] text-[color:var(--app-text)] ring-1 ring-[color:var(--app-border)] hover:bg-[var(--app-surface-3)]',
                              ].join(' ')}
                              aria-pressed={selected}
                              aria-label={`${t('pick_date')} ${monthHeaderLabel} ${d}`}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (datePickerTarget === 'edit') setEditFormData((prev) => ({ ...prev, date: todayKey }));
                        else setAddFormData((prev) => ({ ...prev, date: todayKey }));
                        setShowDatePicker(false);
                      }}
                      className="h-12 rounded-full border border-[color:var(--app-border)] bg-[var(--app-surface)] px-6 text-sm font-extrabold text-[color:var(--app-text)] shadow-sm shadow-black/10 hover:bg-[var(--app-surface-3)]"
                    >
                      {t('today')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDatePicker(false)}
                      className="h-12 rounded-full bg-emerald-500 px-6 text-sm font-extrabold text-slate-950 hover:brightness-95 shadow-lg shadow-emerald-500/15"
                    >
                      {t('finish')}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ), document.body)}

      {/* Edit Transaction Modal */}
      {mounted && showEditModal && editingTransaction && createPortal((
	        <div 
	          className="fixed inset-0 z-[9999] bg-slate-950/45 backdrop-blur-sm animate-fadeIn flex items-end justify-center p-0"
	          onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
	        >
	          <div
	            className="w-full bg-[var(--app-surface)] text-[color:var(--app-text)] shadow-2xl overflow-hidden animate-slideUp flex flex-col rounded-t-3xl sm:rounded-3xl sm:max-w-md h-[88dvh] max-h-[88dvh] sm:h-auto sm:max-h-[90dvh] border border-[color:var(--app-border)]"
	            onClick={(e) => e.stopPropagation()}
	            role="dialog"
	            aria-modal="true"
	            aria-label={t('edit_transaction')}
	          >
	            <form onSubmit={handleUpdateSubmit} className="flex h-full flex-col">
	              {/* Modal Header */}
	              <div className="sticky top-0 z-10 relative bg-gradient-to-br from-emerald-500 via-emerald-500 to-green-500 text-slate-950 px-6 pb-5 pt-[calc(env(safe-area-inset-top)+12px)] overflow-hidden">
	                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" aria-hidden="true" />
	                <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" aria-hidden="true" />
	              
	                <div className="relative flex items-center justify-between">
	                  <div className="flex items-center gap-3">
	                    <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
	                      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
	                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
	                      </svg>
	                    </div>
	                    <div>
	                      <h2 className="text-xl font-bold">{t('edit_transaction')}</h2>
	                      <p className="text-slate-950/70 text-sm font-semibold">{t('edit_desc')}</p>
	                    </div>
	                  </div>
	                  <button
	                    type="button"
	                    onClick={() => setShowEditModal(false)}
	                    className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:rotate-90"
	                    aria-label={t('close')}
	                  >
	                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
	                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
	                    </svg>
	                  </button>
	                </div>
	              </div>
		
	              {/* Modal Body */}
	              <div className="min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] p-6 space-y-5">
	              {error && (
		                <div className="p-4 bg-rose-500/10 border border-rose-400/20 rounded-xl flex items-start gap-3">
		                  <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
	                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
	                  </svg>
	                  <p className="text-[color:var(--app-text)] font-semibold text-sm">{error}</p>
	                </div>
	              )}

              {/* Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--app-muted)] mb-2">{t('type')}</label>
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
                        ? 'bg-emerald-500/15 border-emerald-400/40 text-[color:var(--app-text)]'
                        : 'bg-[var(--app-surface-2)] border-[color:var(--app-border)] text-[color:var(--app-muted)] hover:bg-[var(--app-surface-3)]'
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
                        ? 'bg-rose-500/15 border-rose-400/40 text-[color:var(--app-text)]'
                        : 'bg-[var(--app-surface-2)] border-[color:var(--app-border)] text-[color:var(--app-muted)] hover:bg-[var(--app-surface-3)]'
                    }`}
                  >
                    {t('expense')}
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--app-muted)] mb-2">{t('amount')}</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-3 border border-[color:var(--app-border)] bg-[var(--app-surface-2)] rounded-xl text-[color:var(--app-text)] placeholder:text-[color:var(--app-muted-2)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 outline-none transition-all"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[color:var(--app-muted-2)] font-semibold">฿</span>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--app-muted)] mb-2">{t('category')}</label>
                <div ref={editCategoryRef} className="relative">
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
                    aria-label={t('category_select')}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex items-center gap-3">
                        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--app-surface-2)] ring-1 ring-[color:var(--app-border)] shrink-0">
                          <div className="scale-[0.85]">{renderIcon(editCategorySelected?.icon || 'other')}</div>
                        </div>
                        <div className={editFormData.category ? 'min-w-0 text-sm font-extrabold truncate' : 'min-w-0 text-sm font-extrabold text-[color:var(--app-muted)] truncate'}>
                          {editFormData.category ? (editCategorySelected?.name || t('unspecified')) : t('category_select')}
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
                    aria-label={t('category_options')}
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
                          {t('no_categories')}
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
                                  <span className="scale-[0.78]">{renderIcon(cat.icon || 'other')}</span>
                                </span>
                                <span className="min-w-0 truncate text-sm font-extrabold">{cat.name}</span>
                              </span>
                              {selected ? <span className="text-emerald-500 font-extrabold">✓</span> : <span className="text-[color:var(--app-muted)] text-xs font-semibold">{t('choose')}</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                ), document.body)}
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--app-muted)] mb-2">{t('date')}</label>
                <button
                  type="button"
                  onClick={() => openDatePicker('edit')}
                  className="w-full px-4 py-3 border border-[color:var(--app-border)] bg-[var(--app-surface-2)] rounded-xl text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 outline-none transition-all flex items-center justify-between gap-3"
                  aria-label={t('open_calendar_pick_date')}
                >
                  <div className="text-left min-w-0">
                    <div className="text-sm font-extrabold text-[color:var(--app-text)] truncate">
                      {(() => {
                        const iso = String(editFormData.date || '');
                        if (!iso) return t('pick_date_placeholder');
                        try {
                          const d = new Date(`${iso}T00:00:00`);
                          return d.toLocaleDateString(uiLocale, { day: 'numeric', month: 'long', year: 'numeric' });
                        } catch {
                          return iso;
                        }
                      })()}
                    </div>
                    <div className="mt-0.5 text-[11px] font-semibold text-[color:var(--app-muted-2)]">{t('tap_to_open_calendar')}</div>
                  </div>
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-400/20 shrink-0">
                    <Calendar className="h-5 w-5" aria-hidden="true" />
                  </div>
                </button>
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-sm font-semibold text-[color:var(--app-muted)] mb-2">{t('notes')}</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  className="w-full px-4 py-3 border border-[color:var(--app-border)] bg-[var(--app-surface-2)] rounded-xl text-[color:var(--app-text)] placeholder:text-[color:var(--app-muted-2)] focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 outline-none transition-all resize-none"
                  placeholder={t('notes_edit_placeholder')}
	                />
	              </div>
	
	              </div>

	              {/* Modal Footer */}
	              <div className="sticky bottom-0 z-10 border-t border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
	                <div className="flex gap-3">
		                <button
	                  type="button"
	                  onClick={() => setShowEditModal(false)}
	                  className="flex-1 px-6 py-3 border border-[color:var(--app-border)] bg-[var(--app-surface-2)] text-[color:var(--app-text)] font-semibold rounded-xl hover:bg-[var(--app-surface-3)] transition-colors"
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
		              </div>
		            </form>
	          </div>
	        </div>
	      ), document.body)}

      {/* Delete Confirm Modal */}
      {mounted && showDeleteModal && createPortal((
        <div
          className="fixed inset-0 z-[10000] bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setShowDeleteModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-white/10 bg-[var(--app-surface)] text-[color:var(--app-text)] shadow-2xl shadow-black/40 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('delete_confirm_aria')}
          >
            <div className="border-b border-white/10 bg-white/5 px-6 py-5 flex items-center justify-between gap-4">
              <div className="min-w-0 flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/20">
                  <Trash2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-extrabold text-[color:var(--app-text)]">{t('delete_title')}</div>
                  <div className="mt-0.5 text-sm font-semibold text-[color:var(--app-muted-2)]">{t('delete_cannot_undo')}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                aria-label={t('close')}
                title={t('close')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {deleteError ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-4 text-rose-200 text-sm font-semibold">
                  {deleteError}
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm font-semibold text-[color:var(--app-muted-2)]">
                {t('delete_hint_prefix')}{' '}
                <span className="text-rose-200 font-extrabold">{t('delete')}</span>{' '}
                {t('delete_hint_or')}{' '}
                <span className="text-slate-100 font-extrabold">{t('cancel')}</span>{' '}
                {t('delete_hint_suffix')}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-extrabold text-slate-100 hover:bg-white/10"
                  disabled={deleteLoading}
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 h-12 rounded-2xl bg-rose-500 px-4 text-sm font-extrabold text-white hover:brightness-95 disabled:opacity-60"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? t('deleting') : t('delete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ), document.body)}

      {/* View Transaction Modal */}
      {mounted && showViewModal && viewingTransaction && createPortal((
        <div
          className="fixed inset-0 z-[9999] bg-slate-950/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={(e) => e.target === e.currentTarget && setShowViewModal(false)}
        >
          <div
            className="bg-[var(--app-surface)] text-[color:var(--app-text)] border border-[color:var(--app-border)] w-full max-w-none sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/40 overflow-hidden animate-slideUp flex flex-col max-h-[92dvh] sm:max-h-[85dvh]"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={t('view_txn_aria')}
          >
            <div className="relative border-b border-[color:var(--app-border)] bg-[var(--app-surface-2)] px-5 pb-4 pt-3 sm:pt-4">
              <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/10 ring-1 ring-black/10 sm:hidden" aria-hidden="true" />

              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface)] text-[color:var(--app-text)] hover:bg-[var(--app-surface-3)] focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                aria-label={t('close')}
                title={t('close')}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>

              <div className="flex items-center gap-3 pr-12">
                <div
                  className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0"
                  style={{
                    background: viewingTransaction.type === 'income'
                      ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                      : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  }}
                  aria-hidden="true"
                >
                  {renderIcon(viewingTransaction.category?.icon)}
                </div>

                <div className="min-w-0">
                  <div className="text-[11px] font-extrabold tracking-wide text-[color:var(--app-muted-2)]">
                    {viewingTransaction.type === 'income' ? t('income') : t('expense')}
                  </div>
                  <h3 className="mt-0.5 truncate text-lg font-extrabold text-[color:var(--app-text)]">
                    {viewingTransaction.category?.name || t('uncategorized')}
                  </h3>
                  <div className="mt-0.5 text-xs font-semibold text-[color:var(--app-muted)] truncate">
                    {new Date(viewingTransaction.date).toLocaleDateString(uiLocale, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] p-5 pb-[calc(env(safe-area-inset-bottom)+24px)] space-y-4">
              <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface)] p-4 shadow-sm shadow-black/5">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('amount')}</div>
                  <div className="text-2xl font-extrabold" style={{ color: viewingTransaction.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR }}>
                    {viewingTransaction.type === 'expense' ? '-' : '+'}{formatTHB(viewingTransaction.amount)}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[color:var(--app-border)] bg-[var(--app-surface-2)] p-4">
                <div className="text-xs font-semibold text-[color:var(--app-muted)]">{t('notes')}</div>
                <div className="mt-2 text-sm font-semibold text-[color:var(--app-text)] whitespace-pre-wrap break-words">
                  {String(viewingTransaction.notes || '').trim() ? viewingTransaction.notes : '—'}
                </div>
              </div>
            </div>

            <div className="border-t border-[color:var(--app-border)] bg-[var(--app-surface)] p-4">
              <button
                type="button"
                onClick={() => setShowViewModal(false)}
                className="w-full rounded-2xl bg-emerald-500 py-3 text-slate-950 font-extrabold hover:brightness-95 transition"
              >
                {t('view_close')}
              </button>
            </div>
          </div>
        </div>
      ), document.body)}
    </main>
  );
}
