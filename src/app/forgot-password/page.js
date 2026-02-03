"use client";
import { useState } from "react";
import Link from "next/link";

// Component Wrapper (เหมือนหน้า Login)
const AuthCard = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 sm:p-6">
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100 relative">
      {/* ปุ่มย้อนกลับ */}
      <Link 
        href="/login" 
        className="absolute top-6 left-6 p-2 text-gray-400 hover:text-[#4db8a8] hover:bg-gray-50 rounded-full transition-all duration-200 group"
        aria-label="กลับหน้าเข้าสู่ระบบ"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </Link>

      <div className="text-center mb-10">
        {/* Logo/Icon Area */}
        <div className="w-16 h-16 mx-auto bg-[#4db8a8] rounded-full flex items-center justify-center mb-4 shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 className="text-3xl font-extrabold text-[#4db8a8] tracking-tight">ลืมรหัสผ่าน</h2>
        <p className="mt-2 text-sm text-gray-500">
          กรอกอีเมลของคุณเพื่อรับลิงก์รีเซ็ตรหัสผ่าน
        </p>
      </div>
      {children}
    </div>
  </div>
);

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setSuccess(data.message || "ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว");
        setEmail(""); // Clear email field
      } else {
        setError(data.message || "ไม่สามารถส่งลิงก์รีเซ็ตรหัสผ่านได้");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      setError("เกิดข้อผิดพลาด: " + (error?.message || "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-4 rounded-xl mb-6 flex items-start text-sm">
          <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
          </svg>
          <div>
            <p className="font-semibold mb-1">สำเร็จ!</p>
            <p>{success}</p>
          </div>
        </div>
      )}

      {/* Error Alert */}
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
              <span>กำลังส่ง...</span>
            </span>
          ) : (
            "ส่งลิงก์รีเซ็ตรหัสผ่าน"
          )}
        </button>
      </form>

      {/* Back to Login Link */}
      <div className="text-center mt-6">
        <p className="text-gray-600 text-sm">
          นึกรหัสผ่านได้แล้ว?
          <Link 
            href="/login" 
            className="text-[#4db8a8] hover:text-[#3d9888] font-semibold ml-1 transition-colors"
          >
            กลับไปเข้าสู่ระบบ
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}