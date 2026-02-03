"use client";
import { useState } from 'react';
import Link from 'next/link';

// Component Wrapper (Stand-in for AuthCard with Teal Theme)
const AuthCard = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100 relative">
      {/* ปุ่มย้อนกลับ */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 p-2 text-gray-400 hover:text-[#4db8a8] hover:bg-gray-50 rounded-full transition-all duration-200 group"
        aria-label="กลับหน้าแรก"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </Link>

      <div className="text-center mb-10">
        {/* Logo/Icon Area */}
        <div className="w-16 h-16 mx-auto bg-[#4db8a8] rounded-full flex items-center justify-center mb-4 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
             <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.98 5.98 0 0010 16a5.98 5.98 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-[#4db8a8] tracking-tight">เข้าสู่ระบบ</h2>
        <p className="mt-2 text-sm text-gray-500">
          ยินดีต้อนรับกลับ
        </p>
      </div>
      {children}
    </div>
  </div>
);

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = { message: raw }; }

      if (res.ok) {
        // หา token จากหลายรูปแบบ
        const token = (
          data?.token ||
          data?.accessToken ||
          data?.access_token ||
          data?.jwt ||
          data?.data?.token ||
          data?.user?.token
        );

        if (!token) {
          throw new Error('ไม่พบโทเค็นจากเซิร์ฟเวอร์');
        }

        localStorage.setItem('token', token);
        const nameFromApi = data?.name || data?.user?.name || data?.user?.displayName;
        const emailFromApi = data?.email || data?.user?.email;

        if (nameFromApi) try { localStorage.setItem('name', nameFromApi); } catch (err) {}
        if (emailFromApi) try { localStorage.setItem('email', emailFromApi); } catch (err) {}
        
        window.location.href = '/dashboard';
      } else {
        const msgFromServer = data?.message;
        const msg = res.status >= 500
          ? `เซิร์ฟเวอร์ขัดข้อง (${res.status})`
          : (msgFromServer || `เข้าสู่ระบบไม่สำเร็จ (${res.status})`);
        setError(msg);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('เข้าสู่ระบบไม่สำเร็จ: ' + (error?.message || 'ไม่ทราบสาเหตุ'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      {/* Error Alert Style (Simple Red) */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-6 flex items-center text-sm">
          <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
          </svg>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email Input */}
        <div className="border-2 border-[#4db8a8] rounded-xl p-4 transition-colors focus-within:border-[#3d9888]/80">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
            </svg>
            <input
              type="email"
              placeholder="อีเมล"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-white"
            />
          </div>
        </div>

        {/* Password Input */}
        <div className="border-2 border-[#4db8a8] rounded-xl p-4 focus-within:border-[#3d9888]/80">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-gray-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
            </svg>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="รหัสผ่าน"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-white"
            />
            {/* Show Password Button */}
            <button
               type="button"
               onClick={() => setShowPassword(!showPassword)}
               className="p-1 text-gray-500 hover:text-[#4db8a8] transition-colors"
             >
                {showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478l-.04-.04zM2 10a7.996 7.996 0 013.716-6.747l1.504 1.504A5.972 5.972 0 0110 5c2.761 0 5 2.239 5 5 0 1.104-.306 2.133-.83 3.012l1.505 1.505C17.136 12.375 18 11.276 18 10c0-4.418-3.582-8-8-8a7.98 7.98 0 00-5.657 2.28L2.293 2.293z" clipRule="evenodd"/></svg>
                )}
            </button>
          </div>
        </div>
                <div className="mt-3 text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-[#4db8a8] hover:text-[#3d9888] transition-colors"
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>
        {/* Submit Button */}
        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-[#4db8a8] hover:bg-[#3d9888] text-white py-4 rounded-xl font-semibold transition-all duration-200 shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-3">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>กำลังเข้าสู่ระบบ...</span>
            </span>
          ) : (
            'เข้าสู่ระบบ'
          )}
        </button>
      </form>

      <div className="text-center mt-6">
        <p className="text-gray-600 text-sm">
          ยังไม่มีบัญชีใช่ไหม?
          <Link href="/register" className="text-[#4db8a8] hover:text-[#3d9888] font-semibold ml-1 transition-colors">สมัครสมาชิก</Link>
        </p>
      </div>
    </AuthCard>
  );
}