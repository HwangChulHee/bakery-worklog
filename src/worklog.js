// 달력 구성 / 합계 / 정리본 텍스트 생성 — 순수 함수 (단위 테스트 대상)
import { fmtClock, fmtHours, hoursOf } from "./time";

export const DOW = ["일", "월", "화", "수", "목", "금", "토"];

// entries 키: "2026-6-1" (month 는 0-indexed)
export const keyOf = (year, month, d) => `${year}-${month + 1}-${d}`;

// 해당 월의 주차 배열. 각 주는 길이 7, 빈 칸은 null.
export function getWeeks(year, month) {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDow = new Date(year, month, 1).getDay();
  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function weekSum(entries, year, month, week) {
  return week.reduce((s, d) => {
    const e = d && entries[keyOf(year, month, d)];
    return e ? s + hoursOf(e) : s;
  }, 0);
}

export function monthTotal(entries, year, month) {
  return getWeeks(year, month).reduce(
    (s, w) => s + weekSum(entries, year, month, w),
    0
  );
}

// 어머니 형식 정리본 텍스트
export function buildSummary({ entries, year, month, account }) {
  const weeks = getWeeks(year, month);
  const lines = [`${month + 1}월 근무시간`];
  weeks.forEach((week) => {
    let any = false;
    week.forEach((d) => {
      if (!d) return;
      const e = entries[keyOf(year, month, d)];
      if (!e || !e.start) return; // 휴무({off:true})는 정리본에서 제외
      any = true;
      const dow = DOW[new Date(year, month, d).getDay()];
      lines.push(
        `${month + 1}/${d}(${dow}) ${fmtClock(e.start)}~${fmtClock(e.end)}(${fmtHours(hoursOf(e))})`
      );
    });
    if (any) lines.push(`=>${fmtHours(weekSum(entries, year, month, week))}`);
  });
  lines.push(`==>총근무시간(${fmtHours(monthTotal(entries, year, month))})`);
  if (account && account.trim()) lines.push(`==>${account.trim()}`);
  return lines.join("\n");
}
