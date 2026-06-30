import { DOW, keyOf as wKeyOf, weekSum as wWeekSum } from "./worklog";
import { fmtHours, hoursOf } from "./time";
import { holidayName } from "./holidays";
import { C, navBtn } from "./theme";

// 월간 달력 보기
export default function MonthView({ year, month, weeks, entries, showHolidays, now, monthTotal, onShiftMonth, onOpenDay }) {
  const keyOf = (d) => wKeyOf(year, month, d);
  return (
    <>
      {/* 월 이동 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => onShiftMonth(-1)} style={navBtn}>◀</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 13, color: C.sub, letterSpacing: 1 }}>{year}년</div>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{month + 1}월 근무</div>
        </div>
        <button onClick={() => onShiftMonth(1)} style={navBtn}>▶</button>
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
          const ws = wWeekSum(entries, year, month, week);
          return (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr) 1.1fr", gap: 4, marginBottom: 4 }}>
              {week.map((d, di) => {
                if (!d) return <div key={di} />;
                const e = entries[keyOf(d)];
                const isOff = !!(e && e.off);
                const hol = showHolidays ? holidayName(year, month, d) : null;
                const isToday = d === now.getDate() && month === now.getMonth() && year === now.getFullYear();
                const dayColor = hol ? C.sun : di === 0 ? C.sun : di === 6 ? C.sat : C.ink;
                return (
                  <button key={di} onClick={() => onOpenDay(year, month, d)} title={hol || undefined}
                    aria-label={`${month + 1}월 ${d}일${isOff ? " 휴무" : ""}${hol ? ` ${hol}` : ""}`} style={{
                    aspectRatio: "1 / 1.05", borderRadius: 10, cursor: "pointer", overflow: "hidden",
                    border: isToday ? `2px solid ${C.honey}` : `1px solid ${C.line}`,
                    background: isOff ? C.offBg : e ? C.workBg : C.card, padding: 2,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: dayColor }}>{d}</span>
                    {isOff
                      ? <span style={{ fontSize: 11, fontWeight: 800, color: C.off }}>휴무</span>
                      : e && <span style={{ fontSize: 12, fontWeight: 800, color: C.honeyDark }}>{fmtHours(hoursOf(e))}</span>}
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
    </>
  );
}
