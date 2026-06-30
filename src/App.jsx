import { useState, useEffect, useRef, useCallback } from "react";
import { holidayName } from "./holidays";
import { backupToCloud, restoreFromCloud } from "./cloud";
import { C, FONT } from "./theme";
import LoginScreen from "./LoginScreen";
import SplashScreen from "./SplashScreen";

const SPLASH_MS = 1100;
import { fmtClock, fmtHours, hoursOf } from "./time";
import { DOW, keyOf as wKeyOf, getWeeks, weekSum as wWeekSum, monthTotal as wMonthTotal, buildSummary } from "./worklog";

/* ────────────────────────────────────────────────────────────
   빵집 근무시간 정리 앱 (v2)
   - 날짜 탭 → 퇴근시간 선택(출근 기본값) → 자동 집계
   - 주차 소계 / 월 총합 자동 계산
   - "정리본" 텍스트를 어머니 형식 그대로 생성 + 복사
   - 자동저장(localStorage) / 공휴일 표시 / 설정 탭
   ──────────────────────────────────────────────────────────── */

// localStorage 자동저장 훅
function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial; }
    catch { return initial; }
  });
  const set = (v) => setVal((p) => {
    const next = typeof v === "function" ? v(p) : v;
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* 저장 실패 무시 */ }
    return next;
  });
  return [val, set];
}

