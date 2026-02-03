"use client";
import { useState, useEffect, useMemo } from 'react';

// Utility for formatting currency
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(amount);
};

export default function BudgetManager({ onClose }) {
  // --- State ---
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState({}); // Map: { "Month Year": { categoryId: amount } }
  const [monthlyBudget, setMonthlyBudget] = useState({}); // Map: { "Month Year": totalAmount }
  const [editingMonthly, setEditingMonthly] = useState(false);
  const [editMonthlyAmount, setEditMonthlyAmount] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [currentMonthIndex, setCurrentMonthIndex] = useState(12);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal State for Editing
  const [editingCategory, setEditingCategory] = useState(null); // The category object being edited
  const [editAmount, setEditAmount] = useState('');

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
      const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
      m.push(`${monthNames[monthIndex]} ${year}`);
    }
    return m;
  }, []);

  const selectedMonth = months[currentMonthIndex];

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
          fetch('http://localhost:5050/api/categories', { headers }),
          fetch('http://localhost:5050/api/budgets', { headers }),
          fetch('http://localhost:5050/api/transactions', { headers }),
          fetch('http://localhost:5050/api/budgets/total', { headers })
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

        if (catRes.ok) setCategories(cats.filter(c => c.type === 'expense'));

        if (budgetRes.ok) {
          const budgetMap = {};
          buds.forEach(b => {
             if (!budgetMap[b.month]) budgetMap[b.month] = {};
             const catId = typeof b.category === 'object' ? b.category._id : b.category;
             budgetMap[b.month][catId] = b.total;
          });
          setBudgets(budgetMap);
        }

        if (transRes.ok) setTransactions(trans.filter(t => t.type === 'expense'));

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

    // --- Process Data for Display ---
    // Combine Categories + Budgets + Transactions for the selected month
    const processedData = useMemo(() => {
    const currentMonthTrans = transactions.filter(t => true); // ...existing logic...
    let totalBudget = 0;
    let totalSpent = 0;
    const list = categories.map(cat => {
      const budgetAmount = budgets[selectedMonth]?.[cat._id] || 0;
      const spentAmount = currentMonthTrans
        .filter(t => (typeof t.category === 'object' ? t.category._id : t.category) === cat._id)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      totalBudget += budgetAmount;
      totalSpent += spentAmount;
      const percent = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
      return {
        ...cat,
        budget: budgetAmount,
        spent: spentAmount,
        remaining: budgetAmount - spentAmount,
        percent: Math.min(percent, 100),
        isOverBudget: spentAmount > budgetAmount
      };
    });
    // งบรวมต่อเดือน (monthlyBudget) จะถูกใช้ใน summary card
    return {
      items: list.sort((a, b) => b.budget - a.budget),
      summary: {
        totalBudget,
        totalSpent,
        remaining: (monthlyBudget[selectedMonth] ?? totalBudget) - totalSpent,
        monthly: monthlyBudget[selectedMonth] ?? 0
      }
    };
    }, [categories, budgets, transactions, selectedMonth, monthlyBudget]);


  // --- Handlers ---
  const openEditModal = (category) => {
    setEditingCategory(category);
    setEditAmount(category.budget === 0 ? '' : category.budget.toString());
  };

  const handleSaveBudget = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const total = parseFloat(editAmount) || 0;

    try {
      await fetch('http://localhost:5050/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ category: editingCategory._id, month: selectedMonth, total }),
      });

      // Update local state immediately for UI responsiveness
      setBudgets(prev => ({
        ...prev,
        [selectedMonth]: {
            ...prev[selectedMonth],
            [editingCategory._id]: total
        }
      }));
      setEditingCategory(null);
    } catch (error) {
      alert('Error saving budget');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#F8FAFC] flex flex-col animate-fadeIn font-sans">
      
      {/* 1. Header & Month Navigator */}
      <div className="bg-white shadow-sm px-2 pt-4 pb-2 rounded-b-2xl z-10 max-w-lg mx-auto w-full">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-bold text-slate-800">วางแผนงบประมาณ</h2>
          <button onClick={onClose} className="p-1.5 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Month Selector */}
        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 mb-4">
            <button onClick={() => setCurrentMonthIndex(p => Math.max(0, p - 1))} className="p-2 hover:bg-white rounded-xl shadow-sm transition-all text-slate-400 hover:text-[#299D91]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <span className="font-bold text-slate-700">{selectedMonth}</span>
            <button onClick={() => setCurrentMonthIndex(p => Math.min(months.length - 1, p + 1))} className="p-2 hover:bg-white rounded-xl shadow-sm transition-all text-slate-400 hover:text-[#299D91]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
            </button>
        </div>

        {/* 2. Total Summary Card */}
        <div className="bg-gradient-to-br from-[#299D91] to-[#1F7A70] rounded-xl p-3 text-white shadow-md shadow-[#299D91]/20">
          <div className="flex justify-between items-center mb-1">
            <p className="text-teal-100 text-xs">งบประมาณคงเหลือสุทธิ</p>
            <button onClick={() => {
              setEditMonthlyAmount((monthlyBudget[selectedMonth] ?? '').toString());
              setEditingMonthly(true);
            }} className="text-xs text-white/80 hover:text-white underline underline-offset-2">ตั้งงบรวมเดือนนี้</button>
          </div>
          <h1 className="text-2xl font-bold mb-2">{formatCurrency(processedData.summary.remaining)}</h1>
          <div className="flex gap-2 border-t border-white/20 pt-2">
            <div>
              <p className="text-xs text-teal-100">งบรวมเดือนนี้</p>
              <p className="font-semibold text-sm">{formatCurrency(processedData.summary.monthly)}</p>
            </div>
            <div className="w-px bg-white/20"></div>
            <div>
              <p className="text-xs text-teal-100">ใช้จ่ายจริง</p>
              <p className="font-semibold text-sm">{formatCurrency(processedData.summary.totalSpent)}</p>
            </div>
          </div>
        </div>
            {/* Modal ตั้งงบรวมต่อเดือน */}
            {editingMonthly && (
              <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingMonthly(false)}>
                <div className="bg-white w-full max-w-xs p-4 rounded-t-2xl sm:rounded-2xl shadow-xl animate-slideUp" onClick={e => e.stopPropagation()}>
                  <div className="mb-4">
                    <p className="text-slate-500 text-xs mb-1">ตั้งงบประมาณรวมสำหรับ</p>
                    <h3 className="text-lg font-bold text-slate-800">{selectedMonth}</h3>
                  </div>
                  <form onSubmit={async e => {
                    e.preventDefault();
                    const token = localStorage.getItem('token');
                    const total = parseFloat(editMonthlyAmount) || 0;
                    try {
                      await fetch('http://localhost:5050/api/budgets/total', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ month: selectedMonth, total }),
                      });
                      setMonthlyBudget(prev => ({ ...prev, [selectedMonth]: total }));
                      setEditingMonthly(false);
                    } catch {
                      alert('Error saving monthly budget');
                    }
                  }}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">งบรวมเดือนนี้ (บาท)</label>
                    <div className="relative mb-6">
                      <input
                        type="number"
                        className="w-full text-2xl font-bold text-slate-800 border-b-2 border-slate-200 py-1.5 focus:border-[#299D91] outline-none bg-transparent placeholder-slate-300"
                        placeholder="0"
                        value={editMonthlyAmount}
                        onChange={e => setEditMonthlyAmount(e.target.value)}
                        autoFocus
                      />
                      <span className="absolute right-0 bottom-2 text-slate-400">THB</span>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setEditingMonthly(false)} className="flex-1 py-2.5 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50">ยกเลิก</button>
                      <button type="submit" className="flex-1 py-2.5 rounded-lg bg-[#299D91] text-white font-bold shadow-md shadow-teal-500/20 hover:bg-[#238A80]">บันทึก</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
      </div>

      {/* 3. Category List (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-2 space-y-3 max-w-lg mx-auto w-full">
        {isLoading ? (
            <div className="text-center py-10 text-slate-400">กำลังโหลดข้อมูล...</div>
        ) : (
            processedData.items.map((cat) => (
                <div 
                  key={cat._id} 
                  onClick={() => openEditModal(cat)}
                  className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer"
                >
                    <div className="flex items-center gap-4 mb-3">
                        {/* Icon Container */}
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg 
                          ${cat.budget > 0 ? 'bg-teal-50 text-[#299D91]' : 'bg-slate-50 text-slate-400'}`}>
                            {cat.icon || '🏷️'}
                        </div>
                        
                        <div className="flex-1">
                            <div className="flex justify-between items-center mb-1">
                              <h3 className="font-bold text-slate-700 text-sm">{cat.name}</h3>
                              {cat.budget > 0 ? (
                                <span className={`text-xs font-semibold ${cat.isOverBudget ? 'text-rose-500' : 'text-[#299D91]'}`}>
                                  {cat.isOverBudget ? 'เกินงบ' : 'เหลือ'} {formatCurrency(Math.abs(cat.remaining))}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">ยังไม่ตั้งงบ</span>
                              )}
                            </div>

                            {/* Progress Bar */}
                            {cat.budget > 0 && (
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      cat.isOverBudget ? 'bg-rose-500' : cat.percent > 80 ? 'bg-amber-400' : 'bg-[#299D91]'
                                    }`} 
                                    style={{ width: `${cat.percent}%` }}
                                  />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* Small stats under bar */}
                    {cat.budget > 0 && (
                        <div className="flex justify-between text-[11px] text-slate-400 pl-12">
                          <span>ใช้ไป {formatCurrency(cat.spent)}</span>
                          <span>เป้าหมาย {formatCurrency(cat.budget)}</span>
                        </div>
                    )}
                </div>
            ))
        )}
        <div className="h-6"></div> {/* Bottom Spacer */}
      </div>

      {/* 4. Edit Budget Bottom Sheet / Modal */}
        {editingCategory && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setEditingCategory(null)}>
          <div 
            className="bg-white w-full max-w-xs p-4 rounded-t-2xl sm:rounded-2xl shadow-xl animate-slideUp" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-xl">
                {editingCategory.icon || '🏷️'}
              </div>
              <div>
                <p className="text-slate-500 text-xs">ตั้งงบประมาณสำหรับ</p>
                <h3 className="text-lg font-bold text-slate-800">{editingCategory.name}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedMonth}</p>
              </div>
            </div>

            <form onSubmit={handleSaveBudget}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">วงเงินที่ต้องการ (บาท)</label>
              <div className="relative mb-6">
                <input 
                  type="number" 
                  className="w-full text-2xl font-bold text-slate-800 border-b-2 border-slate-200 py-1.5 focus:border-[#299D91] outline-none bg-transparent placeholder-slate-300"
                  placeholder="0"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  autoFocus
                />
                <span className="absolute right-0 bottom-2 text-slate-400">THB</span>
              </div>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setEditingCategory(null)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 rounded-lg bg-[#299D91] text-white font-bold shadow-md shadow-teal-500/20 hover:bg-[#238A80]"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
        )}
    </div>
  );
}