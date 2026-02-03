"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Home() {
  // Simple header component
  function Header() {
    return (
      <header className="w-full bg-white/80 backdrop-blur sticky top-0 z-30 border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 md:px-10 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 select-none">
            <span className="font-extrabold text-xl text-[#4db8a8] tracking-tight">Balanz<span className="text-[#191919]">.IA</span></span>
          </Link>
          <nav className="hidden md:flex gap-8 text-gray-700 font-medium">
            <Link href="/login" className="hover:text-[#4db8a8] transition-colors">เข้าสู่ระบบ</Link>
            <Link href="/register" className="hover:text-[#4db8a8] transition-colors">สมัครสมาชิก</Link>
          </nav>
        </div>
      </header>
    );
  }
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      window.location.href = '/dashboard';
    }
    setIsLoggedIn(!!token);
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white relative overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center bg-gradient-to-b from-[#f0fdfa] to-white">
       <div className="max-w-6xl mx-auto px-6 md:px-10 py-8 md:py-20 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
                 <div className="md:col-span-6">
                   <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-[#191919] mb-4">
                     ยินดีต้อนรับเข้าสู่{' '}
                     <span className="text-[#4db8a8]">Balanz</span>
                     <span className="text-[#191919]">.IA</span>
                   </h1>
                   
                   <p className="text-[#191919] text-base md:text-lg mb-3">
                     จัดการการเงินของคุณได้อย่างง่ายดายและมีประสิทธิภาพ
                   </p>
                   
                   {!isLoggedIn && (
                     <div className="flex flex-col sm:flex-row flex-wrap gap-3 md:gap-4">
                       {/* ปุ่มเริ่มต้นใช้งาน */}
                       <Link
                         href="/register"
                         className="group relative inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-white bg-gradient-to-r from-[#4db8a8] to-[#3d9888] hover:from-[#3d9888] hover:to-[#2d7868] shadow-lg hover:shadow-2xl active:scale-95 sm:transform sm:hover:-translate-y-0.5 transition-all duration-300 font-bold overflow-hidden text-base sm:text-lg w-full sm:w-auto"
                       >
                         <span className="relative z-10 flex items-center justify-center gap-2">
                           เริ่มต้นใช้งาน
                           <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                           </svg>
                         </span>
                         <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                       </Link>
                       {/* ปุ่ม Login ด้วย LINE */}
                       <a
                         href="http://localhost:5050/auth/line"
                         className="group relative inline-flex items-center justify-center px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-white bg-[#06C755] hover:bg-[#05b94d] shadow-lg hover:shadow-2xl active:scale-95 sm:transform sm:hover:-translate-y-0.5 transition-all duration-300 font-bold overflow-hidden text-base sm:text-lg w-full sm:w-auto"
                         style={{ minWidth: 180 }}
                       >
                         <span className="relative z-10 flex items-center justify-center gap-2">
                           <svg width="24" height="24" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                             <rect width="36" height="36" rx="8" fill="#06C755"/>
                             <path d="M18 8C11.373 8 6 12.477 6 18C6 21.09 7.98 23.82 11.01 25.44C10.79 26.23 10.19 28.27 10.09 28.66C9.97 29.13 10.23 29.21 10.47 29.18C10.7 29.15 13.13 28.81 14.23 28.66C15.23 28.87 16.1 29 18 29C24.627 29 30 24.523 30 19C30 13.477 24.627 8 18 8Z" fill="white"/>
                             <path d="M13.5 17.5H15V22H13.5V17.5ZM16.5 17.5H18V22H16.5V17.5ZM19.5 17.5H21V22H19.5V17.5Z" fill="#06C755"/>
                           </svg>
                           Login ด้วย LINE
                         </span>
                       </a>
                     </div>
                   )}
                 </div>
       
                 {/* Hero Illustration - Hide on small mobile */}
                 <div className="hidden sm:flex justify-center md:col-span-6 mt-8 md:mt-0">
                   <img
                     src="/Home.png"
                     alt="Balanz.IA infographic"
                     className="w-[300px] sm:w-[380px] md:w-[420px] lg:w-[520px] h-auto select-none drop-shadow-2xl animate-float"
                     draggable="false"
                   />
                 </div>
               </div>
      </section>

      {/* Features Section */}
      <section className="relative bg-white">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          
          {/* Feature 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-32">
            <div className="order-2 md:order-1">
              <h2 className="text-3xl md:text-5xl font-black mb-6 text-gray-900">
                บันทึกรายรับรายจ่าย<br />ด้วยข้อความง่ายๆ
              </h2>
              <p className="text-gray-600 text-lg md:text-xl leading-relaxed">
                เพียงกรอกข้อมูลรายรับรายจ่ายของคุณ<br />
                ระบบจะจัดหมวดหมู่และบันทึกให้คุณโดยอัตโนมัติ
              </p>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <div className="w-full max-w-sm bg-gradient-to-br from-[#f0fdfa] to-white p-8 rounded-3xl shadow-xl">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-[#4db8a8] flex items-center justify-center text-white font-bold text-xl">B</div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-500">9:41</div>
                    </div>
                  </div>
                  <div className="bg-[#e8f5e9] rounded-2xl rounded-tl-none p-4 mb-4">
                    <p className="text-gray-800">อาหารเที่ยง 120 บาท</p>
                  </div>
                  <div className="bg-[#f0fdfa] rounded-2xl rounded-tr-none p-4">
                    <p className="text-gray-800 font-medium mb-2">บันทึกค่าอาหารเที่ยง ✓</p>
                    <p className="text-gray-600 text-sm">จำนวน: <span className="font-semibold">120 บาท</span></p>
                    <p className="text-gray-600 text-sm">หมวดหมู่: <span className="font-semibold text-[#4db8a8]">อาหาร</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-32">
            <div className="flex justify-center">
              <div className="w-full max-w-sm bg-gradient-to-br from-[#f0fdfa] to-white p-8 rounded-3xl shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800">อาหาร</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800">รถยนต์</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow hover:shadow-lg transition-shadow cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-gray-800">บ้าน</span>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-white rounded-xl shadow hover:shadow-lg transition-shadow cursor-pointer border-2 border-dashed border-[#4db8a8]">
                    <div className="w-10 h-10 rounded-lg bg-[#4db8a8]/10 flex items-center justify-center">
                      <svg className="w-6 h-6 text-[#4db8a8]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                      </svg>
                    </div>
                    <span className="font-semibold text-[#4db8a8]">เพิ่มหมวดหมู่</span>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-3xl md:text-5xl font-black mb-6 text-gray-900">
                ปรับแต่งหมวดหมู่<br />ได้ตามต้องการ
              </h2>
              <p className="text-gray-600 text-lg md:text-xl leading-relaxed">
                สร้างและจัดการหมวดหมู่ค่าใช้จ่ายที่เข้ากับไลฟ์สไตล์<br />
                และพฤติกรรมการใช้จ่ายของคุณ
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid md:grid-cols-2 mb-30 gap-12 items-center">
            <div className="order-2 md:order-1">
              <h2 className="text-3xl md:text-5xl font-black mb-6 text-gray-900">
                ตั้งค่าและติดตาม<br />งบประมาณ
              </h2>
              <p className="text-gray-600 text-lg md:text-xl leading-relaxed">
                กำหนดงบประมาณรายเดือนสำหรับแต่ละหมวดหมู่<br />
                และติดตามความคืบหน้าการใช้จ่ายแบบเรียลไทม์
              </p>
            </div>
            <div className="order-1 md:order-2 flex justify-center">
              <div className="w-full max-w-sm bg-gradient-to-br from-[#f0fdfa] to-white p-8 rounded-3xl shadow-xl">
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8.1 13.34l2.83-2.83L3.91 3.5c-1.56 1.56-1.56 4.09 0 5.66l4.19 4.18zm6.78-1.81c1.53.71 3.68.21 5.27-1.38 1.91-1.91 2.28-4.65.81-6.12-1.46-1.46-4.2-1.1-6.12.81-1.59 1.59-2.09 3.74-1.38 5.27L3.7 19.87l1.41 1.41L12 14.41l6.88 6.88 1.41-1.41L13.41 13l1.47-1.47z"/>
                        </svg>
                        <span className="text-gray-700 font-semibold">อาหาร</span>
                      </div>
                      <span className="text-sm text-gray-500">3,200 / 5,000 บาท</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-[#4db8a8] h-3 rounded-full" style={{width: '64%'}}></div>
                    </div>
                  </div>
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                        </svg>
                        <span className="text-gray-700 font-semibold">รถยนต์</span>
                      </div>
                      <span className="text-sm text-gray-500">2,800 / 3,000 บาท</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-yellow-400 h-3 rounded-full" style={{width: '93%'}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
                        </svg>
                        <span className="text-gray-700 font-semibold">บ้าน</span>
                      </div>
                      <span className="text-sm text-gray-500">8,500 / 8,000 บาท</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div className="bg-red-500 h-3 rounded-full" style={{width: '100%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>



      </main>
    </>
  );
}