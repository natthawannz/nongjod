"use client";
import React from 'react';

export default function ExportButton({
  onClick,
  className = '',
  label = 'ส่งออก',
  iconOnly = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        'inline-flex items-center justify-center gap-2',
        iconOnly ? 'h-10 w-10 rounded-xl p-0' : 'h-10 rounded-xl px-3',
        'bg-white border border-slate-200 text-slate-700 shadow-sm',
        'hover:bg-slate-50 active:scale-[0.99] transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/20',
        className,
      ].join(' ')}
    >
      <svg className="h-5 w-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v12m0 0l-4-4m4 4l4-4M21 21H3"/>
      </svg>
      {!iconOnly && <span className="text-sm font-semibold">{label}</span>}
    </button>
  );
}
