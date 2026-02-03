// "use client"; // Not necessary here, but good practice if it uses client-side hooks
import { useState } from "react";

export default function CategoryPopup({ categories, formData, selectCategory, deleteCategory, setShowAddCategoryModal }) {
  const [showPopup, setShowPopup] = useState(false);

  // Filter categories to only show the ones matching the current type (income/expense)
  const filteredCategories = categories.filter(cat => cat.type === formData.type);

  // Determine the name of the currently selected category for display
  const selectedCategory = categories.find(cat => cat._id === formData.category);

  return (
    <div>
      <div className="flex items-center space-x-2">
        {/* Button to open the Category Selection Modal */}
        <button
          type="button"
          onClick={() => setShowPopup(true)}
          className="flex-1 p-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors mt-1"
        >
          {selectedCategory ? `เลือกหมวดหมู่ (${selectedCategory.icon} ${selectedCategory.name})` : 'เลือกหมวดหมู่'}
        </button>

        {/* Button to open the Add New Category Modal directly */}
        <button
            type="button"
            onClick={() => setShowAddCategoryModal(true)}
            className="mt-1 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xl font-medium"
            title="เพิ่มหมวดหมู่ใหม่"
        >
            +
        </button>
      </div>

      {/* Display warning if no category is selected for the current type */}
      {!formData.category || !selectedCategory ? (
          <p className="mt-2 text-sm text-red-500">
              ⚠️ โปรดเลือกหมวดหมู่สำหรับประเภท**{formData.type === 'income' ? 'รายรับ' : 'รายจ่าย'}**
          </p>
      ) : (
          <p className="mt-2 text-sm text-gray-600">
              หมวดหมู่ปัจจุบัน: **{selectedCategory.icon} {selectedCategory.name}**
          </p>
      )}


      {/* Category Selection Popup/Modal */}
      {showPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6 h-[80vh] flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              เลือกหมวดหมู่ ({formData.type === 'income' ? 'รายรับ' : 'รายจ่าย'})
            </h2>

            {/* Grid for Categories (Scrollable) */}
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto pb-4 flex-grow">
              {filteredCategories.length > 0 ? (
                filteredCategories.map((cat) => (
                  <div
                    key={cat._id}
                    className={`bg-white border rounded-xl p-3 flex-shrink-0 transition-all duration-200 shadow-sm ${
                      formData.category === cat._id ? "border-green-600 bg-green-50 ring-2 ring-green-500" : "border-gray-200 hover:shadow-lg"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        selectCategory(cat._id);
                        setShowPopup(false); // Close after selection
                      }}
                      className="w-full text-center text-gray-800 font-medium flex flex-col items-center space-y-2"
                    >
                      <span className="text-4xl">{cat.icon}</span>
                      <span className="text-xs font-semibold truncate mt-1">{cat.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent closing the popup on delete click
                        deleteCategory(cat._id);
                      }}
                      className="mt-2 w-full bg-red-100 text-red-600 p-1 rounded-md hover:bg-red-200 transition-colors text-xs font-medium"
                    >
                      ลบ
                    </button>
                  </div>
                ))
              ) : (
                <p className="col-span-5 text-center text-gray-500 mt-5">
                    ไม่พบหมวดหมู่สำหรับประเภทนี้ โปรดเพิ่มใหม่
                </p>
              )}
            </div>

            {/* Footer buttons */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowPopup(false)}
                className="px-6 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition-colors font-medium text-gray-800"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}