"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

const MOCK_RATES = {
  THB: { USD: 0.027, EUR: 0.025, GBP: 0.021, JPY: 4.1, CNY: 0.19, SGD: 0.036, AUD: 0.041 },
  USD: { THB: 37.0, EUR: 0.92, GBP: 0.78, JPY: 151.5, CNY: 7.2, SGD: 1.35, AUD: 1.52 },
  EUR: { THB: 40.2, USD: 1.09, GBP: 0.85, JPY: 165.0, CNY: 7.8, SGD: 1.47, AUD: 1.65 },
  GBP: { THB: 47.3, USD: 1.28, EUR: 1.18, JPY: 194.0, CNY: 9.2, SGD: 1.73, AUD: 1.94 },
  JPY: { THB: 0.24, USD: 0.0066, EUR: 0.0061, GBP: 0.0052, CNY: 0.048, SGD: 0.0089, AUD: 0.01 },
  CNY: { THB: 5.1, USD: 0.14, EUR: 0.13, GBP: 0.11, JPY: 20.8, SGD: 0.19, AUD: 0.21 },
  SGD: { THB: 27.8, USD: 0.74, EUR: 0.68, GBP: 0.58, JPY: 112.0, CNY: 5.3, AUD: 1.12 },
  AUD: { THB: 24.8, USD: 0.66, EUR: 0.61, GBP: 0.52, JPY: 100.0, CNY: 4.7, SGD: 0.89 },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Currency({ onClose }) {
  const currencies = useMemo(() => ['THB', 'USD', 'EUR', 'GBP', 'JPY', 'CNY', 'SGD', 'AUD'], []);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [amount, setAmount] = useState(0);
  const [currencyFrom, setCurrencyFrom] = useState('THB');
  const [currencyTo, setCurrencyTo] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(null);
  const [convertedAmount, setConvertedAmount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof exchangeRate === 'number' && Number.isFinite(exchangeRate)) setConvertedAmount(amount * exchangeRate);
    else setConvertedAmount(0);
  }, [amount, exchangeRate]);

  const fetchExchangeRate = useCallback(async () => {
    if (currencyFrom === currencyTo) {
      setExchangeRate(1);
      setError('');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await sleep(650);
      const rate = MOCK_RATES?.[currencyFrom]?.[currencyTo];
      if (typeof rate !== 'number' || !Number.isFinite(rate)) {
        throw new Error('ไม่พบอัตราแลกเปลี่ยนสำหรับสกุลเงินนี้');
      }
      setExchangeRate(rate);
    } catch (err) {
      setExchangeRate(null);
      setError(err?.message ? String(err.message) : 'ไม่สามารถโหลดอัตราแลกเปลี่ยนได้');
    } finally {
      setLoading(false);
    }
  }, [currencyFrom, currencyTo]);

  useEffect(() => {
    fetchExchangeRate();
  }, [fetchExchangeRate]);

  const handleRefresh = () => {
    setAmount(0);
    setCurrencyFrom('THB');
    setCurrencyTo('USD');
    setExchangeRate(null);
    setConvertedAmount(0);
    setError('');
  };

  const swapCurrencies = () => {
    setCurrencyFrom(currencyTo);
    setCurrencyTo(currencyFrom);
  };

  const overlayClassName = onClose
    ? 'fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-sm p-0 sm:p-4'
    : 'fixed inset-0 z-[75] flex items-end sm:items-center justify-center bg-slate-950/45 backdrop-blur-sm p-0 sm:p-4';

  const sheetClassName = onClose
    ? 'relative bg-[var(--app-surface)] text-[color:var(--app-text)] w-full max-w-none sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/40 overflow-hidden border border-[color:var(--app-border)] flex flex-col h-[94dvh] max-h-[94dvh] sm:h-auto sm:max-h-[85dvh] animate-slideUp'
    : 'relative bg-[var(--app-surface)] text-[color:var(--app-text)] w-full max-w-none sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl shadow-black/40 overflow-hidden border border-[color:var(--app-border)] flex flex-col h-[92dvh] max-h-[92dvh] sm:h-auto sm:max-h-[85dvh] animate-slideUp';

  const modal = (
    <div
      className={overlayClassName}
      onClick={(e) => {
        if (!onClose) return;
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={sheetClassName} role="dialog" aria-modal="true">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 hover:bg-white/25 transition z-10"
            aria-label="ปิด"
            title="ปิด"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-500 to-green-500 text-slate-950 px-5 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] sm:pt-5 overflow-hidden">
          <div className="absolute top-0 right-0 w-28 h-28 bg-white/10 rounded-full -mr-14 -mt-14" aria-hidden="true" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" aria-hidden="true" />

          <div className="relative flex items-center gap-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-2 0-3 1-3 2s1 2 3 2 3 1 3 2-1 2-3 2m0-8V7m0 1v8m0 0v1" />
              </svg>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch] p-5 pb-[calc(env(safe-area-inset-bottom)+24px)] sm:pb-6 space-y-4">
          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-rose-200 text-xs font-semibold">
              {error}
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">จำนวนเงิน</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-base font-extrabold text-slate-100 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
                placeholder="เช่น 100"
                inputMode="decimal"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="text-[color:var(--app-muted-2)] font-extrabold text-sm">{currencyFrom}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">จาก</label>
              <select
                value={currencyFrom}
                onChange={(e) => setCurrencyFrom(e.target.value)}
                className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-extrabold text-slate-100 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={swapCurrencies}
              className="mb-1 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              aria-label="สลับสกุลเงิน"
              title="สลับ"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h10M7 7l3-3M7 7l3 3M17 17H7m10 0l-3-3m3 3l-3 3" />
              </svg>
            </button>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">เป็น</label>
              <select
                value={currencyTo}
                onChange={(e) => setCurrencyTo(e.target.value)}
                className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm font-extrabold text-slate-100 shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/30"
              >
                {currencies.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {typeof exchangeRate === 'number' && Number.isFinite(exchangeRate) ? (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 ring-1 ring-emerald-400/15">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-[color:var(--app-muted)]">อัตราแลกเปลี่ยน</span>
                <span className="text-sm font-extrabold text-emerald-200 shrink-0">
                  1 {currencyFrom} = {exchangeRate.toFixed(4)} {currencyTo}
                </span>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">ผลลัพธ์</label>
            <div className="relative">
              <input
                type="text"
                value={loading ? 'กำลังโหลด...' : convertedAmount.toFixed(2)}
                readOnly
                className="w-full h-12 rounded-2xl border border-white/10 bg-white/5 px-4 text-base font-extrabold text-slate-100 shadow-sm"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <span className="text-[color:var(--app-muted-2)] font-extrabold text-sm">{currencyTo}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="py-3 rounded-2xl bg-emerald-500 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/20 hover:brightness-95 disabled:opacity-50 disabled:hover:brightness-100"
            >
              {loading ? 'กำลังโหลด...' : 'รีเฟรช'}
            </button>

            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="py-3 rounded-2xl border border-white/10 font-extrabold text-slate-100 bg-white/5 hover:bg-white/10"
              >
                ปิด
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="py-3 rounded-2xl border border-white/10 font-extrabold text-slate-100 bg-white/5 hover:bg-white/10 text-center"
              >
                กลับ
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (onClose) {
    if (!mounted) return null;
    return createPortal(modal, document.body);
  }

  return modal;
}
