import { useState } from "react";
import { DOW } from "./worklog";
import { fmtClock, fmtHours, hoursOf } from "./time";
import { C, primaryBtn, ghostBtn } from "./theme";
import TimeField from "./TimeField";

// 상태 토글 버튼 스타일
const toggleBtn = (active, kind) => ({
  flex: 1, padding: "16px 0", borderRadius: 14, cursor: "pointer",
  fontSize: 20, fontWeight: 800, display: "flex", alignItems: "center",
  justifyContent: "center", gap: 8,
  border: active ? "none" : `1px solid ${C.line}`,
  background: active ? (kind === "work" ? C.honey : C.off) : C.card,
  color: active ? "#fff" : C.sub,
});

// 날짜 입력 바텀시트 (근무/휴무 토글 → 그에 맞는 입력, 나가면 자동저장)
export default function EditorSheet({ editing, draft, setDraft, mode, setMode, draftHours, entry, onSave, onRemove, onClose }) {
  const [confirming, setConfirming] = useState(false);
  const hasEntry = !!entry;
  const isOff = mode === "off";
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

          {/* 헤더: 날짜 + (기록 지우기) */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 24, fontWeight: 800 }}>{dateLabel}</span>
            {hasEntry && (
              <button onClick={() => setConfirming(true)} style={{ background: "transparent",
                border: "none", cursor: "pointer", fontSize: 15, fontWeight: 700,
                color: C.sub, textDecoration: "underline", padding: 4 }}>
                기록 지우기
              </button>
            )}
          </div>

          {/* 상태 토글: 근무 / 휴무 */}
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <button onClick={() => setMode("work")} style={toggleBtn(!isOff, "work")}>
              <span style={{ lineHeight: 1 }}>🍞</span><span>근무</span>
            </button>
            <button onClick={() => setMode("off")} style={toggleBtn(isOff, "off")}>
              <span style={{ lineHeight: 1 }}>🛌</span><span>휴무</span>
            </button>
          </div>

          {/* 요약 카드: 근무시간 또는 쉬는 날 */}
          {isOff ? (
            <div style={{ background: C.offBg, borderRadius: 14, padding: "16px 0", marginBottom: 16,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <span style={{ lineHeight: 1, fontSize: 22 }}>🛌</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: C.off }}>쉬는 날</span>
            </div>
          ) : (
            <div style={{ background: C.workBg, borderRadius: 14, padding: "16px 0", marginBottom: 16,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: C.honeyDark }}>근무시간</span>
              <span style={{ fontSize: 24, fontWeight: 800, color: C.honeyDark }}>{fmtHours(draftHours)}</span>
            </div>
          )}

          {/* 시간 선택 (휴무면 회색 비활성) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
            <TimeField label="출근" value={draft.start} disabled={isOff}
              onChange={(v) => setDraft({ ...draft, start: v })} />
            <TimeField label="퇴근" value={draft.end} disabled={isOff}
              onChange={(v) => setDraft({ ...draft, end: v })} />
          </div>

          {/* 메모 */}
          <div style={{ fontSize: 14, color: C.note, fontWeight: 700, marginBottom: 6 }}>메모</div>
          <textarea value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })}
            placeholder="메모 (선택)" rows={2}
            style={{ width: "100%", boxSizing: "border-box", marginBottom: 18, resize: "none",
              border: `1px solid ${C.note}`, borderRadius: 12, padding: "12px 12px",
              fontSize: 18, color: C.ink, background: C.noteBg, fontFamily: "inherit", outline: "none" }} />

          {/* 저장 (전폭, 단일) */}
          <button onClick={onSave} style={{ ...primaryBtn, width: "100%", fontSize: 20, padding: "17px 0",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <span style={{ lineHeight: 1 }}>💾</span><span>저장</span>
          </button>
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
