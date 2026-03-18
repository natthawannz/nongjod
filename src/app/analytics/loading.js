"use client";

import LoadingMascot from '@/components/LoadingMascot';

export default function Loading() {
  return (
    <main className="min-h-[100dvh] bg-[var(--app-bg)] text-[color:var(--app-text)] flex items-center justify-center p-6">
      <LoadingMascot label="กำลังโหลดหน้า..." size={88} />
    </main>
  );
}

