"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import './globals.css';

// --- Icons (ปรับให้ตรงกับรูปภาพ) ---
const IconHome = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const IconBudget = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>; // รูป Pie Chart สำหรับ หมวด/งบ
const IconPlus = () => <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>;
const IconAnalytics = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconList = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const IconSettings = () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    const payload = JSON.parse(json);
    return payload && typeof payload === 'object' ? payload : null;
  } catch {
    try {
      const payload = JSON.parse(atob(base64));
      return payload && typeof payload === 'object' ? payload : null;
    } catch {
      return null;
    }
  }
};

const isTokenValid = (token) => {
  const payload = decodeJwtPayload(token);
  const exp = payload?.exp;
  if (!exp || !Number.isFinite(Number(exp))) return false; // require expiry for security
  const expMs = Number(exp) * 1000;
  return Date.now() < expMs;
};

// --- Root Layout Component ---
export default function RootLayout({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [language, setLanguage] = useState('th'); // 'th' | 'en'
  const pathname = usePathname();
  const router = useRouter();
  
  const isLanding = ['/', '/register', '/login', '/change-password', '/forgot-password', '/reset-password'].includes(pathname);
    
  // --- Effects ---
  useEffect(() => {
    // If token present in URL (from LINE callback), persist it to localStorage
    try {
      const params = new URLSearchParams(window.location.search);
      const tokenFromUrl = params.get('token');
      const profilePic = params.get('profilePic');
      const next = params.get('next');
      if (tokenFromUrl) {
        localStorage.setItem('token', tokenFromUrl);
        if (profilePic) localStorage.setItem('profilePic', decodeURIComponent(profilePic));
        // remove token/profilePic/next from URL to keep it clean
        params.delete('token');
        params.delete('profilePic');
        params.delete('next');
        const newSearch = params.toString();
        const newUrl = window.location.pathname + (newSearch ? `?${newSearch}` : '');
        window.history.replaceState({}, document.title, newUrl);

        // If a deep-link target is provided, jump there after saving the token.
        if (next && String(next).startsWith('/') && String(next) !== window.location.pathname) {
          window.location.replace(String(next));
          return;
        }
      }
    } catch (e) {
      // ignore
    }
    const token = localStorage.getItem('token');
    const ok = isTokenValid(token);
    if (!ok) {
      try { localStorage.removeItem('token'); } catch {}
      setIsLoggedIn(false);
    } else {
      setIsLoggedIn(true);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    const ok = isTokenValid(token);
    if (!ok) {
      try { localStorage.removeItem('token'); } catch {}
      setIsLoggedIn(false);
      if (!isLanding && pathname) router.replace('/login');
      return;
    }
    setIsLoggedIn(true);
    // If already logged in, keep landing pages reachable (user may want logout/change-password)
  }, [pathname, isLanding, router]);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e || (e.key && e.key !== 'token')) return;
      try {
        const token = localStorage.getItem('token');
        const ok = isTokenValid(token);
        setIsLoggedIn(ok);
        if (!ok && !isLanding) router.replace('/login');
      } catch {
        setIsLoggedIn(false);
        if (!isLanding) router.replace('/login');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [isLanding, router]);

  useEffect(() => {
    const readTheme = () => {
      try {
        const v = localStorage.getItem('balanz_theme');
        setTheme(v === 'light' ? 'light' : 'dark');
      } catch {
        setTheme('dark');
      }
    };

    readTheme();
    const onCustom = () => readTheme();
    const onStorage = (e) => {
      if (e && e.key && e.key !== 'balanz_theme') return;
      readTheme();
    };

    window.addEventListener('balanz_theme_change', onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('balanz_theme_change', onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    const readLang = () => {
      try {
        const v = localStorage.getItem('balanz_lang');
        setLanguage(v === 'en' ? 'en' : 'th');
      } catch {
        setLanguage('th');
      }
    };

    readLang();
    const onCustom = () => readLang();
    const onStorage = (e) => {
      if (e && e.key && e.key !== 'balanz_lang') return;
      readLang();
    };

    window.addEventListener('balanz_lang_change', onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('balanz_lang_change', onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = language === 'en' ? 'en' : 'th';
    } catch {
      // ignore
    }
  }, [language]);

  const isActive = (path) => pathname === path;
  const effectiveTheme = isLanding ? 'light' : (theme === 'light' ? 'light' : 'dark');
  const t = (key) => {
    const dict = {
      th: {
        nav_summary: 'สรุป',
        nav_analytics: 'วิเคราะห์',
        nav_budget: 'หมวด / งบ',
        nav_transactions: 'รายการ',
        nav_settings: 'ตั้งค่า',
      },
      en: {
        nav_summary: 'Summary',
        nav_analytics: 'Analytics',
        nav_budget: 'Budget',
        nav_transactions: 'Transactions',
        nav_settings: 'Settings',
      },
    };
    const d = dict[language] || dict.th;
    return d[key] || dict.th[key] || key;
  };

  // --- Bottom Nav Item Component ---
  const BottomNavItem = ({ href, icon, label }) => {
    const active = isActive(href);
    return (
      <Link href={href} className="flex-1 group">
        <div
          className={[
            'flex flex-col items-center justify-center py-2 transition-colors duration-200',
            active ? 'text-[color:var(--app-accent)]' : 'text-[color:var(--app-muted)] hover:text-[color:var(--app-text)]',
          ].join(' ')}
        >
          {icon}
          <span
            className={[
              'text-[10px] mt-1 font-medium',
              active ? 'text-[color:var(--app-accent)]' : 'text-[color:var(--app-muted)]',
            ].join(' ')}
          >
            {label}
          </span>
        </div>
      </Link>
    );
  };

  return (
   <html lang={language === 'en' ? 'en' : 'th'} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={[
          'app min-h-screen font-sans overflow-x-hidden pb-24',
          effectiveTheme === 'dark'
            ? 'app-dark bg-[var(--app-bg)] text-[var(--app-text)] selection:bg-emerald-500/20 selection:text-emerald-100'
            : 'app-light bg-[var(--app-bg)] text-[color:var(--app-text)] selection:bg-emerald-200 selection:text-emerald-950',
        ].join(' ')}
      >
        {/* pb-24: เพิ่ม padding ด้านล่าง เพื่อไม่ให้เนื้อหาถูก Bottom Bar บัง */}
        


        {/* --- Main Content Area --- */}
        <main
          className={[
            'relative z-10 min-h-screen w-full pb-28 md:pb-10',
            isLanding ? 'bg-white' : 'bg-transparent',
          ].join(' ')}
        >
          <div
            className={[
              isLanding ? 'w-full' : '',
            ].join(' ')}
          >
            {children}
          </div>
        </main>

        {/* --- Bottom Navigation Bar (แสดงเฉพาะตอน Login และไม่ใช่หน้า Landing) --- */}
        {isLoggedIn && !isLanding && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur border-t border-[color:var(--app-border)] shadow-[0_-10px_25px_-12px_rgba(0,0,0,0.20)]"
            style={{ backgroundColor: 'var(--app-surface)' }}
          >
            <div
              className={[
                'mx-auto h-[72px] w-full max-w-[1550px] px-4 sm:px-6 lg:px-8',
                'flex items-center justify-between relative',
              ].join(' ')}
            >
              <BottomNavItem href="/dashboard" icon={<IconHome />} label={t('nav_summary')} />

              <BottomNavItem href="/analytics" icon={<IconAnalytics />} label={t('nav_analytics')} />

              <BottomNavItem href="/budget" icon={<IconBudget />} label={t('nav_budget')} />

              <BottomNavItem href="/transactions" icon={<IconList />} label={t('nav_transactions')} />

              <BottomNavItem href="/profile" icon={<IconSettings />} label={t('nav_settings')} />
            </div>
          </div>
        )}

      </body>
   </html>
  );
}