// 하루 1번 자동백업 판단용
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const readLastBackup = () => { try { return localStorage.getItem("lastBackupDate") || ""; } catch { return ""; } };
const writeLastBackup = (v) => { try { localStorage.setItem("lastBackupDate", v); } catch { /* 무시 */ } };

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  // 자동저장 대상
  const [entries, setEntries] = useLocalStorage("entries", {}); // { "2026-6-1": {start,end} }
  const [account, setAccount] = useLocalStorage("account", "우리은행(01076004597)");
  const [defaultStart, setDefaultStart] = useLocalStorage("defaultStart", "08:30");
  const [defaultEnd, setDefaultEnd] = useLocalStorage("defaultEnd", "13:30");
  const [showHolidays, setShowHolidays] = useLocalStorage("showHolidays", true);
  const [auth, setAuth] = useLocalStorage("auth", null); // { name, password } | null

  const [tab, setTab] = useState("cal"); // "cal" | "settings"
  const [view, setView] = useState("month"); // "month" | "week"
  const [editing, setEditing] = useState(null); // { y, m, d } | null
  const [weekAnchor, setWeekAnchor] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
  });
  const [draft, setDraft] = useState({ start: defaultStart, end: defaultEnd });
  const [copied, setCopied] = useState(false);
  const [cloud, setCloud] = useState({ status: "", msg: "" }); // "", saving, saved, restoring, restored, error
  const [login, setLogin] = useState({ busy: false, error: "", offline: false });
  const [booting, setBooting] = useState(true); // 스플래시 표시 여부

  const keyOf = (d) => wKeyOf(year, month, d);
  const weeks = getWeeks(year, month);
  const weekSum = (week) => wWeekSum(entries, year, month, week);
  const monthTotal = wMonthTotal(entries, year, month);

  const editKey = editing ? wKeyOf(editing.y, editing.m, editing.d) : null;

  const openEditor = (y, m, d) => {
    const e = entries[wKeyOf(y, m, d)];
    // 휴무({off:true})는 시간이 없으니 기본값으로 시작
    setDraft(e && e.start ? { start: e.start, end: e.end } : { start: defaultStart, end: defaultEnd });
    setEditing({ y, m, d });
  };
  const save = () => {
    setEntries((p) => ({ ...p, [editKey]: { start: draft.start, end: draft.end } }));
    setEditing(null);
  };
  const markOff = () => {
    setEntries((p) => ({ ...p, [editKey]: { off: true } }));
    setEditing(null);
  };
  const removeDay = () => {
    setEntries((p) => { const n = { ...p }; delete n[editKey]; return n; });
    setEditing(null);
  };
  const shiftMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  // 주간 보기: 앵커가 속한 주(일~토)
  const anchorDate = new Date(weekAnchor.y, weekAnchor.m, weekAnchor.d);
  const weekStart = new Date(anchorDate);
  weekStart.setDate(anchorDate.getDate() - anchorDate.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(weekStart);
    dt.setDate(weekStart.getDate() + i);
    return dt;
  });
  const weekViewTotal = weekDays.reduce((s, dt) => {
    const e = entries[wKeyOf(dt.getFullYear(), dt.getMonth(), dt.getDate())];
    return e ? s + hoursOf(e) : s;
  }, 0);
  const shiftWeek = (dir) => {
    const dt = new Date(weekStart);
    dt.setDate(weekStart.getDate() + dir * 7);
    setWeekAnchor({ y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() });
  };

  // ── 클라우드 동기화 / 인증 ──────────────────────────────
  // 클라우드 동기화용 refs (최신 인증/상태/변경여부)
  const authRef = useRef(auth);
  const snapRef = useRef(null);
  const dirtyRef = useRef(false);
  const didMount = useRef(false);
  useEffect(() => { authRef.current = auth; }, [auth]);
  useEffect(() => {
    snapRef.current = { entries, account, defaultStart, defaultEnd, showHolidays };
  }, [entries, account, defaultStart, defaultEnd, showHolidays]);

  // 클라우드 저장. force=true(수동 버튼)면 항상, 자동이면 "하루 1번 + 변경분 있을 때"만.
  const flushBackup = useCallback(async (force = false) => {
    const a = authRef.current;
    if (!a || !a.password) { if (force) setCloud({ status: "error", msg: "로그인이 필요합니다" }); return; }
    const snap = snapRef.current;
    if (!snap) return;
    if (!force) {
      if (!dirtyRef.current) return;                  // 바뀐 게 없으면 안 함
      if (readLastBackup() === todayStr()) return;     // 오늘 이미 자동백업함
    }
    setCloud({ status: "saving", msg: "" });
    try {
      await backupToCloud(a.name, a.password, snap);
      dirtyRef.current = false;
      writeLastBackup(todayStr());
      setCloud({ status: "saved", msg: "" });
    } catch (e) {
      setCloud({ status: "error", msg: e.message });
    }
  }, []);

  const applyData = (data) => {
    if (!data) return;
    if (data.entries) setEntries(data.entries);
    if (data.account != null) setAccount(data.account);
    if (data.defaultStart) setDefaultStart(data.defaultStart);
    if (data.defaultEnd) setDefaultEnd(data.defaultEnd);
    if (typeof data.showHolidays === "boolean") setShowHolidays(data.showHolidays);
  };

  // 로그인: 서버로 비밀번호 검증 + 클라우드 데이터 불러오기
  const handleLogin = async (name, password) => {
    if (!name || !password) { setLogin({ busy: false, error: "이름과 비밀번호를 입력하세요", offline: false }); return; }
    setLogin({ busy: true, error: "", offline: false });
    try {
      const data = await restoreFromCloud(name, password);
      applyData(data);
      setAuth({ name, password });
      setLogin({ busy: false, error: "", offline: false });
    } catch (e) {
      if (e.message.includes("올바르지")) {
        setLogin({ busy: false, error: e.message, offline: false });
      } else {
        setLogin({ busy: false, error: `서버 연결 오류: ${e.message}`, offline: true });
      }
    }
  };

  // 서버 미설정/오프라인일 때 검증 없이 로컬로 진입
  const handleOffline = (name, password) => {
    setAuth({ name: name || "사용자", password: password || "" });
    setLogin({ busy: false, error: "", offline: false });
  };

  const logout = () => {
    setAuth(null);
    setCloud({ status: "", msg: "" });
    setTab("cal");
  };

  // 복구: 비밀번호 다시 입력 → 클라우드 데이터로 덮어쓰기
  const doRestore = async () => {
    if (!auth) return;
    const pw = window.prompt("복구하려면 비밀번호를 다시 입력하세요");
    if (pw == null || pw === "") return;
    setCloud({ status: "restoring", msg: "" });
    try {
      const data = await restoreFromCloud(auth.name, pw);
      if (!data) { setCloud({ status: "error", msg: "클라우드에 백업이 없습니다" }); return; }
      applyData(data);
      setCloud({ status: "restored", msg: "" });
    } catch (e) {
      setCloud({ status: "error", msg: e.message });
    }
  };

  // 변경되면 dirty 표시 + 잠시 뒤 자동백업 시도(하루 1번만 실제 저장). 첫 렌더는 건너뜀.
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    if (!authRef.current || !authRef.current.password) return; // 오프라인 진입이면 자동백업 안 함
    dirtyRef.current = true;
    const t = setTimeout(() => flushBackup(false), 8000);
    return () => clearTimeout(t);
  }, [entries, account, defaultStart, defaultEnd, showHolidays, flushBackup]);

  // 앱을 백그라운드로 보내거나 닫을 때도 자동백업 시도(하루 1번 규칙은 동일)
  useEffect(() => {
    const flush = () => flushBackup(false);
    const onVis = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", flush);
    };
  }, [flushBackup]);

  // 스플래시: 시작 시 잠깐 보여주고 내림 (자동 로그인은 localStorage 의 auth 로 처리)
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // 정리본 텍스트 생성 (어머니 형식)
  const buildText = () => buildSummary({ entries, year, month, account });

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard 차단 시 미리보기에서 직접 복사 */ }
  };

  const draftHours = hoursOf(draft);

  // 시작 스플래시
  if (booting) return <SplashScreen />;

  // 로그인 전에는 게이트 화면만 표시
  if (!auth) {
    return (
      <LoginScreen
        onSubmit={handleLogin}
        onOffline={handleOffline}
        busy={login.busy}
        error={login.error}
        showOffline={login.offline}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink,
      fontFamily: FONT,
      padding: "16px 16px 28px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>

        {tab === "cal" && (
          <>
            {/* 상단: 보기 토글 + 설정 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
                {[["month", "월간"], ["week", "주간"]].map(([k, label]) => (
                  <button key={k} onClick={() => setView(k)} style={{
                    padding: "8px 16px", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 800,
                    background: view === k ? C.honey : "transparent", color: view === k ? "#fff" : C.sub }}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={() => setTab("settings")} aria-label="설정" style={iconBtn}>⚙</button>
            </div>

            {view === "month" && (
            <>
            {/* 월 이동 헤더 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={() => shiftMonth(-1)} style={navBtn}>◀</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: C.sub, letterSpacing: 1 }}>{year}년</div>
                <div style={{ fontSize: 26, fontWeight: 800 }}>{month + 1}월 근무</div>
              </div>
              <button onClick={() => shiftMonth(1)} style={navBtn}>▶</button>
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
                const ws = weekSum(week);
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
                        <button key={di} onClick={() => openEditor(year, month, d)} title={hol || undefined}
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
            )}

            {view === "week" && (
            <>
            {/* 주 이동 헤더 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <button onClick={() => shiftWeek(-1)} style={navBtn}>◀</button>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: C.sub, letterSpacing: 1 }}>주간</div>
                <div style={{ fontSize: 20, fontWeight: 800 }}>
                  {weekDays[0].getMonth() + 1}/{weekDays[0].getDate()} ~ {weekDays[6].getMonth() + 1}/{weekDays[6].getDate()}
                </div>
              </div>
              <button onClick={() => shiftWeek(1)} style={navBtn}>▶</button>
            </div>

            {/* 주 총합 */}
            <div style={{ background: C.ink, color: "#fff", borderRadius: 16, padding: "14px 18px",
              display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
              <span style={{ fontSize: 14, opacity: 0.8 }}>이번 주 총 근무</span>
              <span style={{ fontSize: 28, fontWeight: 800 }}>{fmtHours(weekViewTotal)}</span>
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
                  <button key={`${y}-${m}-${d}`} onClick={() => openEditor(y, m, d)}
                    aria-label={`${m + 1}월 ${d}일${isOff ? " 휴무" : ""}`} style={{
                    width: "100%", boxSizing: "border-box", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 8, padding: "12px 12px", marginBottom: 4,
                    borderRadius: 12, cursor: "pointer", textAlign: "left",
                    border: isToday ? `2px solid ${C.honey}` : `1px solid ${C.line}`,
                    background: isOff ? C.offBg : e ? C.workBg : C.card }}>
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: dateColor }}>{m + 1}/{d} ({DOW[dow]})</span>
                      {hol && <span style={{ fontSize: 11, fontWeight: 700, color: C.sun }}>{hol}</span>}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 800, whiteSpace: "nowrap",
                      color: isOff ? C.off : e ? C.honeyDark : C.line }}>
                      {isOff ? "휴무" : e ? `${fmtClock(e.start)}~${fmtClock(e.end)} · ${fmtHours(hoursOf(e))}` : "—"}
                    </span>
                  </button>
                );
              })}
            </div>
            </>
            )}

            {/* 정리본 */}
            <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>정리본</span>
                <button onClick={copyText} style={{ ...primaryBtn, padding: "8px 16px" }}>
                  {copied ? "복사됨 ✓" : "복사하기"}
                </button>
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13.5, lineHeight: 1.7,
                fontFamily: "'SF Mono', ui-monospace, Menlo, monospace", color: C.ink,
                background: C.bg, borderRadius: 10, padding: 14, border: `1px dashed ${C.line}` }}>
                {buildText()}
              </pre>
            </div>
          </>
        )}

        {tab === "settings" && (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <button onClick={() => setTab("cal")} aria-label="달력" style={iconBtn}>←</button>
              <div style={{ fontSize: 24, fontWeight: 800 }}>설정</div>
            </div>

            <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.line}`, marginBottom: 16 }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                <label style={timeBox}>
                  <span style={timeLabel}>기본 출근시간</span>
                  <input type="time" value={defaultStart} onChange={(e) => setDefaultStart(e.target.value)} style={timeInput} />
                </label>
                <label style={timeBox}>
                  <span style={timeLabel}>기본 퇴근시간</span>
                  <input type="time" value={defaultEnd} onChange={(e) => setDefaultEnd(e.target.value)} style={timeInput} />
                </label>
              </div>

              <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginBottom: 6 }}>입금 계좌</div>
              <input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="입금 계좌"
                style={{ width: "100%", boxSizing: "border-box", border: `1px solid ${C.line}`, borderRadius: 10,
                  padding: "10px 12px", fontSize: 14, marginBottom: 16, color: C.ink, background: C.bg }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>공휴일 표시</span>
                <button onClick={() => setShowHolidays((v) => !v)} style={{
                  width: 52, height: 30, borderRadius: 16, border: "none", cursor: "pointer", padding: 3,
                  background: showHolidays ? C.honey : C.line, display: "flex",
                  justifyContent: showHolidays ? "flex-end" : "flex-start", transition: "background .15s" }}>
                  <span style={{ width: 24, height: 24, borderRadius: "50%", background: "#fff", display: "block" }} />
                </button>
              </div>
            </div>

            {/* 클라우드 백업 / 계정 */}
            <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.line}`, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>클라우드 백업</div>
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 12 }}>
                로그인 계정: <b style={{ color: C.ink }}>{auth.name}</b>
                {!auth.password && <span style={{ color: C.sun }}> (오프라인 — 자동 백업 꺼짐)</span>}
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => flushBackup(true)}
                  style={{ ...primaryBtn, flex: 1, padding: "12px 0", fontSize: 15 }}>
                  지금 백업
                </button>
                <button onClick={doRestore}
                  style={{ ...ghostBtn, flex: 1, padding: "12px 0", fontSize: 15 }}>
                  복구
                </button>
              </div>

              {cloud.status && (
                <div style={{ marginTop: 10, fontSize: 13, fontWeight: 700,
                  color: cloud.status === "error" ? C.sun : C.honeyDark }}>
                  {cloud.status === "saving" && "백업 중…"}
                  {cloud.status === "saved" && "백업 완료 ✓"}
                  {cloud.status === "restoring" && "복구 중…"}
                  {cloud.status === "restored" && "복구 완료 ✓"}
                  {cloud.status === "error" && `오류: ${cloud.msg}`}
                </div>
              )}

              <button onClick={logout} style={{ ...ghostBtn, width: "100%", marginTop: 12, padding: "11px 0",
                fontSize: 14, color: C.sub }}>
                로그아웃
              </button>
            </div>

            <div style={{ fontSize: 12, color: C.sub, textAlign: "center", lineHeight: 1.6 }}>
              기록은 이 기기에 저장되고, 클라우드 자동 백업은 <b>하루 1번</b>만 됩니다.
              그날 추가로 바꾼 내용을 바로 저장하려면 <b>“지금 백업”</b>을 눌러주세요.
            </div>
          </>
        )}
      </div>

      {/* 입력 시트 */}
      {editing != null && (
        <div onClick={() => setEditing(null)} style={{ position: "fixed", inset: 0, zIndex: 20,
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
              <button onClick={markOff} style={{ ...ghostBtn, flex: 1 }}>휴무</button>
              <button onClick={save} style={{ ...primaryBtn, flex: 2, padding: "14px 0", fontSize: 16 }}>저장</button>
            </div>
            {entries[editKey] && (
              <button onClick={removeDay} style={{ ...ghostBtn, width: "100%", marginTop: 10, padding: "10px 0",
                fontSize: 14, color: C.sub, border: "none", background: "transparent" }}>
                기록 지우기
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn = { width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.line}`,
  background: C.card, fontSize: 16, cursor: "pointer", color: C.ink };
const iconBtn = { width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.line}`,
  background: C.card, fontSize: 18, cursor: "pointer", color: C.ink,
  display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 };
const primaryBtn = { background: C.honey, color: "#fff", border: "none", borderRadius: 12,
  fontWeight: 800, cursor: "pointer" };
const ghostBtn = { background: C.card, color: C.sub, border: `1px solid ${C.line}`,
  borderRadius: 12, padding: "14px 0", fontSize: 16, fontWeight: 700, cursor: "pointer" };
const timeBox = { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6,
  background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", boxSizing: "border-box" };
const timeLabel = { fontSize: 12, color: C.sub, fontWeight: 700 };
const timeInput = { width: "100%", maxWidth: "100%", boxSizing: "border-box", border: "none",
  background: "transparent", fontSize: 16, fontWeight: 700, color: C.ink, outline: "none" };
