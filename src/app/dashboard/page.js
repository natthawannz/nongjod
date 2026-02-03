"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Utensils, ShoppingBag, Car, Home, Zap, Heart, Gamepad2, Stethoscope, GraduationCap, Plane, Briefcase, Gift, Smartphone, Coffee, Music, Dumbbell, PawPrint, Scissors, CreditCard, Landmark, MoreHorizontal, Plus, Settings, Trash2, X, ChevronRight, LayoutGrid, Book, Bus, Train, Truck, Bicycle, Apple, Banana, Beer, Cake, Camera, Film, Globe, MapPin, Sun, Moon, Star, Tree, Flower, Leaf, Cloud, Snowflake, Droplet, Flame, Key, Lock, Bell, AlarmClock, Wallet, PiggyBank, ShoppingCart, Shirt, Glasses, Watch, Tablet, Tv, Speaker, Headphones, Printer, Cpu, MousePointer, Pen, Pencil, Paintbrush, Ruler, Calculator, Clipboard, Paperclip, Archive, Box, Package, Rocket, Medal, Trophy, Award, Flag, Target, Lightbulb, Battery, Plug, Wifi, Bluetooth, Signal } from 'lucide-react';

// Import Budget modal component
import Budget from '../budget/page';
import Currency from '../currency/page';
const CurrencyModalContent = ({ onClose }) => (
  <Currency onClose={onClose} />
);

// Define the primary color constants (Teal theme - ใช้สีเดียวกับ Landing)
const PRIMARY_COLOR = '#4db8a8';
const PRIMARY_COLOR_DARK = '#3d9888';
const INCOME_COLOR = '#10b981'; // Emerald green
const EXPENSE_COLOR = '#ef4444'; // Red
const NET_SAVING_COLOR = '#f59e0b'; // Amber

