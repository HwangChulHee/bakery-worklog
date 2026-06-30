import { DOW } from "./worklog";
import { fmtHours } from "./time";
import { C, primaryBtn, ghostBtn, timeBox, timeLabel, timeInput } from "./theme";

// 날짜 입력 바텀시트
export default function EditorSheet({ editing, draft, setDraft, draftHours, hasEntry, onSave, onMarkOff, onRemove, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 20,
      background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, width: "100%", maxWidth: 460,
        borderRadius: "20px 20px 0 0", padding: "20px 18px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 20, fontWeight: 800 }}>
            {editing.m + 1}월 {editing.d}일 ({DOW[new Date(editing.y, editing.m, editing.d).getDay()]})
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

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onMarkOff} style={{ ...ghostBtn, flex: 1 }}>휴무</button>
          <button onClick={onSave} style={{ ...primaryBtn, flex: 2, padding: "14px 0", fontSize: 16 }}>저장</button>
        </div>
        {hasEntry && (
          <button onClick={onRemove} style={{ ...ghostBtn, width: "100%", marginTop: 10, padding: "10px 0",
            fontSize: 14, color: C.sub, border: "none", background: "transparent" }}>
            기록 지우기
          </button>
        )}
      </div>
    </div>
  );
}
