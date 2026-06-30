import { DOW } from "./worklog";
import { fmtHours } from "./time";
import { C, primaryBtn, ghostBtn } from "./theme";
import TimeField from "./TimeField";

// 날짜 입력 바텀시트
export default function EditorSheet({ editing, draft, setDraft, draftHours, hasEntry, onSave, onMarkOff, onRemove, onClose }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 20,
      background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, width: "100%", maxWidth: 460,
        borderRadius: "20px 20px 0 0", padding: "20px 18px 26px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <span style={{ fontSize: 24, fontWeight: 800 }}>
            {editing.m + 1}월 {editing.d}일 ({DOW[new Date(editing.y, editing.m, editing.d).getDay()]})
          </span>
          <span style={{ fontSize: 26, fontWeight: 800, color: C.honeyDark }}>{fmtHours(draftHours)}</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 14 }}>
          <TimeField label="출근" value={draft.start} onChange={(v) => setDraft({ ...draft, start: v })} />
          <TimeField label="퇴근" value={draft.end} onChange={(v) => setDraft({ ...draft, end: v })} />
        </div>

        <div style={{ fontSize: 14, color: C.note, fontWeight: 700, marginBottom: 6 }}>메모</div>
        <textarea value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
          placeholder="메모 (선택)" rows={2}
          style={{ width: "100%", boxSizing: "border-box", marginBottom: 18, resize: "none",
            border: `1px solid ${C.note}`, borderRadius: 12, padding: "12px 12px",
            fontSize: 18, color: C.ink, background: C.noteBg, fontFamily: "inherit", outline: "none" }} />

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onMarkOff} style={{ ...ghostBtn, flex: 1 }}>휴무</button>
          <button onClick={onSave} style={{ ...primaryBtn, flex: 2, padding: "15px 0", fontSize: 18 }}>저장</button>
        </div>
        {hasEntry && (
          <button onClick={onRemove} style={{ ...ghostBtn, width: "100%", marginTop: 10, padding: "11px 0",
            fontSize: 15, color: C.sub, border: "none", background: "transparent" }}>
            기록 지우기
          </button>
        )}
      </div>
    </div>
  );
}
