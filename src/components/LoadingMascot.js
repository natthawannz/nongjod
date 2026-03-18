"use client";

import Image from 'next/image';

export default function LoadingMascot({
  label = 'กำลังโหลด...',
  size = 72,
  className = '',
}) {
  const px = Number(size) || 72;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status" aria-live="polite">
      <Image
        src="/profilejiwloadding.png"
        alt="Loading"
        width={px}
        height={px}
        priority
        unoptimized
        className="motion-safe:animate-bounce [animation-duration:1.15s]"
      />
      {label ? (
        <div className="text-sm font-semibold text-[color:var(--app-muted)]">{label}</div>
      ) : null}
    </div>
  );
}
