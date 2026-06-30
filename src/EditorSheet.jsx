import { useState } from "react";
import { DOW } from "./worklog";
import { fmtClock, fmtHours, hoursOf } from "./time";
import { C, primaryBtn, ghostBtn } from "./theme";
import TimeField from "./TimeField";

// 날짜 입력 바텀시트
export default function EditorSheet({ editing, draft, setDraft, draftHours, entry, onSave, onMarkOff, onRemove, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const hasEntry = !!entry;
  const dateLabel = `${editing.m + 1}월 ${editing.d}일 (${DOW[new Date(editing.y, editing.m, editing.d).getDay()]})`;
  const recordLabel = entry
    ? (entry.off ? "휴무" : `${fmtClock(entry.start)}~${fmtClock(entry.end)} (${fmtHours(hoursOf(entry))})`)
    : "";

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 20,
        background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
        <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, width: "100%", maxWidth: 460,
          borderRadius: "20px 20px 0 0", padding: "20px 18px 26px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={{ fontSize: 24, fontWeight: 800 }}>{dateLabel}</span>
            <span style={{ fontSize: 26, fontWeight: 800, color: C.honeyDark }}>{fmtHours(draftHours)}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 14 }}>
            <TimeField label="출근" value={draft.start} onChange={(v) => setDraft({ ...draft, start: v })} />
            <TimeField label="퇴근" value={draft.end} onChange={(v) => setDraft({ ...draft, end: v })} />
          </div>

          <div style={{ fontSize: 14, color: C.note, fontWeight: 700, marginBottom: 6 }}>메모</div>
          <textarea value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
            placeholder="메모 (선택)" rows={2}
            style={{ width: "100%", boxSizing: "border-box", marginBottom: 16, resize: "none",
              border: `1px solid ${C.note}`, borderRadius: 12, padding: "12px 12px",
              fontSize: 18, color: C.ink, background: C.noteBg, fontFamily: "inherit", outline: "none" }} />

          {/* 삭제는 위쪽에 작게 (저장 오터치 방지) */}
          {hasEntry && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <button onClick={() => setConfirming(true)} style={{
                padding: "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 800,
                color: C.sun, background: "#FCEBE9", border: "1px solid #F2C9C4" }}>
                🗑️ 삭제
              </button>
            </div>
          )}

          {/* 주요 동작 (맨 아래) */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onMarkOff} style={{ ...ghostBtn, flex: 1 }}>🛌 휴무</button>
            <button onClick={onSave} style={{ ...primaryBtn, flex: 2, padding: "15px 0", fontSize: 18 }}>💾 저장</button>
          </div>
        </div>
      </div>

      {/* 삭제 확인 */}
      {confirming && (
        <div onClick={() => setConfirming(false)} style={{ position: "fixed", inset: 0, zIndex: 25,
          background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.card, width: "100%", maxWidth: 340,
            borderRadius: 18, padding: 22, boxShadow: "0 16px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 12 }}>이 기록을 삭제할까요?</div>
            <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px",
              marginBottom: 18, fontSize: 16, lineHeight: 1.6 }}>
              <div style={{ fontWeight: 800 }}>{dateLabel}</div>
              <div style={{ color: C.honeyDark, fontWeight: 700 }}>{recordLabel}</div>
              {entry && entry.memo && <div style={{ color: C.note, fontWeight: 700 }}>메모: {entry.memo}</div>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirming(false)} style={{ ...ghostBtn, flex: 1, fontSize: 16 }}>취소</button>
              <button onClick={() => { setConfirming(false); onRemove(); }} style={{
                flex: 1, padding: "14px 0", borderRadius: 12, border: "none", cursor: "pointer",
                fontSize: 16, fontWeight: 800, color: "#fff", background: C.sun }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
