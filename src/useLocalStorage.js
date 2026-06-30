import { useState } from "react";

// 값이 바뀔 때마다 localStorage 에 저장하는 useState
export function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });
  const set = (v) => setVal((p) => {
    const next = typeof v === "function" ? v(p) : v;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* 저장 실패 무시 */ }
    return next;
  });
  return [val, set];
}
