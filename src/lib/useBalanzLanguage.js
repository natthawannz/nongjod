"use client";

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'balanz_lang';

export const readBalanzLanguage = (fallback = 'th') => {
  const fb = fallback === 'en' ? 'en' : 'th';
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' ? 'en' : 'th';
  } catch {
    return fb;
  }
};

export const useBalanzLanguage = (fallback = 'th') => {
  const fb = fallback === 'en' ? 'en' : 'th';
  const [language, setLanguage] = useState(fb);

  useEffect(() => {
    const read = () => setLanguage(readBalanzLanguage(fb));

    read();
    const onCustom = () => read();
    const onStorage = (e) => {
      if (e && e.key && e.key !== STORAGE_KEY) return;
      read();
    };

    window.addEventListener('balanz_lang_change', onCustom);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('balanz_lang_change', onCustom);
      window.removeEventListener('storage', onStorage);
    };
  }, [fb]);

  return language;
};

