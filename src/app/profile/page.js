"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Camera, User, Mail, Save, Key, LogOut, ChevronLeft, Trash2, UploadCloud } from 'lucide-react';

export default function Profile() {
  const [user, setUser] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputId = 'avatar-file-input';

  // --- Logic เดิม (Fetch, Upload, Update) ---
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('กรุณาเข้าสู่ระบบเพื่อดูโปรไฟล์');
          setLoading(false);
          return;
        }

        const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setUser({ name: data.name, email: data.email });
          if (data.profilePic) {
            setAvatarUrl(data.profilePic);
            try { localStorage.setItem('avatarUrl', data.profilePic); } catch {}
          } else if (data.avatarUrl) {
            setAvatarUrl(data.avatarUrl);
            try { localStorage.setItem('avatarUrl', data.avatarUrl); } catch {}
          } else {
            const localAvatar = localStorage.getItem('avatarUrl');
            if (localAvatar) setAvatarUrl(localAvatar);
          }
        } else {
          setError(data.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์');
        }
        setLoading(false);
      } catch (error) {
        setError('ไม่สามารถโหลดข้อมูลโปรไฟล์');
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: user.name }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ name: data.name, email: data.email });
        try { localStorage.setItem('name', data.name); } catch {}
        setSuccess('บันทึกข้อมูลสำเร็จ');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'ไม่สามารถบันทึกข้อมูล');
      }
    } catch (error) {
      setError('ไม่สามารถบันทึกข้อมูล');
    }
  };

  const onPickFile = () => {
    const el = document.getElementById(fileInputId);
    if (el) el.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      setError('ไฟล์ใหญ่เกินไป (สูงสุด 5MB)');
      return;
    }
    
    try {
      setUploading(true);
      setError('');
      
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') setAvatarUrl(reader.result);
      };
      reader.readAsDataURL(file);

      const token = localStorage.getItem('token');
      const fd = new FormData();
      fd.append('avatar', file);
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
      const res = await fetch(`${API_BASE}/api/auth/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const raw = await res.text();
      let data; 
      try { data = JSON.parse(raw); } catch { data = { message: raw }; }
      
      if (res.ok && data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
        try { localStorage.setItem('avatarUrl', data.avatarUrl); } catch {}
        setSuccess('อัปโหลดรูปภาพสำเร็จ');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        try { localStorage.setItem('avatarUrl', avatarUrl); } catch {}
      }
    } catch (err) {
      console.error('Upload avatar failed', err);
      setError('ไม่สามารถอัปโหลดรูปภาพ');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!confirm('คุณต้องการลบรูปโปรไฟล์ใช่หรือไม่?')) return;
    
    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5050';
      await fetch(`${API_BASE}/api/auth/avatar`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
      
      setSuccess('ลบรูปโปรไฟล์สำเร็จ');
      setTimeout(() => setSuccess(''), 3000);
    } finally {
      setUploading(false);
      setAvatarUrl('');
      try { localStorage.removeItem('avatarUrl'); } catch {}
    }
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('avatarUrl');
      localStorage.removeItem('name');
    } catch {}
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 font-medium">กำลังโหลดข้อมูล...</p>
        </div>
      </div>
    );
  }

  const displayEmail = user.email && user.email.endsWith('@line.local')
    ? `LINE ID: ${user.email.replace('@line.local', '')}`
    : user.email;

  return (
    <div className="min-h-screen bg-gray-50/50 py-6 px-4 md:py-10">
      
      {/* Navigation Back */}
      <div className="max-w-2xl mx-auto mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-gray-500 hover:text-teal-600 transition-colors font-medium text-sm">
          <ChevronLeft className="w-4 h-4 mr-1" />
          กลับสู่หน้าหลัก
        </Link>
      </div>

      <div className="max-w-2xl mx-auto bg-white rounded-3xl shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
        
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-r from-teal-400 to-teal-600 relative">
           {/* Decorative circles */}
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
           <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-8 -mb-8 blur-xl"></div>
        </div>

        {/* Profile Avatar Container */}
        <div className="relative px-8 -mt-16 text-center">
          <div className="inline-block relative group">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white overflow-hidden mx-auto relative z-10">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                  <User className="w-16 h-16" />
                </div>
              )}
              
              {/* Overlay on Hover */}
              <div 
                onClick={onPickFile}
                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white"
              >
                <Camera className="w-8 h-8 mb-1" />
                <span className="text-xs font-medium">เปลี่ยนรูป</span>
              </div>
            </div>

            {/* Quick Edit Button (Mobile Friendly) */}
            <button 
              onClick={onPickFile}
              className="absolute bottom-1 right-1 z-20 bg-white text-teal-600 p-2 rounded-full shadow-md border border-gray-100 hover:bg-gray-50 md:hidden"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input id={fileInputId} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>

          <h1 className="mt-4 text-2xl font-bold text-gray-800">{user.name || 'ผู้ใช้งาน'}</h1>
          <p className="text-gray-500 text-sm">{displayEmail}</p>

         
        </div>

        {/* Form Content */}
        <div className="p-8">
          
          {/* Alerts */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl flex items-center gap-3 border border-emerald-100 animate-in slide-in-from-top-2">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Save className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">สำเร็จ!</p>
                <p className="text-xs">{success}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-3 border border-red-100 animate-in slide-in-from-top-2">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="font-bold">!</span>
              </div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Input Groups */}
            <div className="grid gap-6">
              {/* Name Field */}
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4 text-teal-500" /> ชื่อของคุณ
                </label>
                <input
                  id="name"
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/50 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 outline-none transition-all duration-200"
                  placeholder="ระบุชื่อของคุณ"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" /> อีเมล / บัญชีผู้ใช้
                </label>
                <input
                  id="email"
                  type="text"
                  value={displayEmail}
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row gap-4">
              <button
                type="submit"
                className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" /> บันทึกข้อมูล
              </button>
              
              <Link
                href="/change-password"
                className="flex-1 bg-white border-2 border-gray-200 hover:border-teal-500 hover:text-teal-600 text-gray-700 font-semibold py-3.5 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Key className="w-5 h-5" /> เปลี่ยนรหัสผ่าน
              </Link>
            </div>
          </form>
        </div>

        {/* Footer / Logout */}
        <div className="bg-gray-50 p-6 text-center border-t border-gray-100">
           <button
             onClick={handleLogout}
             className="text-red-500 hover:text-red-700 font-medium text-sm inline-flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
           >
             <LogOut className="w-4 h-4" /> ออกจากระบบ
           </button>
        </div>

      </div>
      
      {/* Footer Credit (Optional) */}
      <p className="text-center text-gray-400 text-xs mt-8">
        © 2025 Financial Planner. All rights reserved.
      </p>
    </div>
  );
}