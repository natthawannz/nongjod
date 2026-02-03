"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import './globals.css';

// --- Icons (ปรับให้ตรงกับรูปภาพ) ---
const IconHome = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const IconBudget = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>; // รูป Pie Chart สำหรับ หมวด/งบ
const IconPlus = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const IconAnalytics = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconSettings = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

// --- Root Layout Component ---
export default function RootLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  const isLanding = ['/', '/register', '/login', '/change-password', '/forgot-password', '/reset-password'].includes(pathname);
    
  // --- Effects ---
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  const isActive = (path) => pathname === path;

  // --- Bottom Nav Item Component ---
  const BottomNavItem = ({ href, icon, label }) => {
    const active = isActive(href);
    return (
      <Link href={href} className="flex-1 group">
        <div className={`flex flex-col items-center justify-center py-2 transition-colors duration-200 ${
          active ? 'text-teal-600' : 'text-slate-400 hover:text-slate-600'
        }`}>
          {icon}
          <span className={`text-[10px] mt-1 font-medium ${active ? 'text-teal-600' : 'text-slate-400'}`}>
            {label}
          </span>
        </div>
      </Link>
    );
  };

  return (
   <html lang="th" suppressHydrationWarning>
      <body className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans selection:bg-teal-100 selection:text-teal-900 overflow-x-hidden pb-24">
        {/* pb-24: เพิ่ม padding ด้านล่าง เพื่อไม่ให้เนื้อหาถูก Bottom Bar บัง */}
        


        {/* --- Main Content Area --- */}
        <main
          className={[
            'relative z-10 min-h-screen flex flex-col',
            'w-full',
            'max-w-md mx-auto', // mobile/tablet default
            'md:max-w-3xl md:px-6', // tablet landscape
            'lg:max-w-5xl', // desktop medium
            'xl:max-w-7xl', // desktop large
            'md:mx-auto',
            'pb-28 md:pb-10', // bottom nav padding only on mobile
            'bg-white'
          ].join(' ')}
        >
          {/* Responsive main: mobile center, desktop wide, bottom padding for nav */}
          {children}
        </main>

        {/* --- Bottom Navigation Bar (แสดงเฉพาะตอน Login และไม่ใช่หน้า Landing) --- */}
        {isLoggedIn && !isLanding && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div
              className={[
                'mx-auto px-2 h-[72px] flex items-center justify-between relative',
                'max-w-md',
                'md:max-w-3xl',
                'lg:max-w-5xl',
                'xl:max-w-7xl',
              ].join(' ')}
            >
              {/* 1. หน้าหลัก */}
              <BottomNavItem href="/dashboard" icon={<IconHome />} label="หน้าหลัก" />

              {/* 2. หมวด / งบ */}
              <BottomNavItem href="/budget" icon={<IconBudget />} label="หมวด / งบ" />

              {/* 3. เพิ่มรายการ (ปุ่มตรงกลาง) */}
              <div className="relative flex-1 flex justify-center">
                <Link href="/transactions/add">
                  <div className="
                    w-16 h-16 md:w-20 md:h-20
                    rounded-full bg-teal-500 shadow-lg shadow-teal-500/40 flex items-center justify-center text-white border-4 border-[#F8FAFC]
                    transform transition-transform active:scale-95
                    -mt-6 md:-mt-8
                  ">
                    <IconPlus />
                  </div>
                </Link>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] md:text-xs font-medium text-slate-400 whitespace-nowrap">เพิ่มรายการ</span>
              </div>

              {/* 4. สรุป / วิเคราะห์ */}
              <BottomNavItem href="/analytics" icon={<IconAnalytics />} label="สรุป/วิเคราะห์" />

              {/* 5. โปรไฟล์ */}
              <BottomNavItem href="/profile" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} label="โปรไฟล์" />
            </div>
          </div>
        )}

      </body>
   </html>
  );
}