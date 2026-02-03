"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function ResetPassword() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token") || "", [searchParams]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("ไม่พบโทเค็นรีเซ็ตรหัสผ่านจากลิงก์อีเมล");
      return;
    }
    if (newPassword.length < 6) {
      setError("รหัสผ่านใหม่อย่างน้อย 6 ตัวอักษร");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("รหัสผ่านใหม่ไม่ตรงกัน");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5050/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const raw = await res.text();
      let data; try { data = JSON.parse(raw); } catch { data = { message: raw }; }
      if (!res.ok) throw new Error(data?.message || `ตั้งรหัสผ่านใหม่ไม่สำเร็จ (${res.status})`);
      setSuccess("ตั้งรหัสผ่านใหม่สำเร็จ คุณสามารถเข้าสู่ระบบได้แล้ว");
      setTimeout(() => (window.location.href = "/login"), 1200);
    } catch (err) {
      setError(err.message || "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Error/Success Alerts */}
        {error && (
          <div className="mb-6 animate-fade-in">
            <div className="bg-red-500/10 border border-red-500/50 backdrop-blur-xl p-4 rounded-2xl flex items-start space-x-3 shadow-2xl shadow-red-500/20">
              <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 animate-fade-in">
            <div className="bg-green-500/10 border border-green-500/50 backdrop-blur-xl p-4 rounded-2xl flex items-start space-x-3 shadow-2xl shadow-green-500/20">
              <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
              <div className="flex-1">
                <p className="text-sm font-medium text-green-300">{success}</p>
              </div>
            </div>
          </div>
        )}

        {/* Reset Password Card */}
        <div className="bg-slate-800/50 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-700/50 p-8 space-y-8">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-primary/80 shadow-2xl shadow-primary/50 mb-4">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">
              ตั้งรหัสผ่านใหม่
            </h1>
            <p className="text-slate-400 text-base font-medium">
              Reset Password
            </p>
          </div>

          {!token && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 backdrop-blur-xl p-4 rounded-2xl">
              <p className="text-sm font-medium text-yellow-300">ลิงก์นี้ไม่ถูกต้องหรือหมดอายุ</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300">รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-6 h-6 text-slate-500 group-focus-within:text-primary transition-colors" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="รหัสผ่านใหม่"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full pl-14 pr-14 py-4 rounded-2xl border-2 border-slate-700 bg-slate-900/50 backdrop-blur-sm text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478l-.04-.04zM2 10a7.996 7.996 0 013.716-6.747l1.504 1.504A5.972 5.972 0 0110 5c2.761 0 5 2.239 5 5 0 1.104-.306 2.133-.83 3.012l1.505 1.505C17.136 12.375 18 11.276 18 10c0-4.418-3.582-8-8-8a7.98 7.98 0 00-5.657 2.28L2.293 2.293z" clipRule="evenodd"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-300">ยืนยันรหัสผ่านใหม่</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-6 h-6 text-slate-500 group-focus-within:text-primary transition-colors" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd"/>
                  </svg>
                </div>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="ยืนยันรหัสผ่านอีกครั้ง"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="w-full pl-14 pr-14 py-4 rounded-2xl border-2 border-slate-700 bg-slate-900/50 backdrop-blur-sm text-white placeholder:text-slate-500 focus:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/20 transition-all duration-300 outline-none font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirmPassword ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478l-.04-.04zM2 10a7.996 7.996 0 013.716-6.747l1.504 1.504A5.972 5.972 0 0110 5c2.761 0 5 2.239 5 5 0 1.104-.306 2.133-.83 3.012l1.505 1.505C17.136 12.375 18 11.276 18 10c0-4.418-3.582-8-8-8a7.98 7.98 0 00-5.657 2.28L2.293 2.293z" clipRule="evenodd"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading || !token}
              className="w-full bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary hover:to-primary text-white py-5 rounded-2xl font-black text-lg transition-all duration-300 shadow-2xl shadow-primary/50 hover:shadow-3xl hover:shadow-primary/50 disabled:opacity-70 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center space-x-3">
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>กำลังบันทึก...</span>
                </span>
              ) : (
                'บันทึกรหัสผ่านใหม่'
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-slate-400 text-base font-medium">
              มีบัญชีอยู่แล้ว?{' '}
              <Link href="/login" className="font-black text-primary hover:text-primary/80 transition-colors">
                เข้าสู่ระบบ
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8 font-medium">
          © 2025 <span className="text-primary font-black">Balanz.IA</span>. สงวนลิขสิทธิ์
        </p>
      </div>
    </div>
  );
}