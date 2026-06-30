import { DOW, keyOf as wKeyOf } from "./worklog";
import { fmtClock, fmtHours, hoursOf } from "./time";
import { holidayName } from "./holidays";
import { C, navBtn, todayBtn } from "./theme";

// 주간 리스트 보기 (일~토)
export default function WeekView({ weekDays, entries, showHolidays, now, weekTotal, onShiftWeek, onToday, onOpenDay }) {
  const isCurrent = weekDays.some((dt) =>
    dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth() && dt.getDate() === now.getDate());
  return (
    <>
      {/* 주 이동 헤더 */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => onShiftWeek(-1)} style={navBtn}>◀</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 15, color: C.sub, letterSpacing: 1 }}>주간</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>
            {weekDays[0].getMonth() + 1}/{weekDays[0].getDate()} ~ {weekDays[6].getMonth() + 1}/{weekDays[6].getDate()}
          </div>
          {!isCurrent && (
            <button onClick={onToday} style={todayBtn}>오늘</button>
          )}
        </div>
        <button onClick={() => onShiftWeek(1)} style={navBtn}>▶</button>
      </div>

      {/* 주 총합 */}
      <div style={{ background: C.ink, color: "#fff", borderRadius: 16, padding: "14px 18px",
        display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <span style={{ fontSize: 16, opacity: 0.8 }}>이번 주 총 근무</span>
        <span style={{ fontSize: 32, fontWeight: 800 }}>{fmtHours(weekTotal)}</span>
      </div>

      {/* 요일별 리스트 */}
      <div style={{ background: C.card, borderRadius: 16, padding: 8, border: `1px solid ${C.line}`, marginBottom: 16 }}>
        {weekDays.map((dt) => {
          const y = dt.getFullYear(), m = dt.getMonth(), d = dt.getDate(), dow = dt.getDay();
          const e = entries[wKeyOf(y, m, d)];
          const isOff = !!(e && e.off);
          const hol = showHolidays ? holidayName(y, m, d) : null;
          const isToday = d === now.getDate() && m === now.getMonth() && y === now.getFullYear();
          const dateColor = hol || dow === 0 ? C.sun : dow === 6 ? C.sat : C.ink;
          return (
            <button key={`${y}-${m}-${d}`} onClick={() => onOpenDay(y, m, d)}
              aria-label={`${m + 1}월 ${d}일${isOff ? " 휴무" : ""}`} style={{
              width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: 8, padding: "12px 12px", marginBottom: 4,
              borderRadius: 12, cursor: "pointer", textAlign: "left",
              border: isToday ? `2px solid ${C.honey}` : `1px solid ${C.line}`,
              background: isOff ? C.offBg : e ? C.workBg : C.card }}>
              <span style={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
                <span style={{ fontSize: 19, fontWeight: 800, color: dateColor }}>{m + 1}/{d} ({DOW[dow]})</span>
                {hol && <span style={{ fontSize: 14, fontWeight: 700, color: C.sun }}>{hol}</span>}
                {e && e.memo && (
                  <span style={{ fontSize: 14, color: C.note, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    📝 {e.memo}
                  </span>
                )}
              </span>
              <span style={{ fontSize: 19, fontWeight: 800, whiteSpace: "nowrap",
                display: "inline-flex", alignItems: "center", gap: 3,
                color: isOff ? C.off : e ? C.honeyDark : C.line }}>
                {isOff
                  ? <><span style={{ fontSize: 13, lineHeight: 1 }}>🛌</span>휴무</>
                  : e
                    ? <><span style={{ fontSize: 13, lineHeight: 1 }}>🍞</span>{`${fmtClock(e.start)}~${fmtClock(e.end)} · ${fmtHours(hoursOf(e))}`}</>
                    : "—"}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
