// 시간/시각 포맷 순수 함수 (UI/상태와 무관 → 단위 테스트 대상)

export const pad = (n) => String(n).padStart(2, "0");

// "08:30" → 510 (분)
export const toMin = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

// "08:30" → "8:30", "13:30" → "1:30" (오후는 12 빼고 표기, 12시는 그대로)
export const fmtClock = (t) => {
  const [h, m] = t.split(":").map(Number);
  const hh = h > 12 ? h - 12 : h;
  return `${hh}:${pad(m)}`;
};

// 5 → "5h", 4.5 → "4.5h"
export const fmtHours = (h) => `${Number.isInteger(h) ? h : h.toFixed(1)}h`;

// 휴게 공제 없는 단순 경과시간(시간 단위). 음수/휴무(시간 없음)면 0.
export const hoursOf = (e) => {
  if (!e || !e.start || !e.end) return 0;
  return Math.max(0, (toMin(e.end) - toMin(e.start)) / 60);
};
