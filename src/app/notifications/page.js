"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
    } else {
      fetchNotifications(token);
    }
  }, []);

  const fetchNotifications = async (token) => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:5050/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        localStorage.setItem('notificationCount', '0');
      } else {
        const data = await res.json();
        setError('ไม่สามารถดึงข้อมูลแจ้งเตือนได้: ' + (data.message || res.statusText));
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // ฟังก์ชันแยกข้อมูลจาก alertMessage
  const parseNotification = (alertMessage) => {
    const match = alertMessage.match(/(.+): หมวด (.+) เหลือ (\d+\.?\d*) บาท/);
    if (match) {
      const [, month, categoryName, amountLeft] = match;
      return { amountLeft: parseFloat(amountLeft) };
    }
    return { amountLeft: 0 };
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="text-slate-600 font-medium">กำลังโหลด...</span>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">เกิดข้อผิดพลาด</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors"
            >
              กลับหน้าหลัก
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 bg-gradient-to-b from-primary to-primary-dark rounded-full"></div>
            <h1 className="text-3xl font-bold text-slate-800">การแจ้งเตือน</h1>
          </div>
        </div>

        {/* Notifications Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">ไม่มีแจ้งเตือน</h3>
              <p className="text-slate-500">คุณไม่มีแจ้งเตือนในขณะนี้</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification, index) => {
                const { amountLeft } = parseNotification(notification.alertMessage);
                const amountSpent = parseFloat(notification.amountSpent || 0);
                const budgetTotal = parseFloat(notification.budgetTotal || 0);
                const percentage = budgetTotal > 0 ? (amountSpent / budgetTotal) * 100 : 0;

                return (
                  <div key={index} className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl p-6 border border-slate-200/50 hover:shadow-md transition-all duration-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${amountLeft < 50 ? 'bg-red-500' : 'bg-primary'}`}></div>
                        <h3 className="text-lg font-semibold text-slate-800">
                          {notification.month}: หมวด {notification.categoryName}
                        </h3>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        amountLeft < 50 
                          ? 'bg-red-100 text-red-700' 
                          : amountLeft < 100 
                            ? 'bg-yellow-100 text-yellow-700' 
                            : 'bg-green-100 text-green-700'
                      }`}>
                        {amountLeft < 50 ? 'เตือน' : amountLeft < 100 ? 'ระวัง' : 'ปกติ'}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-slate-600 mb-2">
                        <span>ความคืบหน้า</span>
                        <span>{percentage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            percentage > 90 ? 'bg-red-500' : 
                            percentage > 70 ? 'bg-yellow-500' : 'bg-primary'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/60 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-slate-800">{amountLeft.toFixed(0)}</div>
                        <div className="text-sm text-slate-500">บาทที่เหลือ</div>
                      </div>
                      <div className="bg-white/60 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-slate-800">{amountSpent.toFixed(0)}</div>
                        <div className="text-sm text-slate-500">บาทที่ใช้ไป</div>
                      </div>
                      <div className="bg-white/60 rounded-xl p-4 text-center">
                        <div className="text-2xl font-bold text-slate-800">{budgetTotal.toFixed(0)}</div>
                        <div className="text-sm text-slate-500">งบทั้งหมด</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

         
        </div>
      </div>
    </main>
  );
}