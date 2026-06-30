import { useState } from "react";
import { C, iconBtn, ghostBtn } from "./theme";
import TimeField from "./TimeField";

const WEEKDAYS = [[1, "월"], [2, "화"], [3, "수"], [4, "목"], [5, "금"]];
const BASE_DEF = { start: "08:30", end: "13:30" };

const card = { background: C.grayBg, borderRadius: 16, padding: 16, border: `1px solid ${C.grayLine}` };
const grayBtn = { background: C.gray, color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, cursor: "pointer" };

// 설정 화면 (카테고리 리스트 → 탭하면 상세)
export default function SettingsView({
  dayDefaults, setDayDefaults,
  account, setAccount, showHolidays, setShowHolidays,
  auth, cloud, onBackup, onRestore, onLogout, onBack,
}) {
  const [selDow, setSelDow] = useState(1);
  const [openCat, setOpenCat] = useState(null);
  const cur = (dayDefaults && dayDefaults[selDow]) || BASE_DEF;
  const updateDow = (field, v) =>
    setDayDefaults((p) => ({ ...p, [selDow]: { ...((p && p[selDow]) || BASE_DEF), [field]: v } }));

  const CATS = [
    { key: "work", icon: "⏰", title: "근무 기본값", desc: "요일별 출·퇴근 시간" },
    { key: "summary", icon: "💰", title: "정리본", desc: "입금 계좌" },
    { key: "calendar", icon: "📅", title: "달력 표시", desc: "공휴일 표시" },
    { key: "backup", icon: "☁️", title: "클라우드 백업", desc: "백업 · 복구" },
    { key: "account", icon: "👤", title: "계정", desc: auth.name },
  ];
  const active = CATS.find((c) => c.key === openCat);

  return (
    <>
      {/* 헤더: 리스트면 ←=달력, 상세면 ←=설정(리스트) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <button onClick={openCat ? () => setOpenCat(null) : onBack}
          aria-label={openCat ? "설정" : "달력"} style={iconBtn}>←</button>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.grayDark, display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 24, lineHeight: 1 }}>{active ? active.icon : "⚙"}</span>
          {active ? active.title : "설정"}
        </div>
      </div>

      {/* 카테고리 리스트 */}
      {!openCat && (
        <div style={{ ...card, padding: 0, overflow: "hidden" }}>
          {CATS.map((c, i) => (
            <button key={c.key} aria-label={c.title} onClick={() => setOpenCat(c.key)} style={{
              width: "100%", display: "flex", alignItems: "center", gap: 13, padding: "16px 16px",
              background: "transparent", cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              border: "none", borderTop: i === 0 ? "none" : `1px solid ${C.grayLine}` }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{c.icon}</span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 18, fontWeight: 800, color: C.grayDark }}>{c.title}</span>
                <span style={{ display: "block", fontSize: 13, color: C.gray, marginTop: 2,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.desc}</span>
              </span>
              <span style={{ fontSize: 22, color: C.gray, lineHeight: 1 }}>›</span>
            </button>
          ))}
        </div>
      )}

      {/* 상세: 근무 기본값(요일별) */}
      {openCat === "work" && (
        <div style={card}>
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
        </div>
      )}

      {/* 상세: 정리본 */}
      {openCat === "summary" && (
        <div style={card}>
          <div style={{ fontSize: 13, color: C.gray, fontWeight: 700, marginBottom: 6 }}>입금 계좌</div>
          <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="입금 계좌"
            style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.grayLine}`, borderRadius: 10,
              padding: "12px 12px", fontSize: 16, color: C.ink, background: C.card }} />
          <div style={{ fontSize: 12, color: C.gray, marginTop: 8 }}>정리본 맨 아래에 표시돼요.</div>
        </div>
      )}

      {/* 상세: 달력 표시 */}
      {openCat === "calendar" && (
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.grayDark }}>공휴일 표시</span>
            <button onClick={() => setShowHolidays((v) => !v)} style={{
              width: 52, height: 30, borderRadius: 16, border: "none", cursor: "pointer", padding: 3,
              background: showHolidays ? C.gray : C.grayLine, display: "flex",
              justifyContent: showHolidays ? "flex-end" : "flex-start", transition: "background .15s" }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "block" }} />
            </button>
          </div>
        </div>
      )}

      {/* 상세: 클라우드 백업 */}
      {openCat === "backup" && (
        <>
          <div style={card}>
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
          </div>
          <div style={{ fontSize: 13, color: C.gray, textAlign: "center", lineHeight: 1.6, marginTop: 14 }}>
            기록은 이 기기에 저장되고, 클라우드 자동 백업은 <b>하루 1번</b>만 됩니다.
            그날 추가로 바꾼 내용을 바로 저장하려면 <b>“지금 백업”</b>을 눌러주세요.
          </div>
        </>
      )}

      {/* 상세: 계정 */}
      {openCat === "account" && (
        <div style={card}>
          <div style={{ fontSize: 15, color: C.gray, marginBottom: 12 }}>
            로그인 계정: <b style={{ color: C.ink }}>{auth.name}</b>
          </div>
          <button onClick={onLogout} style={{ ...ghostBtn, width: "100%", padding: "12px 0",
            fontSize: 15, color: C.gray, border: `1px solid ${C.grayLine}` }}>
            로그아웃
          </button>
        </div>
      )}
    </>
  );
}
