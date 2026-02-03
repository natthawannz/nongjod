"use client";
import { useState } from "react";
import Link from "next/link";

// AuthCard Component with Back Button
const AuthCard = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100 relative">
      {/* ปุ่มย้อนกลับ */}
      <Link 
        href="/login" 
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
            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z"/>
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-[#4db8a8] tracking-tight">สมัครสมาชิก</h2>
        <p className="mt-2 text-sm text-gray-500">
          เริ่มต้นสร้างบัญชีใหม่
        </p>
      </div>
      {children}
    </div>
  </div>
);

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      
      const raw = await res.text();
      let data;
      try { data = JSON.parse(raw); } catch { data = { message: raw }; }
      
      if (!res.ok) {
        const msgFromServer = data?.message;
        const msg = res.status >= 500
          ? `เซิร์ฟเวอร์ขัดข้อง (${res.status})`
          : (msgFromServer || `สมัครสมาชิกไม่สำเร็จ (${res.status})`);
        throw new Error(msg);
      }
      
      // การสมัครสมาชิกสำเร็จ
      try { localStorage.setItem('name', name); localStorage.setItem('email', email); } catch {}
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาดในการสมัครสมาชิก");
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
        {/* Name Input */}
        <div className="border-2 border-[#4db8a8] rounded-xl p-4 transition-colors focus-within:border-[#3d9888]/80">
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
            </svg>
            <input
              type="text"
              placeholder="ชื่อของคุณ"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
              className="flex-1 outline-none text-gray-700 placeholder-gray-400 bg-white"
            />
          </div>
        </div>

        {/* Email Input */}
        <div className="border-2 border-[#4db8a8] rounded-xl p-4 focus-within:border-[#3d9888]/80">
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
              placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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
              <span>กำลังสมัครสมาชิก...</span>
            </span>
          ) : (
            'สมัครสมาชิก'
          )}
        </button>
      </form>

      <div className="text-center mt-6">
        <p className="text-gray-600 text-sm">
          มีบัญชีอยู่แล้ว?
          <Link href="/login" className="text-[#4db8a8] hover:text-[#3d9888] font-semibold ml-1 transition-colors">เข้าสู่ระบบ</Link>
        </p>
      </div>
    </AuthCard>
  );
}