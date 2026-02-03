"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pie, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from 'chart.js';
// ใช้ Lucide Icons แทน SVG วาดเองและ Emoji
import { 
  Wallet, TrendingUp, TrendingDown, Calendar, 
  ChevronLeft, ChevronRight, PieChart, BarChart3,
  Utensils, ShoppingBag, Car, Home, Zap, Heart, 
  Gamepad2, Stethoscope, GraduationCap, Plane, 
  Briefcase, Gift, Smartphone, Coffee, Music, 
  Dumbbell, PawPrint, Scissors, CreditCard, 
  Landmark, MoreHorizontal, Layers
} from 'lucide-react';

// ลงทะเบียน Chart.js
ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, Tooltip, Legend);

// --- 1. ICON CONFIG ---
// Map ชื่อไอคอน (จาก Database) ให้เป็น Component
const ICON_MAP = {
  'food': Utensils, 'drink': Coffee, 'restaurant': Utensils,
  'shopping': ShoppingBag, 'gift': Gift, 'clothes': Scissors,
  'transport': Car, 'fuel': Zap, 'plane': Plane,
  'home': Home, 'bills': Zap, 'pet': PawPrint,
  'game': Gamepad2, 'music': Music, 'health': Stethoscope, 'sport': Dumbbell,
  'money': Landmark, 'salary': CreditCard, 'work': Briefcase,
  'education': GraduationCap, 'tech': Smartphone,
  'other': MoreHorizontal, 'love': Heart
};

// Component ช่วยแสดง Icon (รองรับข้อมูลเก่าที่เป็น Emoji)
const CategoryIcon = ({ iconName, className = "w-5 h-5" }) => {
  const IconComp = ICON_MAP[iconName];
  if (IconComp) return <IconComp className={className} />;
  // Fallback สำหรับข้อมูลเก่าที่เป็น Emoji
  return <span className="text-lg leading-none">{iconName || '?'}</span>;
};

// --- 2. CONSTANTS ---
const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

