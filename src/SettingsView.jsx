import { useState } from "react";
import { C, iconBtn, ghostBtn } from "./theme";
import TimeField from "./TimeField";

const WEEKDAYS = [[1, "월"], [2, "화"], [3, "수"], [4, "목"], [5, "금"]];
const BASE_DEF = { start: "08:30", end: "13:30" };

// 회색톤 카드/버튼
const card = { background: C.grayBg, borderRadius: 16, padding: 16, border: `1px solid ${C.grayLine}` };
const grayBtn = { background: C.gray, color: "#fff", border: "none", borderRadius: 12,
  fontWeight: 800, cursor: "pointer" };

// 카테고리 섹션 (아이콘 + 제목 + 카드)
function Section({ icon, title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13, fontWeight: 800, color: C.gray, letterSpacing: 0.3,
        margin: "0 4px 7px", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 14, lineHeight: 1 }}>{icon}</span>{title}
      </div>
      <div style={card}>{children}</div>
    </div>
  );
}

// 설정 화면 (회색톤, 카테고리화)
export default function SettingsView({
  dayDefaults, setDayDefaults,
  account, setAccount, showHolidays, setShowHolidays,
  auth, cloud, onBackup, onRestore, onLogout, onBack,
}) {
  const [selDow, setSelDow] = useState(1); // 편집 중인 요일(기본 월)
  const cur = (dayDefaults && dayDefaults[selDow]) || BASE_DEF;
  const updateDow = (field, v) =>
    setDayDefaults((p) => ({ ...p, [selDow]: { ...((p && p[selDow]) || BASE_DEF), [field]: v } }));
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <button onClick={onBack} aria-label="달력" style={iconBtn}>←</button>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.grayDark, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>⚙</span>설정
        </div>
      </div>

      {/* 근무 기본값 (요일별) */}
      <Section icon="⏰" title="근무 기본값 (요일별)">
        {/* 요일 선택 탭 */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {WEEKDAYS.map(([d, label]) => (
            <button key={d} onClick={() => setSelDow(d)} aria-label={`${label}요일 기본값`} style={{
              flex: 1, padding: "10px 0", borderRadius: 10, cursor: "pointer", fontSize: 17, fontWeight: 800,
              border: selDow === d ? "none" : `1px solid ${C.grayLine}`,
              background: selDow === d ? C.gray : C.card, color: selDow === d ? "#fff" : C.gray }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <TimeField label="기본 출근시간" value={cur.start} onChange={(v) => updateDow("start", v)} />
          <TimeField label="기본 퇴근시간" value={cur.end} onChange={(v) => updateDow("end", v)} />
        </div>
        <div style={{ fontSize: 12, color: C.gray, marginTop: 8 }}>
          선택한 요일에 새로 입력할 때 이 시간이 기본으로 채워져요.
        </div>
      </Section>

      {/* 정리본 */}
      <Section icon="💰" title="정리본">
        <div style={{ fontSize: 13, color: C.gray, fontWeight: 700, marginBottom: 6 }}>입금 계좌</div>
        <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="입금 계좌"
          style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.grayLine}`, borderRadius: 10,
            padding: "12px 12px", fontSize: 16, color: C.ink, background: C.card }} />
      </Section>

      {/* 달력 */}
      <Section icon="📅" title="달력">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.grayDark }}>공휴일 표시</span>
          <button onClick={() => setShowHolidays((v) => !v)} style={{
            width: 52, height: 30, borderRadius: 16, border: "none", cursor: "pointer", padding: 3,
            background: showHolidays ? C.gray : C.grayLine, display: "flex",
            justifyContent: showHolidays ? "flex-end" : "flex-start", transition: "background .15s" }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "block" }} />
          </button>
        </div>
      </Section>

      {/* 클라우드 백업 */}
      <Section icon="☁️" title="클라우드 백업">
        <div style={{ fontSize: 15, color: C.gray, marginBottom: 12 }}>
          로그인 계정: <b style={{ color: C.ink }}>{auth.name}</b>
          {!auth.password && <span style={{ color: C.sun }}> (오프라인 — 자동 백업 꺼짐)</span>}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={onBackup} style={{ ...grayBtn, flex: 1, padding: "13px 0", fontSize: 16 }}>지금 백업</button>
          <button onClick={onRestore} style={{ ...ghostBtn, flex: 1, padding: "13px 0", fontSize: 16,
            border: `1px solid ${C.grayLine}` }}>복구</button>
        </div>
        {cloud.status && (
          <div style={{ marginTop: 10, fontSize: 15, fontWeight: 700,
            color: cloud.status === "error" ? C.sun : C.grayDark }}>
            {cloud.status === "saving" && "백업 중…"}
            {cloud.status === "saved" && "백업 완료 ✓"}
            {cloud.status === "restoring" && "복구 중…"}
            {cloud.status === "restored" && "복구 완료 ✓"}
            {cloud.status === "error" && `오류: ${cloud.msg}`}
          </div>
        )}
      </Section>

      {/* 계정 */}
      <Section icon="👤" title="계정">
        <button onClick={onLogout} style={{ ...ghostBtn, width: "100%", padding: "12px 0",
          fontSize: 15, color: C.gray, border: `1px solid ${C.grayLine}` }}>
          로그아웃
        </button>
      </Section>

      <div style={{ fontSize: 13, color: C.gray, textAlign: "center", lineHeight: 1.6, marginTop: 4 }}>
        기록은 이 기기에 저장되고, 클라우드 자동 백업은 <b>하루 1번</b>만 됩니다.
        그날 추가로 바꾼 내용을 바로 저장하려면 <b>“지금 백업”</b>을 눌러주세요.
      </div>
    </>
  );
}
