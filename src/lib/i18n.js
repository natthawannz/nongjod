"use client";

export const formatI18n = (template, vars) => {
  if (!template) return '';
  const text = String(template);
  const data = vars && typeof vars === 'object' ? vars : {};
  return text.replace(/\{(\w+)\}/g, (_, k) => {
    const v = data[k];
    return v === undefined || v === null ? '' : String(v);
  });
};

