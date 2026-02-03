"use client";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; // <--- 1. เพิ่ม import นี้
import { 
  Utensils, ShoppingBag, Car, Home, Zap, Heart, 
  Gamepad2, Stethoscope, GraduationCap, Plane, 
  Briefcase, Gift, Smartphone, Coffee, Music, 
  Dumbbell, PawPrint, Scissors, CreditCard, 
  Landmark, MoreHorizontal, Plus, Settings, 
  Trash2, X, ChevronRight, LayoutGrid, Check // เพิ่ม Check เข้ามาด้วย
} from 'lucide-react';

// ... (ส่วน ICON_MAP และ CategoryIcon เหมือนเดิม ไม่ต้องแก้) ...
const ICON_MAP = {
  'food': Utensils, 'drink': Coffee, 'restaurant': Utensils,
  'shopping': ShoppingBag, 'gift': Gift, 'clothes': Scissors,
  'transport': Car, 'fuel': Zap, 'plane': Plane,
  'home': Home, 'bills': Zap, 'pet': PawPrint,
  'game': Gamepad2, 'music': Music, 'health': Stethoscope, 'sport': Dumbbell,
  'money': Landmark, 'salary': CreditCard, 'work': Briefcase,
  'education': GraduationCap, 'tech': Smartphone,
  'other': MoreHorizontal, 'love': Heart
};

const CategoryIcon = ({ iconName, className = "w-6 h-6" }) => {
  const IconComp = ICON_MAP[iconName];
  if (IconComp) return <IconComp className={className} />;
  return <span className="text-xl leading-none">{iconName || '?'}</span>;
};

export default function CategoryPopup({ 
  categories, 
  formData, 
  selectCategory, 
  deleteCategory, 
  setShowAddCategoryModal 
}) {
  const [showPopup, setShowPopup] = useState(false);
  const [isManaging, setIsManaging] = useState(false);
  const [mounted, setMounted] = useState(false); // <--- 2. เพิ่ม state เช็คว่าโหลดหน้าเสร็จยัง

  useEffect(() => {
    setMounted(true); // <--- 3. set mounted เป็น true เมื่อโหลดเสร็จ (แก้ error hydration)
    return () => setMounted(false);
  }, []);

  const displayCategories = categories; 
  const selectedCategory = categories.find(cat => cat._id === formData.category);

    const getCategoryColor = () => {
      return 'text-slate-600 bg-slate-100 border-slate-200';
  };

  const toggleManaging = (e) => {
    e.stopPropagation();
    setIsManaging(prev => !prev);
  }

  // --- 4. แยกส่วน Modal Content ออกมาเป็นตัวแปร เพื่อความสะอาด ---
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ fontFamily: 'sans-serif' }}>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => { setShowPopup(false); setIsManaging(false); }}
      />

      {/* Modal Content */}
      <div className="relative bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-white/50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-[#299D91] to-[#238A80] rounded-xl shadow-lg shadow-[#299D91]/20">
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">หมวดหมู่ทั้งหมด</h2>
                <p className="text-xs text-gray-500">เลือกรายการที่ต้องการ</p>
              </div>
            </div>

            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => {
                        setShowPopup(false);
                        setShowAddCategoryModal(true);
                    }}
                    className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all border border-blue-100"
                >
                    <Plus className="w-5 h-5" />
                </button>
                <button
                    type="button"
                    onClick={toggleManaging}
                    className={`p-2.5 rounded-xl transition-all border ${
                        isManaging 
                          ? 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100' 
                          : 'bg-gray-50 text-gray-600 border-gray-100 hover:bg-gray-100'
                    }`}
                >
                    {isManaging ? <Check className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                </button>
                <button
                    onClick={() => { setShowPopup(false); setIsManaging(false); }}
                    className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-gray-600 transition-all border border-gray-100"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Grid Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-50/30">
          {displayCategories.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
              {displayCategories.map((cat) => {
                const isSelected = formData.category === cat._id;
                  const colorClass = getCategoryColor();

                return (
                  <div
                    key={cat._id}
                    onClick={() => {
                        if (!isManaging) {
                            selectCategory(cat._id);
                            setShowPopup(false);
                        }
                    }}
                    className={`
                        relative group cursor-pointer
                        flex flex-col items-center justify-center p-4 h-28
                        rounded-2xl border-2 transition-all duration-200
                        ${isManaging ? 'animate-pulse border-dashed border-red-300 bg-red-50/30' : ''}
                        ${isSelected && !isManaging
                            ? 'bg-white border-[#299D91] shadow-lg shadow-[#299D91]/10 scale-105 ring-1 ring-[#299D91]' 
                            : 'bg-white border-transparent hover:border-gray-200 hover:shadow-md'
                        }
                    `}
                  >
                    <div className={`p-3 rounded-xl mb-2 transition-all ${
                        isSelected && !isManaging 
                            ? 'bg-[#299D91] text-white shadow-md' 
                            : `${colorClass} bg-opacity-50` 
                    }`}>
                      <CategoryIcon iconName={cat.icon} className="w-6 h-6" />
                    </div>
                    
                    <span className={`text-xs font-bold text-center truncate w-full px-1 ${
                        isSelected ? 'text-[#299D91]' : 'text-gray-600'
                    }`}>
                        {cat.name}
                    </span>

                    {isManaging && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCategory(cat._id);
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full hover:bg-red-600 shadow-md hover:scale-110 transition-all z-10"
                        >
                            <Trash2 className="w-3 h-3" />
                        </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
               <div className="bg-gray-100 p-4 rounded-full mb-3">
                 <LayoutGrid className="w-8 h-8 opacity-50" />
               </div>
               <p>ยังไม่มีหมวดหมู่</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setShowPopup(true)}
        className="w-full p-4 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-[#299D91] hover:shadow-md transition-all flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${selectedCategory ? 'bg-[#299D91]/10' : 'bg-slate-100'}`}>
            {selectedCategory ? (
              <CategoryIcon iconName={selectedCategory.icon} className="w-6 h-6 text-[#299D91]" />
            ) : (
              <LayoutGrid className="w-6 h-6 text-slate-400" />
            )}
          </div>
          <div className="text-left">
            <span className={`block font-bold text-base ${selectedCategory ? 'text-slate-800' : 'text-slate-400'}`}>
              {selectedCategory ? selectedCategory.name : 'เลือกหมวดหมู่'}
            </span>
            {/* ไม่แสดงรายรับ/รายจ่าย */}
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#299D91] transition-colors" />
      </button>

      {/* --- 5. ใช้ createPortal ยิง Modal ไปที่ document.body --- */}
      {mounted && showPopup && createPortal(modalContent, document.body)}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </>
  );
}