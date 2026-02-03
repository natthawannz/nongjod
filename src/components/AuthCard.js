"use client";
import React from "react";

export default function AuthCard({ children, leftTitle = "Balanz.IA", leftSubtitle = "Hello Welcome!" }) {
  return (
    <div className="bg-[#2d2d2d]">
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-full max-w-4xl">
          <div className="bg-white rounded-3xl shadow-2xl overflow-visible">
            <div className="flex flex-col lg:flex-row">
              <div className="bg-[#4db8a8] p-12 flex flex-col justify-center text-white lg:w-1/2">
                <div className="space-y-6">
                  <h2 className="text-5xl font-bold leading-tight">{leftTitle}</h2>
                  <h3 className="text-4xl font-bold">{leftSubtitle}</h3>
                </div>
              </div>

              <div className="p-12 flex flex-col justify-center lg:w-1/2 relative">
                <div className="absolute -top-8 left-1/2 -translate-x-1/2">
                  <div className="w-16 h-16 bg-[#4db8a8] rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <div className="max-w-md mx-auto w-full mt-8">
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

