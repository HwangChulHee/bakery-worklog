import { useState, useEffect, useRef } from "react";
import { restoreFromCloud } from "./cloud";
import { C, FONT, iconBtn, primaryBtn } from "./theme";
import { keyOf as wKeyOf, getWeeks, monthTotal as wMonthTotal, buildSummary } from "./worklog";
import { hoursOf } from "./time";
import { useLocalStorage } from "./useLocalStorage";
import { useDailyBackup } from "./useDailyBackup";
import LoginScreen from "./LoginScreen";
import SplashScreen from "./SplashScreen";
import MonthView from "./MonthView";
import WeekView from "./WeekView";
import EditorSheet from "./EditorSheet";
import SettingsView from "./SettingsView";

/* ────────────────────────────────────────────────────────────
   빵집 근무시간 정리 앱
   - 날짜 탭 → 출/퇴근 입력 → 일·주·월 자동 집계
   - "정리본" 텍스트 생성 + 복사
   - 자동저장(localStorage) + 로그인/클라우드 백업 + PWA
   ──────────────────────────────────────────────────────────── */

const SPLASH_MS = 1100;

export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed

  // 자동저장 대상
  const [entries, setEntries] = useLocalStorage("entries", {}); // { "2026-6-1": {start,end} | {off:true} }
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
  const [booting, setBooting] = useState(true);
  const [installEvt, setInstallEvt] = useState(null); // 설치 가능 시 beforeinstallprompt 이벤트

  const weeks = getWeeks(year, month);
  const monthTotal = wMonthTotal(entries, year, month);
  const editKey = editing ? wKeyOf(editing.y, editing.m, editing.d) : null;

  // ── 날짜 편집 ──────────────────────────────
  const openEditor = (y, m, d) => {
    const e = entries[wKeyOf(y, m, d)];
    // 휴무({off:true})는 시간이 없으니 기본값으로 시작
    setDraft(e && e.start ? { start: e.start, end: e.end } : { start: defaultStart, end: defaultEnd });
    setEditing({ y, m, d });
  };
  const save = () => { setEntries((p) => ({ ...p, [editKey]: { start: draft.start, end: draft.end } })); setEditing(null); };
  const markOff = () => { setEntries((p) => ({ ...p, [editKey]: { off: true } })); setEditing(null); };
  const removeDay = () => { setEntries((p) => { const n = { ...p }; delete n[editKey]; return n; }); setEditing(null); };

  const shiftMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  };

  // ── 주간 보기 ──────────────────────────────
  const anchorDate = new Date(weekAnchor.y, weekAnchor.m, weekAnchor.d);
  const weekStart = new Date(anchorDate);
  weekStart.setDate(anchorDate.getDate() - anchorDate.getDay());
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const dt = new Date(weekStart); dt.setDate(weekStart.getDate() + i); return dt;
  });
  const weekTotal = weekDays.reduce((s, dt) => {
    const e = entries[wKeyOf(dt.getFullYear(), dt.getMonth(), dt.getDate())];
    return e ? s + hoursOf(e) : s;
  }, 0);
  const shiftWeek = (dir) => {
    const dt = new Date(weekStart); dt.setDate(weekStart.getDate() + dir * 7);
    setWeekAnchor({ y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() });
  };

  // ── 클라우드 백업(하루 1번) ──────────────────────────────
  const flushBackup = useDailyBackup({ auth, entries, account, defaultStart, defaultEnd, showHolidays, setCloud });

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
      if (e.message.includes("올바르지")) setLogin({ busy: false, error: e.message, offline: false });
      else setLogin({ busy: false, error: `서버 연결 오류: ${e.message}`, offline: true });
    }
  };
  // 서버 미설정/오프라인일 때 검증 없이 로컬로 진입
  const handleOffline = (name, password) => {
    setAuth({ name: name || "사용자", password: password || "" });
    setLogin({ busy: false, error: "", offline: false });
  };
  const logout = () => { setAuth(null); setCloud({ status: "", msg: "" }); setTab("cal"); };

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

  // 시작 스플래시 (자동 로그인은 localStorage 의 auth 로 처리)
  useEffect(() => {
    const t = setTimeout(() => setBooting(false), SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  // PWA 설치 가능 시 이벤트 보관 → 앱 내 "설치" 버튼으로 사용
  useEffect(() => {
    const onBIP = (e) => { e.preventDefault(); setInstallEvt(e); };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!installEvt) return;
    installEvt.prompt();
    try { await installEvt.userChoice; } catch { /* 무시 */ }
    setInstallEvt(null);
  };

  // Android 뒤로가기: 모달이 열려 있으면 닫고, 홈에서는 두 번 눌러야 종료
  const editingRef = useRef(editing);
  const tabRef = useRef(tab);
  const armedRef = useRef(false);
  const [exitToast, setExitToast] = useState(false);
  useEffect(() => { editingRef.current = editing; }, [editing]);
  useEffect(() => { tabRef.current = tab; }, [tab]);
  useEffect(() => {
    const guard = () => { try { window.history.pushState({ guard: true }, ""); } catch { /* 무시 */ } };
    guard(); // 뒤로가기를 잡아낼 항목 1개 유지
    const onPop = () => {
      if (editingRef.current != null) { setEditing(null); guard(); return; }   // 입력시트 닫기
      if (tabRef.current === "settings") { setTab("cal"); guard(); return; }    // 설정 닫기
      if (armedRef.current) { try { window.history.back(); } catch { /* 무시 */ } return; } // 두 번째 → 종료
      armedRef.current = true;                                                   // 첫 번째 → 안내
      setExitToast(true);
      guard();
      setTimeout(() => { armedRef.current = false; setExitToast(false); }, 2000);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const buildText = () => buildSummary({ entries, year, month, account });
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard 차단 시 미리보기에서 직접 복사 */ }
  };

  if (booting) return <SplashScreen />;
  if (!auth) {
    return (
      <LoginScreen onSubmit={handleLogin} onOffline={handleOffline}
        busy={login.busy} error={login.error} showOffline={login.offline} />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT,
      padding: "16px 16px 28px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 460, margin: "0 auto" }}>

        {tab === "cal" && (
          <>
            {/* 설치 가능할 때만 보이는 설치 버튼 */}
            {installEvt && (
              <button onClick={installApp} style={{ width: "100%", marginBottom: 10, padding: "12px 14px",
                borderRadius: 12, border: "none", cursor: "pointer", background: C.honey, color: "#fff",
                fontSize: 14, fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📲 홈 화면에 앱으로 설치</span>
                <span style={{ fontSize: 13, opacity: 0.9 }}>설치 ›</span>
              </button>
            )}
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
              <MonthView year={year} month={month} weeks={weeks} entries={entries}
                showHolidays={showHolidays} now={now} monthTotal={monthTotal}
                onShiftMonth={shiftMonth} onOpenDay={openEditor} />
            )}
            {view === "week" && (
              <WeekView weekDays={weekDays} entries={entries} showHolidays={showHolidays}
                now={now} weekTotal={weekTotal} onShiftWeek={shiftWeek} onOpenDay={openEditor} />
            )}

            {/* 정리본 */}
            <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.line}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 15 }}>정리본</span>
                <button onClick={copyText} style={{ ...primaryBtn, padding: "8px 16px" }}>
                  {copied ? "복사됨 ✓" : "복사하기"}
                </button>
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", textAlign: "left", fontSize: 13.5, lineHeight: 1.7,
                fontFamily: "'SF Mono', ui-monospace, Menlo, monospace", color: C.ink,
                background: C.bg, borderRadius: 10, padding: 14, border: `1px dashed ${C.line}` }}>
                {buildText()}
              </pre>
            </div>
          </>
        )}

        {tab === "settings" && (
          <SettingsView
            defaultStart={defaultStart} setDefaultStart={setDefaultStart}
            defaultEnd={defaultEnd} setDefaultEnd={setDefaultEnd}
            account={account} setAccount={setAccount}
            showHolidays={showHolidays} setShowHolidays={setShowHolidays}
            auth={auth} cloud={cloud}
            onBackup={() => flushBackup(true)} onRestore={doRestore}
            onLogout={logout} onBack={() => setTab("cal")} />
        )}
      </div>

      {editing != null && (
        <EditorSheet editing={editing} draft={draft} setDraft={setDraft}
          draftHours={hoursOf(draft)} hasEntry={!!entries[editKey]}
          onSave={save} onMarkOff={markOff} onRemove={removeDay} onClose={() => setEditing(null)} />
      )}

      {exitToast && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 24, display: "flex",
          justifyContent: "center", zIndex: 30, pointerEvents: "none" }}>
          <div style={{ background: "rgba(42,37,33,0.92)", color: "#fff", fontSize: 13, fontWeight: 700,
            padding: "10px 16px", borderRadius: 20 }}>
            한 번 더 누르면 종료됩니다
          </div>
        </div>
      )}
    </div>
  );
}
