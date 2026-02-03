"use client";
import { useEffect, useMemo, useState } from "react";

/* ---------- utils ---------- */
const money = (n = 0) =>
  new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(n);

/* ---------- component ---------- */
export default function BudgetDashboard() {
  const [cutDay, setCutDay] = useState(1);
  const [tab, setTab] = useState("expense");
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState({});
  const [loading, setLoading] = useState(true);

  /* ---------- load data ---------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("http://localhost:5050/api/categories", { headers }).then(r => r.json()),
      fetch("http://localhost:5050/api/transactions", { headers }).then(r => r.json()),
      fetch("http://localhost:5050/api/budgets", { headers }).then(r => r.json()),
    ])
      .then(([cats, trans, buds]) => {
        /* categories */
        setCategories(
          Array.isArray(cats)
            ? cats.filter(c => c && c._id && c.type)
            : []
        );

        /* transactions (sanitize 100%) */
        setTransactions(
          Array.isArray(trans)
            ? trans.filter(t =>
                t &&
                t.amount &&
                t.type &&
                t.category &&
                (typeof t.category === "string" ||
                  (typeof t.category === "object" && t.category._id))
              )
            : []
        );

        /* budgets map */
        const map = {};
        Array.isArray(buds) &&
          buds.forEach(b => {
            const cid =
              typeof b.category === "object"
                ? b.category?._id
                : b.category;
            if (cid) map[cid] = b.amount || 0;
          });
        setBudgets(map);
      })
      .finally(() => setLoading(false));
  }, []);

  /* ---------- cut round ---------- */
  const periodTransactions = useMemo(() => {
    const now = new Date();
    const start =
      now.getDate() >= cutDay
        ? new Date(now.getFullYear(), now.getMonth(), cutDay)
        : new Date(now.getFullYear(), now.getMonth() - 1, cutDay);

    return transactions.filter(t => new Date(t.date) >= start);
  }, [transactions, cutDay]);

  /* ---------- summary ---------- */
  const summary = useMemo(() => {
    let income = 0;
    let expense = 0;
    periodTransactions.forEach(t => {
      t.type === "income"
        ? (income += t.amount)
        : (expense += t.amount);
    });
    return { income, expense, balance: income - expense };
  }, [periodTransactions]);

  /* ---------- budget rows ---------- */
  const rows = useMemo(() => {
    return categories
      .filter(c => c.type === tab)
      .map(cat => {
        const used = periodTransactions
          .filter(t => {
            const cid =
              typeof t.category === "object"
                ? t.category._id
                : t.category;
            return cid === cat._id;
          })
          .reduce((s, t) => s + t.amount, 0);

        const budget = budgets[cat._id] || 0;

        return {
          id: cat._id,
          name: cat.name,
          budget,
          used,
          remain: budget - used,
        };
      });
  }, [categories, periodTransactions, budgets, tab]);

  /* ---------- save budget ---------- */
  const saveBudget = async (categoryId, amount) => {
    const token = localStorage.getItem("token");
    await fetch("http://localhost:5050/api/budgets", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ category: categoryId, amount }),
    });
    setBudgets(prev => ({ ...prev, [categoryId]: amount }));
  };

  /* ---------- UI ---------- */
  return (
    <div className="min-h-screen bg-[#F7F7F7] p-4">
      <h1 className="text-xl font-bold mb-4">งบประมาณ</h1>

      {/* cut off */}
      <div className="bg-white p-4 rounded-xl shadow mb-4">
        <label className="text-sm text-slate-500">วันตัดรอบ</label>
        <select
          className="w-full border rounded p-2 mt-1"
          value={cutDay}
          onChange={e => setCutDay(Number(e.target.value))}
        >
          {Array.from({ length: 28 }).map((_, i) => (
            <option key={i} value={i + 1}>
              วันที่ {i + 1}
            </option>
          ))}
        </select>
      </div>

      {/* summary */}
      <div className="bg-white p-4 rounded-xl shadow mb-4 text-center">
        <p className="text-sm text-slate-400">คงเหลือ</p>
        <p className="text-2xl font-bold text-[#299D91]">
          {money(summary.balance)}
        </p>
        <div className="flex justify-between text-sm mt-2">
          <span>รายรับ {money(summary.income)}</span>
          <span>รายจ่าย {money(summary.expense)}</span>
        </div>
      </div>

      {/* tabs */}
      <div className="flex bg-white rounded-xl shadow mb-3">
        {["expense", "income"].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 font-semibold rounded-xl ${
              tab === t
                ? "bg-[#299D91] text-white"
                : "text-slate-500"
            }`}
          >
            {t === "expense" ? "รายจ่าย" : "รายรับ"}
          </button>
        ))}
      </div>

      {/* list */}
      {loading ? (
        <p className="text-center text-slate-400">กำลังโหลด...</p>
      ) : (
        rows.map(r => (
          <div
            key={r.id}
            className="bg-white p-4 rounded-xl shadow mb-3 flex justify-between"
          >
            <div>
              <p className="font-semibold">{r.name}</p>
              <p className="text-xs text-slate-400">
                งบ {money(r.budget)} | ใช้ {money(r.used)}
              </p>
            </div>
            <button
              onClick={() => {
                const v = prompt("ตั้งงบ", r.budget);
                if (v !== null) saveBudget(r.id, Number(v));
              }}
              className={`font-bold ${
                r.remain < 0 ? "text-red-500" : ""
              }`}
            >
              {money(r.remain)}
            </button>
          </div>
        ))
      )}
    </div>
  );
}
