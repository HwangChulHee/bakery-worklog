import { DOW, keyOf as wKeyOf } from "./worklog";
import { fmtHours, hoursOf } from "./time";
import { holidayName } from "./holidays";
import { C, navBtn, todayBtn } from "./theme";

// 주말(일·토) 칸 좁게 → 평일 칸 넓힘
const COLS = "0.78fr repeat(5, 1fr) 0.78fr";

// 칸 안의 공휴일/메모 밴드 (여백 없이 꽉 채움 + 흰 글씨, 왼쪽 정렬)
const band = {
  width: "100%", boxSizing: "border-box", textAlign: "left", color: "#fff",
  fontSize: 11, fontWeight: 700, lineHeight: 1.35, padding: "1px 4px",
  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
};

// 월간 달력 보기
export default function MonthView({ year, month, weeks, entries, showHolidays, now, monthTotal, onShiftMonth, onToday, onOpenDay }) {
  const keyOf = (d) => wKeyOf(year, month, d);
  const isCurrent = year === now.getFullYear() && month === now.getMonth();
  return (
    <>
      {/* 월 이동 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => onShiftMonth(-1)} style={navBtn}>◀</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 14, color: C.sub, letterSpacing: 1 }}>{year}년</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{month + 1}월 근무</div>
          {!isCurrent && (
            <button onClick={onToday} style={todayBtn}>오늘</button>
          )}
        </div>
        <button onClick={() => onShiftMonth(1)} style={navBtn}>▶</button>
      </div>

      {/* 월 총합 */}
      <div style={{ background: C.ink, color: "#fff", borderRadius: 16, padding: "14px 18px",
        display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <span style={{ fontSize: 15, opacity: 0.8 }}>이번 달 총 근무</span>
        <span style={{ fontSize: 30, fontWeight: 800 }}>{fmtHours(monthTotal)}</span>
      </div>

      {/* 달력 */}
      <div style={{ background: C.card, borderRadius: 16, padding: 12, border: `1px solid ${C.line}`, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 4, marginBottom: 6 }}>
          {DOW.map((d, i) => (
            <div key={d} style={{ textAlign: "center", fontSize: 13, fontWeight: 700, padding: "4px 0",
              color: i === 0 ? C.sun : i === 6 ? C.sat : C.sub }}>{d}</div>
          ))}
        </div>

        {weeks.map((week, wi) => {
          return (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: COLS, gap: 4, marginBottom: 4 }}>
              {week.map((d, di) => {
                if (!d) return <div key={di} />;
                const e = entries[keyOf(d)];
                const isOff = !!(e && e.off);
                const hol = showHolidays ? holidayName(year, month, d) : null;
                const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const dayColor = hol ? C.sun : di === 0 ? C.sun : di === 6 ? C.sat : C.ink;
                return (
                  <button key={di} onClick={() => onOpenDay(year, month, d)} title={hol || (e && e.memo) || undefined}
                    aria-label={`${month + 1}월 ${d}일${isOff ? " 휴무" : ""}${hol ? ` ${hol}` : ""}`} style={{
                    minHeight: 78, borderRadius: 10, cursor: "pointer", overflow: "hidden",
                    border: isToday ? `2px solid ${C.honey}` : `1px solid ${C.line}`,
                    background: isOff ? C.offBg : e ? C.workBg : C.card, padding: "5px 0 4px",
                    display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", gap: 3 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: dayColor, textAlign: "center" }}>{d}</span>
                    {hol && <span style={{ ...band, background: C.sun }}>{hol}</span>}
                    {e && e.memo && <span style={{ ...band, background: C.honey }}>{e.memo}</span>}
                    {isOff
                      ? <span style={{ fontSize: 14, fontWeight: 800, color: C.off, textAlign: "center" }}>휴무</span>
                      : e && <span style={{ fontSize: 16, fontWeight: 800, color: C.honeyDark, textAlign: "center" }}>{fmtHours(hoursOf(e))}</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}