export default function Analytics() {
  const router = useRouter();

  // --- STATE ---
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(60); // เริ่มที่เดือนปัจจุบัน
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  // Filter State
  const [filterText, setFilterText] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'income', 'expense'

  // --- LOGIC: Date Management ---
  const getMonths = () => {
    const months = [];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear(); 
    const currentMonth = currentDate.getMonth();
    
    // Generate 60 months back and 12 months forward
    for (let i = -60; i < 12; i++) {
      const d = new Date(currentYear, currentMonth + i, 1);
      months.push({
        label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear() + 543}`,
        value: d
      });
    }
    return months;
  };
  
  const monthList = getMonths();
  const selectedMonthObj = monthList[currentMonthIndex];

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
          fetch('http://localhost:5050/api/transactions', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('http://localhost:5050/api/categories', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const dataTrans = await resTrans.json();
        const dataCats = await resCats.json();

        if (resTrans.ok && resCats.ok) {
          setTransactions(dataTrans);
          setCategories(dataCats);
        } else {
          throw new Error('Failed to fetch data');
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [router]);

  // --- LOGIC: Filter & Calculations ---
  // กรอง Transaction ตามเดือนที่เลือก
  let filteredTransactions = transactions.filter((t) => {
    const tDate = new Date(t.date);
    const mDate = selectedMonthObj.value;
    return tDate.getMonth() === mDate.getMonth() && tDate.getFullYear() === mDate.getFullYear();
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter by type
  if (filterType !== 'all') {
    filteredTransactions = filteredTransactions.filter(t => t.type === filterType);
  }

  // Apply filterText (search หมวดหมู่/หมายเหตุ)
  if (filterText.trim()) {
    filteredTransactions = filteredTransactions.filter(t => {
      const cat = categories.find(c => c._id === t.category?._id || c._id === t.category);
      const catName = cat?.name?.toLowerCase() || '';
      const notes = (t.notes || '').toLowerCase();
      return catName.includes(filterText.toLowerCase()) || notes.includes(filterText.toLowerCase());
    });
  }

  // คำนวณยอดรวม
  const summary = filteredTransactions.reduce((acc, t) => {
    if (t.type === 'income') acc.income += t.amount;
    else acc.expense += t.amount;
    return acc;
  }, { income: 0, expense: 0 });
  
  const balance = summary.income - summary.expense;

  // จัดกลุ่มรายจ่ายตามหมวดหมู่
  const expenseByCategory = {};
  filteredTransactions.filter(t => t.type === 'expense').forEach(t => {
    const catName = t.category?.name || 'Uncategorized';
    expenseByCategory[catName] = (expenseByCategory[catName] || 0) + t.amount;
  });

  // --- CHART CONFIG ---
  const pieData = {
    labels: Object.keys(expenseByCategory),
    datasets: [{
      data: Object.values(expenseByCategory),
      backgroundColor: [
        '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', 
        '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6'
      ],
      borderWidth: 0,
    }]
  };

  const barData = {
    labels: ['รายรับ', 'รายจ่าย'],
    datasets: [{
      label: 'จำนวนเงิน (บาท)',
      data: [summary.income, summary.expense],
      backgroundColor: ['#10b981', '#f43f5e'], // Emerald-500, Rose-500
      borderRadius: 8,
      barThickness: 50,
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { font: { family: 'ui-sans-serif' } } }
    },
    scales: {
      y: { display: false, grid: { display: false } },
      x: { grid: { display: false } }
    }
  };

  // --- PAGINATION Logic ---
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const currentTableData = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 pb-12">
      
      {/* HEADER SECTION */}
      <header className="bg-white shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">ภาพรวมการเงิน</h1>
                <p className="text-xs text-slate-500">วิเคราะห์รายรับ-รายจ่ายของคุณ</p>
              </div>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center bg-slate-100 rounded-full p-1 shadow-inner">
              <button 
                onClick={() => setCurrentMonthIndex(prev => Math.max(0, prev - 1))}
                className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-slate-500"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="px-6 min-w-[160px] text-center">
                <span className="text-sm font-bold text-slate-700 block">{selectedMonthObj.label}</span>
              </div>
              <button 
                onClick={() => setCurrentMonthIndex(prev => Math.min(monthList.length - 1, prev + 1))}
                className="p-2 rounded-full hover:bg-white hover:shadow-sm transition-all text-slate-500"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        
        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Income Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-emerald-200 transition-colors">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">รายรับรวม</p>
              <h3 className="text-2xl font-bold text-emerald-600">฿{summary.income.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-500 group-hover:bg-emerald-100 transition-colors">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* Expense Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-rose-200 transition-colors">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">รายจ่ายรวม</p>
              <h3 className="text-2xl font-bold text-rose-600">฿{summary.expense.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl text-rose-500 group-hover:bg-rose-100 transition-colors">
              <TrendingDown className="w-6 h-6" />
            </div>
          </div>

          {/* Balance Card */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase mb-1">คงเหลือสุทธิ</p>
              <h3 className={`text-2xl font-bold ${balance >= 0 ? 'text-slate-800' : 'text-red-500'}`}>
                ฿{balance.toLocaleString()}
              </h3>
            </div>
            <div className={`p-3 rounded-xl ${balance >= 0 ? 'bg-indigo-50 text-indigo-500' : 'bg-red-50 text-red-500'}`}>
              <Wallet className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* CHARTS SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="w-5 h-5 text-slate-400" />
              <h3 className="font-bold text-slate-700">สัดส่วนค่าใช้จ่าย</h3>
            </div>
            <div className="h-64 flex justify-center">
              {Object.keys(expenseByCategory).length > 0 ? (
                <Pie data={pieData} options={chartOptions} />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-300">
                  <Layers className="w-12 h-12 mb-2 opacity-50" />
                  <p>ไม่มีข้อมูลรายจ่าย</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-slate-400" />
              <h3 className="font-bold text-slate-700">เปรียบเทียบ รับ-จ่าย</h3>
            </div>
            <div className="h-64">
               <Bar data={barData} options={chartOptions} />
            </div>
          </div>
        </div>

        {/* TRANSACTIONS TABLE */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-700">รายการล่าสุด</h3>
              <span className="text-xs font-medium bg-slate-100 text-slate-500 px-2 py-1 rounded-md">
                {filteredTransactions.length} รายการ
              </span>
            </div>
            {/* Filter Controls */}
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
              <select
                value={filterType}
                onChange={e => { setFilterType(e.target.value); setCurrentPage(1); }}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 text-sm min-w-[120px]"
              >
                <option value="all">ทั้งหมด</option>
                <option value="income">รายรับ</option>
                <option value="expense">รายจ่าย</option>
              </select>
              <input
                type="text"
                value={filterText}
                onChange={e => { setFilterText(e.target.value); setCurrentPage(1); }}
                className="w-full md:w-64 px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 text-sm"
                placeholder="ค้นหาหมวดหมู่หรือหมายเหตุ..."
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4">วันที่</th>
                  <th className="px-6 py-4">หมวดหมู่</th>
                  <th className="px-6 py-4">หมายเหตุ</th>
                  <th className="px-6 py-4 text-right">จำนวนเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentTableData.length > 0 ? currentTableData.map((t) => {
                  const cat = categories.find(c => c._id === t.category?._id || c._id === t.category);
                  const isExpense = t.type === 'expense';
                  return (
                    <tr key={t._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">
                            {new Date(t.date).getDate()}
                          </span>
                          <span className="text-xs text-slate-400">
                            {MONTH_NAMES[new Date(t.date).getMonth()]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isExpense ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                             {/* เรียกใช้ Icon Helper */}
                             <CategoryIcon iconName={cat?.icon} />
                          </div>
                          <span className="text-sm font-medium text-slate-700">{cat?.name || 'ทั่วไป'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">{t.notes || '-'}</span>
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isExpense ? '-' : '+'}{t.amount.toLocaleString()}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                      ไม่มีรายการในเดือนนี้
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-50 flex justify-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                ก่อนหน้า
              </button>
              <span className="px-4 py-2 text-sm text-slate-500 flex items-center">
                หน้า {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
              >
                ถัดไป
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}