const ICON_MAP = {
  'food': Utensils, 'drink': Coffee, 'restaurant': Utensils,
  'shopping': ShoppingBag, 'gift': Gift, 'clothes': Scissors,
  'transport': Car, 'fuel': Zap, 'plane': Plane,
  'home': Home, 'bills': Zap, 'pet': PawPrint,
  'game': Gamepad2, 'music': Music, 'health': Stethoscope, 'sport': Dumbbell,
  'money': Landmark, 'salary': CreditCard, 'work': Briefcase,
  'education': GraduationCap, 'tech': Smartphone,
  'other': MoreHorizontal, 'love': Heart,
  'book': Book, 'bus': Bus, 'train': Train, 'truck': Truck, 'bicycle': Bicycle,
  'apple': Apple, 'banana': Banana, 'beer': Beer, 'cake': Cake, 'camera': Camera,
  'film': Film, 'globe': Globe, 'mappin': MapPin, 'sun': Sun, 'moon': Moon,
  'star': Star, 'tree': Tree, 'flower': Flower, 'leaf': Leaf, 'cloud': Cloud,
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

function renderIcon(iconKey) {
  const IconComp = ICON_MAP[iconKey];
  if (IconComp) return <IconComp className="w-7 h-7" />;
  return <span className="text-2xl">{iconKey || '-'}</span>;
}

export default function Dashboard() {
  // Store JWT token from query string to localStorage (for LINE login)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const token = url.searchParams.get('token');
      if (token) {
        localStorage.setItem('token', token);
        // Remove token from URL for security
        url.searchParams.delete('token');
        window.history.replaceState({}, document.title, url.pathname + url.search);
      }
    }
  }, []);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    netSavings: 0,
    recentTransactions: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState(null);
  const [categories, setCategories] = useState([]);
  const [editFormData, setEditFormData] = useState({
    amount: '',
    type: 'expense',
    category: '',
    date: '',
    notes: '',
  });
  const [addFormData, setAddFormData] = useState({
    amount: '',
    type: 'expense',
    category: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const monthNames = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  /* --- Data & Logic Setup --- */
  const getMonths = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() + 543; 
    const currentMonth = currentDate.getMonth();
    const months = [];
    const span = 12;

    for (let i = -span; i <= span; i++) { 
      const monthIndex = (currentMonth + i) % 12;
      let yearOffset = Math.floor((currentMonth + i) / 12);
      if (monthIndex < 0) {
        yearOffset -= 1; 
      }
      const actualMonthIndex = (monthIndex + 12) % 12;
      const year = currentYear + yearOffset;
      months.push(`${monthNames[actualMonthIndex]} ${year}`);
    }
    return months;
  };

  const months = getMonths();
  const currentDate = new Date();
  const currentMonthYear = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear() + 543}`;
  
  const currentMonthInitialIndex = months.findIndex(m => m === currentMonthYear);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(currentMonthInitialIndex !== -1 ? currentMonthInitialIndex : Math.floor(months.length / 2));
  const selectedMonth = months[currentMonthIndex];

  const getThaiYear = (date) => date.getFullYear() + 543;

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
      const res = await fetch(`${API_BASE}/api/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error((await res.json()).message || 'Failed to fetch transactions');
      }     
      const transactions = await res.json();
      
      const selectedMonthName = selectedMonth.split(' ')[0];
      const selectedYear = selectedMonth.split(' ')[1];

      const filteredTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        const tMonthIndex = tDate.getMonth();
        const tYear = getThaiYear(tDate);
        
        return monthNames[tMonthIndex] === selectedMonthName && tYear.toString() === selectedYear;
      });

      const sortedTransactions = filteredTransactions.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
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
        recentTransactions: sortedTransactions.slice(0, 5),
      });
      setError('');
      
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการโหลดข้อมูล: ' + (error.message || 'Error'));
      setStats({ totalIncome: 0, totalExpenses: 0, netSavings: 0, recentTransactions: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');

    const fetchCategories = async () => {
      try {
        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
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

    if (!token) {
        window.location.href = '/login';
        return;
    }

    fetchStats();
    fetchCategories();
    
    return () => {};
  }, [selectedMonth]);

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

  const handleDelete = async (transactionId) => {
    if (!confirm('คุณแน่ใจหรือไม่ที่จะลบรายการนี้?')) return;

    try {
      const token = localStorage.getItem('token');
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
      const res = await fetch(`${API_BASE}/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error('Failed to delete transaction');
      }

      fetchStats();
    } catch (error) {
      setError('เกิดข้อผิดพลาดในการลบ: ' + error.message);
    }
  };

  const handleUpdateSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!editFormData.amount || parseFloat(editFormData.amount) <= 0) {
      setError('กรุณากรอกจำนวนเงินที่มากกว่า 0');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
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
        throw new Error(data.message || 'เกิดข้อผิดพลาด');
      }

      setShowEditModal(false);
      setEditingTransaction(null);
      fetchStats();
    } catch (error) {
      setError('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!addFormData.amount || parseFloat(addFormData.amount) <= 0) {
      setError('กรุณากรอกจำนวนเงินที่มากกว่า 0');
      return;
    }

    if (!addFormData.category) {
      setError('กรุณาเลือกหมวดหมู่');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
      const res = await fetch(`${API_BASE}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...addFormData,
          amount: parseFloat(addFormData.amount),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'เกิดข้อผิดพลาด');
      }

      setShowAddModal(false);
      setAddFormData({
        amount: '',
        type: 'expense',
        category: '',
        date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchStats();
    } catch (error) {
      setError('เกิดข้อผิดพลาด: ' + error.message);
    }
  };

  const formatCurrentDate = () => {
    const d = new Date();
    const m = monthNames[d.getMonth()];
    const day = d.getDate();
    const year = d.getFullYear() + 543;
    return `${m} ${day}, ${year}`;
  };

  /* --- JSX Rendering --- */

  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-12">
        

        {/* Quick Action Buttons - move to top for better visibility */}
        <div className="flex flex-row gap-3 mb-6 justify-end">

          <button
            type="button"
            onClick={() => setShowCurrencyModal(true)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white shadow-md border border-gray-100 hover:bg-blue-50 hover:text-blue-700 transition-all font-semibold text-base"
          >
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m-5 3H4m0 0l4 4m-4-4l4-4" /></svg>
            อัตราแลกเปลี่ยน
          </button>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          {/* Month Navigation Panel */}
          <div className="flex-1 bg-gradient-to-br from-[#4db8a8] to-[#3d9888] rounded-xl shadow-lg p-5">
            <p className="text-xs text-white/80 mb-3 uppercase tracking-wide font-semibold flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
              </svg>
              ช่วงเดือน
            </p>
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentMonthIndex((prev) => (prev > 0 ? prev - 1 : 0))}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30"
                disabled={currentMonthIndex === 0}
                aria-label="เดือนก่อนหน้า"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
              <div className="text-center">
                <span className="text-xl md:text-2xl font-bold text-white">
                  {selectedMonth}
                </span>
              </div>
              <button
                onClick={() => setCurrentMonthIndex((prev) => (prev < months.length - 1 ? prev + 1 : months.length - 1))}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all disabled:opacity-30"
                disabled={currentMonthIndex === months.length - 1}
                aria-label="เดือนถัดไป"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
          {/* (Buttons moved above) */}
              {/* Budget Modal */}
              {showBudgetModal && (
                <Budget onClose={() => setShowBudgetModal(false)} />
              )}
              {/* Currency Modal */}
              {showCurrencyModal && (
                <CurrencyModalContent onClose={() => setShowCurrencyModal(false)} />
              )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
            <p className="text-red-700 font-medium text-sm">{error}</p>
          </div>
        )}
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          
          {/* Income Card */}
          <div className="bg-white rounded-xl border-2 border-gray-100 p-6 hover:border-emerald-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                   {/* Trending Up Icon */}
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
                   </svg>
               </div>
               <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Income</p>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-2">รายรับรวม</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-bold text-emerald-600">
                {loading ? '---' : stats.totalIncome.toLocaleString()}
              </span>
              <span className="text-lg font-bold text-gray-400">฿</span>
            </div>
          </div>

          {/* Expense Card */}
          <div className="bg-white rounded-xl border-2 border-gray-100 p-6 hover:border-red-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                   {/* Trending Down Icon */}
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"/>
                   </svg>
               </div>
               <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Expense</p>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-2">รายจ่ายรวม</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl md:text-4xl font-bold text-red-600">
                {loading ? '---' : stats.totalExpenses.toLocaleString()}
              </span>
              <span className="text-lg font-bold text-gray-400">฿</span>
            </div>
          </div>

          {/* Net Balance Card */}
          <div className="bg-white rounded-xl border-2 border-gray-100 p-6 hover:border-amber-200 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
               <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                   {/* Wallet Icon */}
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                   </svg>
               </div>
               <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Balance</p>
            </div>
            <p className="text-sm font-semibold text-gray-700 mb-2">ยอดคงเหลือสุทธิ</p>
            <div className="flex items-baseline gap-2">
              <span 
                className={`text-3xl md:text-4xl font-bold`}
                style={{ color: stats.netSavings >= 0 ? INCOME_COLOR : EXPENSE_COLOR }}
               >
                {loading ? '---' : Math.abs(stats.netSavings).toLocaleString()}
              </span>
              <span className="text-lg font-bold text-gray-400">฿</span>
            </div>
          </div>

        </div>

        {/* Recent Transactions Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-8 bg-[#4db8a8] rounded-full"></div>
            <h2 className="text-xl md:text-2xl font-bold text-[#191919] flex items-center gap-2">
              <svg className="w-6 h-6 text-[#4db8a8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              ธุรกรรมล่าสุด
            </h2>
          </div>
          
          <div className="bg-white rounded-xl border-2 border-gray-100 p-5 md:p-6">
            
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block w-8 h-8 border-4 border-gray-200 border-t-[#4db8a8] rounded-full animate-spin"></div>
                <p className="text-gray-500 mt-3 text-sm">กำลังโหลด...</p>
              </div>
            ) : stats.recentTransactions.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
                </svg>
                <p className="text-gray-500 text-sm font-medium">ไม่มีธุรกรรมในเดือนนี้</p>
                <p className="text-gray-400 text-xs mt-1">เริ่มต้นเพิ่มรายการแรกของคุณ</p>
              </div>
            ) : (
              <div className="space-y-1">
                {stats.recentTransactions.map((txn, index) => (
                  <div 
                    key={txn._id} 
                    onClick={() => handleView(txn)}
                    className={`flex items-center justify-between py-4 px-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer ${
                      index !== stats.recentTransactions.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    {/* Left: Icon + Details */}
                    <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                      {/* Icon Container */}
                      <div 
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white shadow-md"
                        style={{ 
                          background: txn.type === 'income' 
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                            : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                        }}
                      >
                        {txn.type === 'income' ? 
                            // Money Receive Icon
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 11l5-5m0 0l5 5m-5-5v12"/>
                            </svg> :
                            // Money Send Icon
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 13l-5 5m0 0l-5-5m5 5V6"/>
                            </svg>
                        }
                      </div>
                      {/* Transaction Info */}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-[#191919] text-sm md:text-base truncate">
                          {txn.category?.name || 'หมวดหมู่ไม่ระบุ'}
                        </p>
                        <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                          </svg>
                          {new Date(txn.date).toLocaleDateString('th-TH', { 
                            day: 'numeric',
                            month: 'short',
                          })}
                          {txn.notes && (
                            <>
                              {' • '}
                              <span className="hidden sm:inline">{txn.notes}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {/* Right: Amount and Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <div 
                        className="text-base md:text-lg font-bold"
                        style={{ color: txn.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR }}
                      >
                        {txn.type === 'expense' ? '-' : '+'}{txn.amount.toLocaleString()} ฿
                      </div>
                      {/* Action Buttons */}
                      <div className="flex gap-1 items-center">
                        <button
                          onClick={() => handleEdit(txn)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors group"
                          title="แก้ไข"
                        >
                          <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(txn._id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors group"
                          title="ลบ"
                        >
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* View All Link */}
            {stats.recentTransactions.length > 0 && (
              <div className="pt-4 mt-4 border-t border-gray-100 text-center">
                <Link 
                  href="/transactions" 
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#4db8a8] hover:text-[#3d9888] transition-colors group"
                >
                    ดูธุรกรรมทั้งหมด
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/>
                    </svg>
                </Link>
              </div>
            )}
          </div>
        </div>

      </div>
      
    

      {/* Add Transaction Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && setShowAddModal(false)}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-br from-teal-500 via-teal-600 to-teal-700 text-white p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">เพิ่มรายการใหม่</h2>
                    <p className="text-white/80 text-sm">บันทึกรายรับหรือรายจ่าย</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:rotate-90"
                  aria-label="ปิด"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleAddSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-120px)]">
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-red-700 font-medium text-sm">{error}</p>
                </div>
              )}

              {/* Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ประเภท</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAddFormData(prev => ({ 
                      ...prev, 
                      type: 'income',
                      category: categories.find(cat => cat.type === 'income')?._id || ''
                    }))}
                    className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                      addFormData.type === 'income'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    รายรับ
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddFormData(prev => ({ 
                      ...prev, 
                      type: 'expense',
                      category: categories.find(cat => cat.type === 'expense')?._id || ''
                    }))}
                    className={`p-3 rounded-xl border-2 font-semibold transition-all ${
                      addFormData.type === 'expense'
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    รายจ่าย
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">จำนวนเงิน</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={addFormData.amount}
                    onChange={(e) => setAddFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none transition-all"
                    placeholder="0.00"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">฿</span>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">หมวดหมู่</label>
                <select
                  value={addFormData.category}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none transition-all"
                  required
                >
                  <option value="">เลือกหมวดหมู่</option>
                  {categories
                    .filter(cat => cat.type === addFormData.type)
                    .map(cat => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">วันที่</label>
                <input
                  type="date"
                  value={addFormData.date}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none transition-all"
                  required
                />
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">หมายเหตุ</label>
                <textarea
                  value={addFormData.notes}
                  onChange={(e) => setAddFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-500/20 outline-none transition-all resize-none"
                  placeholder="เพิ่มรายละเอียด..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                >
                  เพิ่มรายการ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditModal && editingTransaction && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn"
          onClick={(e) => e.target === e.currentTarget && setShowEditModal(false)}
        >
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-hidden animate-slideUp">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 text-white p-6 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
              
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">แก้ไขรายการ</h2>
                    <p className="text-white/80 text-sm">อัปเดตข้อมูลธุรกรรม</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:rotate-90"
                  aria-label="ปิด"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdateSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-120px)]">
              {error && (
                <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
                  </svg>
                  <p className="text-red-700 font-medium text-sm">{error}</p>
                </div>
              )}

              {/* Type Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">ประเภท</label>
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
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    รายรับ
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
                        ? 'bg-red-50 border-red-500 text-red-700'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}
                  >
                    รายจ่าย
                  </button>
                </div>
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">จำนวนเงิน</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                    required
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">฿</span>
                </div>
              </div>

              {/* Category Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">หมวดหมู่</label>
                <select
                  value={editFormData.category}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                  required
                >
                  <option value="">กรุณาเลือกหมวดหมู่</option>
                  {categories
                    .filter(cat => cat.type === editFormData.type)
                    .map(cat => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Date Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">วันที่</label>
                <input
                  type="date"
                  value={editFormData.date}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, date: e.target.value }))}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all"
                  required
                />
              </div>

              {/* Notes Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">หมายเหตุ</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows="3"
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all resize-none"
                  placeholder="เพิ่มรายละเอียด..."
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-105 transition-all"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Transaction Modal */}
      {showViewModal && viewingTransaction && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-md flex items-center justify-center p-4" onClick={e => e.target === e.currentTarget && setShowViewModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg"
                style={{ background: viewingTransaction.type === 'income' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}>
                {renderIcon(viewingTransaction.category?.icon)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800">{viewingTransaction.category?.name || 'หมวดหมู่ไม่ระบุ'}</h3>
                <p className="text-xs text-gray-500">{viewingTransaction.type === 'income' ? 'รายรับ' : 'รายจ่าย'}</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">จำนวนเงิน</span>
                <span className="text-xl font-bold" style={{ color: viewingTransaction.type === 'income' ? INCOME_COLOR : EXPENSE_COLOR }}>
                  {viewingTransaction.type === 'expense' ? '-' : '+'}{viewingTransaction.amount.toLocaleString()} ฿
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">วันที่</span>
                <span className="text-base font-medium text-gray-700">{new Date(viewingTransaction.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">หมายเหตุ</span>
                <span className="text-base text-gray-700">{viewingTransaction.notes || '-'}</span>
              </div>
              
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setShowViewModal(false)} className="py-2 px-6 bg-teal-500 text-white font-bold rounded-xl hover:bg-teal-600 transition-all">ปิด</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}