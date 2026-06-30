import { useState } from "react";
import { holidayName } from "./holidays";
import { fmtClock, fmtHours, hoursOf } from "./time";
import { DOW, keyOf as wKeyOf, getWeeks, weekSum as wWeekSum, monthTotal as wMonthTotal, buildSummary } from "./worklog";

/* ────────────────────────────────────────────────────────────
   빵집 근무시간 정리 앱 (v2)
   - 날짜 탭 → 퇴근시간 선택(출근 기본값) → 자동 집계
   - 주차 소계 / 월 총합 자동 계산
   - "정리본" 텍스트를 어머니 형식 그대로 생성 + 복사
   - 자동저장(localStorage) / 공휴일 표시 / 설정 탭
   ──────────────────────────────────────────────────────────── */

// localStorage 자동저장 훅
function useLocalStorage(key, initial) {
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

const QUICK_ENDS = ["12:00", "12:30", "13:00", "13:30", "14:00", "14:30"];

const C = {
  bg: "#F6F1E9", card: "#FFFFFF", ink: "#2A2521", sub: "#857A6D",
  line: "#E7DFD3", honey: "#CC8A3C", honeyDark: "#B0721E",
  workBg: "#FBEFD8", sun: "#C2453B", sat: "#2F6FB0", band: "#EFE5D3",
};

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  // 자동저장 대상
  const [entries, setEntries] = useLocalStorage("entries", {}); // { "2026-6-1": {start,end} }
  const [account, setAccount] = useLocalStorage("account", "우리은행(01076004597)");
  const [defaultStart, setDefaultStart] = useLocalStorage("defaultStart", "08:30");
  const [defaultEnd, setDefaultEnd] = useLocalStorage("defaultEnd", "13:30");
  const [showHolidays, setShowHolidays] = useLocalStorage("showHolidays", true);

  const [tab, setTab] = useState("cal"); // "cal" | "settings"
  const [editing, setEditing] = useState(null); // day number or null
  const [draft, setDraft] = useState({ start: defaultStart, end: defaultEnd });
  const [copied, setCopied] = useState(false);

  const keyOf = (d) => wKeyOf(year, month, d);
  const weeks = getWeeks(year, month);
  const weekSum = (week) => wWeekSum(entries, year, month, week);
  const monthTotal = wMonthTotal(entries, year, month);

  const openEditor = (d) => {
    const e = entries[keyOf(d)];
    setDraft(e ? { ...e } : { start: defaultStart, end: defaultEnd });
    setEditing(d);
  };
  const save = () => {
    setEntries((p) => ({ ...p, [keyOf(editing)]: { ...draft } }));
    setEditing(null);
  };
  const clearDay = () => {
    setEntries((p) => { const n = { ...p }; delete n[keyOf(editing)]; return n; });
    setEditing(null);
  };
  const shiftMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  // 정리본 텍스트 생성 (어머니 형식)
  const buildText = () => buildSummary({ entries, year, month, account });

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard 차단 시 미리보기에서 직접 복사 */ }
  };

  const draftHours = hoursOf(draft);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink,
      fontFamily: "-apple-system, 'Apple SD Gothic Neo', 'Pretendard', system-ui, sans-serif",
      padding: "16px 16px 88px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>

        {tab === "cal" && (
          <>
            {/* 헤더 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={() => shiftMonth(-1)} style={navBtn}>◀</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: C.sub, letterSpacing: 1 }}>{year}년</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{month + 1}월 근무</div>
              </div>
              <button onClick={() => shiftMonth(1)} style={navBtn}>▶</button>
            </div>

            {/* 월 총합 */}
            <div style={{ background: C.ink, color: "#fff", borderRadius: 16, padding: "14px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <span style={{ fontSize: 14, opacity: 0.8 }}>이번 달 총 근무</span>
              <span style={{ fontSize: 28, fontWeight: 800 }}>{fmtHours(monthTotal)}</span>
            </div>

            {/* 달력 */}
            <div style={{ background: C.card, borderRadius: 16, padding: 12, border: `1px solid ${C.line}`, marginBottom: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr) 1.1fr", gap: 4, marginBottom: 6 }}>
                {DOW.map((d, i) => (
                  <div key={d} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, padding: "4px 0",
                    color: i === 0 ? C.sun : i === 6 ? C.sat : C.sub }}>{d}</div>
                ))}
                <div style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: C.honeyDark }}>합계</div>
              </div>

              {weeks.map((week, wi) => {
                const ws = weekSum(week);
                return (
                  <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr) 1.1fr", gap: 4, marginBottom: 4 }}>
                    {week.map((d, di) => {
                      if (!d) return <div key={di} />;
                      const e = entries[keyOf(d)];
                      const hol = showHolidays ? holidayName(year, month, d) : null;
                      const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                      const dayColor = hol ? C.sun : di === 0 ? C.sun : di === 6 ? C.sat : C.ink;
                      return (
                        <button key={di} onClick={() => openEditor(d)} title={hol || undefined}
                          aria-label={`${month + 1}월 ${d}일${hol ? ` ${hol}` : ""}`} style={{
                          aspectRatio: "1 / 1.05", borderRadius: 10, cursor: "pointer", overflow: "hidden",
                          border: isToday ? `2px solid ${C.honey}` : `1px solid ${C.line}`,
                          background: e ? C.workBg : C.card, padding: 2,
                          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: dayColor }}>{d}</span>
                          {e && <span style={{ fontSize: 12, fontWeight: 800, color: C.honeyDark }}>{fmtHours(hoursOf(e))}</span>}
                          {hol && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: C.sun, lineHeight: 1.05,
                              maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {hol}
                            </span>
                          )}
                        </button>
                      );
                    })}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center",
                      background: ws ? C.band : "transparent", borderRadius: 10,
                      fontSize: 13, fontWeight: 800, color: ws ? C.honeyDark : C.line }}>
                      {ws ? fmtHours(ws) : "–"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 정리본 */}
            <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>정리본</span>
                <button onClick={copyText} style={{ ...primaryBtn, padding: "8px 16px" }}>
                  {copied ? "복사됨 ✓" : "복사하기"}
                </button>
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.7,
                fontFamily: "'SF Mono', ui-monospace, Menlo, monospace", color: C.ink,
                background: C.bg, borderRadius: 10, padding: 14, border: `1px dashed ${C.line}` }}>
                {buildText()}
              </pre>
            </div>
          </>
        )}

        {tab === "settings" && (
          <>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ fontSize: 26, fontWeight: 800 }}>설정</div>
            </div>

            <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.line}`, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <label style={timeBox}>
                  <span style={timeLabel}>기본 출근시간</span>
                  <input type="time" value={defaultStart} onChange={(e) => setDefaultStart(e.target.value)} style={timeInput} />
                </label>
                <label style={timeBox}>
                  <span style={timeLabel}>기본 퇴근시간</span>
                  <input type="time" value={defaultEnd} onChange={(e) => setDefaultEnd(e.target.value)} style={timeInput} />
                </label>
              </div>

              <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginBottom: 6 }}>입금 계좌</div>
              <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="입금 계좌"
                style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.line}`, borderRadius: 10,
                  padding: "10px 12px", fontSize: 14, marginBottom: 16, color: C.ink, background: C.bg }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>공휴일 표시</span>
                <button onClick={() => setShowHolidays((v) => !v)} style={{
                  width: 52, height: 30, borderRadius: 16, border: "none", cursor: "pointer", padding: 3,
                  background: showHolidays ? C.honey : C.line, display: "flex",
                  justifyContent: showHolidays ? "flex-end" : "flex-start", transition: "background .15s" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "block" }} />
                </button>
              </div>
            </div>

            <div style={{ fontSize: 12, color: C.sub, textAlign: "center", lineHeight: 1.6 }}>
              입력한 근무 기록과 설정은 이 기기에 자동 저장됩니다.
            </div>
          </>
        )}
      </div>

      {/* 입력 시트 */}
      {editing != null && (
        <div onClick={() => setEditing(null)} style={{ position: "fixed", inset: 0, zIndex: 20,
          background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, width: "100%", maxWidth: 460,
            borderRadius: "20px 20px 0 0", padding: "20px 18px 26px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 20, fontWeight: 800 }}>
                {month + 1}월 {editing}일 ({DOW[new Date(year, month, editing).getDay()]})
              </span>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.honeyDark }}>{fmtHours(draftHours)}</span>
            </div>

            <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
              <label style={timeBox}>
                <span style={timeLabel}>출근</span>
                <input type="time" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} style={timeInput} />
              </label>
              <label style={timeBox}>
                <span style={timeLabel}>퇴근</span>
                <input type="time" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} style={timeInput} />
              </label>
            </div>

            <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>자주 쓰는 퇴근시간</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}>
              {QUICK_ENDS.map((t) => {
                const on = draft.end === t;
                return (
                  <button key={t} onClick={() => setDraft({ ...draft, end: t })} style={{
                    padding: "12px 0", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer",
                    border: on ? `2px solid ${C.honey}` : `1px solid ${C.line}`,
                    background: on ? C.workBg : C.card, color: on ? C.honeyDark : C.ink }}>
                    {fmtClock(t)}
                  </button>
                );
              })}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={clearDay} style={{ ...ghostBtn, flex: 1 }}>휴무</button>
              <button onClick={save} style={{ ...primaryBtn, flex: 2, padding: "14px 0", fontSize: 16 }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* 하단 탭바 */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 10,
        background: C.card, borderTop: `1px solid ${C.line}`, display: "flex", justifyContent: "center" }}>
        <div style={{ maxWidth: 460, width: "100%", display: "flex" }}>
          {[["cal", "달력"], ["settings", "설정"]].map(([k, label]) => {
            const on = tab === k;
            return (
              <button key={k} onClick={() => setTab(k)} style={{
                flex: 1, padding: "14px 0", border: "none", background: "transparent", cursor: "pointer",
                fontSize: 15, fontWeight: 800, color: on ? C.honeyDark : C.sub,
                borderTop: on ? `2px solid ${C.honey}` : "2px solid transparent" }}>
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const navBtn = { width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.line}`,
  background: C.card, fontSize: 16, cursor: "pointer", color: C.ink };
const primaryBtn = { background: C.honey, color: "#fff", border: "none", borderRadius: 12,
  fontWeight: 800, cursor: "pointer" };
const ghostBtn = { background: C.card, color: C.sub, border: `1px solid ${C.line}`,
  borderRadius: 12, padding: "14px 0", fontSize: 16, fontWeight: 700, cursor: "pointer" };
const timeBox = { flex: 1, display: "flex", flexDirection: "column", gap: 6,
  background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px" };
const timeLabel = { fontSize: 12, color: C.sub, fontWeight: 700 };
const timeInput = { border: "none", background: "transparent", fontSize: 18, fontWeight: 700, color: C.ink, outline: "none" };
