import { C, iconBtn, ghostBtn } from "./theme";
import TimeField from "./TimeField";

// 회색톤 카드/버튼
const card = { background: C.grayBg, borderRadius: 16, padding: 16,
  border: `1px solid ${C.grayLine}`, marginBottom: 16 };
const grayBtn = { background: C.gray, color: "#fff", border: "none", borderRadius: 12,
  fontWeight: 800, cursor: "pointer" };
const label = { fontSize: 13, color: C.gray, fontWeight: 700, marginBottom: 6,
  display: "flex", alignItems: "center", gap: 5 };

// 설정 화면 (회색톤)
export default function SettingsView({
  defaultStart, setDefaultStart, defaultEnd, setDefaultEnd,
  account, setAccount, showHolidays, setShowHolidays,
  auth, cloud, onBackup, onRestore, onLogout, onBack,
}) {
  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <button onClick={onBack} aria-label="달력" style={iconBtn}>←</button>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.grayDark, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>⚙</span>설정
        </div>
      </div>

      <div style={card}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
          <TimeField label="기본 출근시간" icon="⏰" value={defaultStart} onChange={setDefaultStart} />
          <TimeField label="기본 퇴근시간" icon="⏰" value={defaultEnd} onChange={setDefaultEnd} />
        </div>

        <div style={label}><span style={{ fontSize: 15, lineHeight: 1 }}>💰</span>입금 계좌</div>
        <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="입금 계좌"
          style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.grayLine}`, borderRadius: 10,
            padding: "12px 12px", fontSize: 16, marginBottom: 16, color: C.ink, background: C.card }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.grayDark, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 17, lineHeight: 1 }}>🎌</span>공휴일 표시
          </span>
          <button onClick={() => setShowHolidays((v) => !v)} style={{
            width: 52, height: 30, borderRadius: 16, border: "none", cursor: "pointer", padding: 3,
            background: showHolidays ? C.gray : C.grayLine, display: "flex",
            justifyContent: showHolidays ? "flex-end" : "flex-start", transition: "background .15s" }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "block" }} />
          </button>
        </div>
      </div>

      {/* 클라우드 백업 / 계정 */}
      <div style={card}>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4, color: C.grayDark, display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>☁️</span>클라우드 백업
        </div>
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

        <button onClick={onLogout} style={{ ...ghostBtn, width: "100%", marginTop: 12, padding: "12px 0",
          fontSize: 15, color: C.gray, border: `1px solid ${C.grayLine}` }}>
          로그아웃
        </button>
      </div>

      <div style={{ fontSize: 13, color: C.gray, textAlign: "center", lineHeight: 1.6 }}>
        기록은 이 기기에 저장되고, 클라우드 자동 백업은 <b>하루 1번</b>만 됩니다.
        그날 추가로 바꾼 내용을 바로 저장하려면 <b>“지금 백업”</b>을 눌러주세요.
      </div>
    </>
  );
}
