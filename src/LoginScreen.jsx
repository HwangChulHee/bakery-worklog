import { useState } from "react";
import { C, FONT } from "./theme";

// 앱 진입 게이트. 이름 + 비밀번호 입력 → onSubmit(name, password).
// 서버 오류 시 onOffline 으로 오프라인 시작 허용(showOffline=true 일 때만 노출).
export default function LoginScreen({ onSubmit, onOffline, busy, error, showOffline }) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  const submit = (e) => {
    e.preventDefault();
    onSubmit(name.trim(), password);
  };

  const field = {
    width: "100%", boxSizing: "border-box", border: `1px solid ${C.line}`,
    borderRadius: 12, padding: "13px 14px", fontSize: 16, marginBottom: 12,
    color: C.ink, background: C.bg, outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box" }}>
      <form onSubmit={submit} style={{ width: "100%", maxWidth: 360, background: C.card,
        borderRadius: 20, padding: 24, border: `1px solid ${C.line}` }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ fontSize: 28, fontWeight: 800 }}>빵집 근무시간</div>
          <div style={{ fontSize: 13, color: C.sub, marginTop: 6 }}>이름과 비밀번호로 로그인</div>
        </div>

        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="이름"
          autoComplete="username" style={field} />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          placeholder="비밀번호" autoComplete="current-password" style={field} />

        {error && (
          <div style={{ color: C.sun, fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{error}</div>
        )}

        <button type="submit" disabled={busy} style={{
          width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
          background: C.honey, color: "#fff", fontSize: 16, fontWeight: 800,
          cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}>
          {busy ? "확인 중…" : "들어가기"}
        </button>

        {showOffline && (
          <button type="button" onClick={() => onOffline(name.trim(), password)} style={{
            width: "100%", marginTop: 10, padding: "12px 0", borderRadius: 12,
            border: `1px solid ${C.line}`, background: C.card, color: C.sub,
            fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            오프라인으로 시작
          </button>
        )}
      </form>
    </div>
  );
}
