import { useState, useEffect, useRef } from "react";
import { restoreFromCloud } from "./cloud";
import { C, FONT, iconBtn, primaryBtn, ghostBtn } from "./theme";
import { keyOf as wKeyOf, getWeeks, monthTotal as wMonthTotal, buildSummary, weeklyBreakdown } from "./worklog";
import { hoursOf, fmtHours } from "./time";
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
  // 월간/주간이 공유하는 단일 기준일
  const [anchor, setAnchor] = useState(() => {
    const t = new Date();
    return { y: t.getFullYear(), m: t.getMonth(), d: t.getDate() };
  });
  const year = anchor.y;
  const month = anchor.m;

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
  const [draft, setDraft] = useState({ start: defaultStart, end: defaultEnd, memo: "" });
  const [mode, setMode] = useState("work"); // "work" | "off"
  const [copied, setCopied] = useState(false);
  const [cloud, setCloud] = useState({ status: "", msg: "" }); // "", saving, saved, restoring, restored, error
  const [login, setLogin] = useState({ busy: false, error: "", offline: false });
  const [booting, setBooting] = useState(true);
  const [installEvt, setInstallEvt] = useState(null); // 설치 가능 시 beforeinstallprompt 이벤트
  const [snack, setSnack] = useState(null); // { msg, undo } | null

  const weeks = getWeeks(year, month);
  const monthTotal = wMonthTotal(entries, year, month);
  const editKey = editing ? wKeyOf(editing.y, editing.m, editing.d) : null;

  // ── 날짜 편집 ──────────────────────────────
  const openEditor = (y, m, d) => {
    const e = entries[wKeyOf(y, m, d)];
    // 휴무({off:true})는 시간이 없으니 기본값으로 시작
    setDraft({
      start: e && e.start ? e.start : defaultStart,
      end: e && e.end ? e.end : defaultEnd,
      memo: (e && e.memo) || "",
    });
    setMode(e && e.off ? "off" : "work");
    setEditing({ y, m, d });
  };
  // 되돌리기(Undo) 스낵바
  const snackTimer = useRef(null);
  const showSnack = (msg, undo) => {
    setSnack({ msg, undo });
    if (snackTimer.current) clearTimeout(snackTimer.current);
    snackTimer.current = setTimeout(() => setSnack(null), 4000);
  };
  const undoSnack = () => {
    if (snack && snack.undo) snack.undo();
    setSnack(null);
    if (snackTimer.current) clearTimeout(snackTimer.current);
  };

  // 날짜 기록 적용 + 되돌리기 제공
  const applyEntry = (value, msg) => {
    const key = editKey;
    const prev = entries[key];
    setEntries((p) => { const n = { ...p }; if (value === null) delete n[key]; else n[key] = value; return n; });
    setEditing(null);
    showSnack(msg, () => setEntries((p) => {
      const n = { ...p }; if (prev === undefined) delete n[key]; else n[key] = prev; return n;
    }));
  };
  const memoVal = () => (draft.memo && draft.memo.trim() ? { memo: draft.memo.trim() } : {});
  // 현재 토글/입력값으로 만든 기록
  const entryFromDraft = () => (mode === "off"
    ? { off: true, ...memoVal() }
    : { start: draft.start, end: draft.end, ...memoVal() });
  const save = (value) => applyEntry(value, value.off ? "휴무로 표시했어요" : "저장했어요");
  const removeDay = () => applyEntry(null, "기록을 삭제했어요");
  // 바깥 탭/뒤로가기로 나가면 저장하지 않고 그냥 닫기 (저장은 저장 버튼으로만)
  const closeEditor = () => setEditing(null);

  const shiftMonth = (dir) => {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    const dim = new Date(y, m + 1, 0).getDate(); // 새 달 일수에 맞춰 day 클램프
    setAnchor({ y, m, d: Math.min(anchor.d, dim) });
  };
  const goToday = () => setAnchor({ y: now.getFullYear(), m: now.getMonth(), d: now.getDate() });

  // ── 주간 보기 ──────────────────────────────
  const anchorDate = new Date(anchor.y, anchor.m, anchor.d);
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
    const dt = new Date(anchor.y, anchor.m, anchor.d); dt.setDate(dt.getDate() + dir * 7);
    setAnchor({ y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate() });
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
  const breakdown = weeklyBreakdown(entries, year, month);
  const breakdownTotal = breakdown.reduce((s, w) => s + w.total, 0);
  const fmtN = (h) => (Number.isInteger(h) ? `${h}` : h.toFixed(1));
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(buildText());
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard 차단 시 미리보기에서 직접 복사 */ }
  };
  // 공유: 지원하면 공유 시트(카톡 등), 아니면 복사로 폴백
  const shareText = async () => {
    const text = buildText();
    if (navigator.share) { try { await navigator.share({ text }); } catch { /* 취소 무시 */ } }
    else copyText();
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
                fontSize: 15, fontWeight: 800, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>📲 홈 화면에 앱으로 설치</span>
                <span style={{ fontSize: 14, opacity: 0.9 }}>설치 ›</span>
              </button>
            )}
            {/* 상단: 보기 토글 + 설정 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", background: C.card, border: `1px solid ${C.line}`, borderRadius: 10, overflow: "hidden" }}>
                {[["month", "월간"], ["week", "주간"]].map(([k, label]) => (
                  <button key={k} onClick={() => setView(k)} style={{
                    padding: "13px 26px", border: "none", cursor: "pointer", fontSize: 18, fontWeight: 800,
                    background: view === k ? C.honey : "transparent", color: view === k ? "#fff" : C.sub }}>
                    {label}
                  </button>
                ))}
              </div>
              <button onClick={() => setTab("settings")} aria-label="설정"
                style={{ ...iconBtn, width: "auto", height: 50, padding: "0 18px", gap: 7, fontSize: 18, fontWeight: 800 }}>
                <span style={{ fontSize: 22, lineHeight: 1 }}>⚙</span><span>설정</span>
              </button>
            </div>

            <div>
              {view === "month" && (
                <MonthView year={year} month={month} weeks={weeks} entries={entries}
                  showHolidays={showHolidays} now={now} monthTotal={monthTotal}
                  onShiftMonth={shiftMonth} onToday={goToday} onOpenDay={openEditor} />
              )}
              {view === "week" && (
                <WeekView weekDays={weekDays} entries={entries} showHolidays={showHolidays}
                  now={now} weekTotal={weekTotal} onShiftWeek={shiftWeek} onToday={goToday} onOpenDay={openEditor} />
              )}
            </div>

            {/* 정리본 */}
            <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.line}`, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontWeight: 800, fontSize: 17, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 18, lineHeight: 1 }}>📋</span>정리본
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={shareText} style={{ ...primaryBtn, padding: "12px 22px", fontSize: 17 }}>공유</button>
                  <button onClick={copyText} style={{ ...ghostBtn, padding: "12px 20px", fontSize: 17 }}>
                    {copied ? "복사됨 ✓" : "복사"}
                  </button>
                </div>
              </div>
              <pre style={{ margin: 0, whiteSpace: "pre-wrap", textAlign: "left", fontSize: 21, lineHeight: 1.7,
                fontFamily: "'SF Mono', ui-monospace, Menlo, monospace", color: C.ink,
                background: C.bg, borderRadius: 10, padding: 14, border: `1px dashed ${C.line}` }}>
                {buildText()}
              </pre>
            </div>

            {/* 주차별 계산 (검산) */}
            {breakdown.length > 0 && (
              <div style={{ background: C.card, borderRadius: 16, padding: 16, border: `1px solid ${C.line}` }}>
                <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 19, lineHeight: 1 }}>🧮</span>주차별 계산
                </div>

                {breakdown.map((w, i) => {
                  // 근무/휴무를 날짜순으로 한 줄씩 나열
                  const rows = [
                    ...w.days.map((x) => ({ ...x, off: false })),
                    ...w.offs.map((x) => ({ ...x, off: true })),
                  ].sort((a, b) => a.d - b.d);
                  return (
                    <div key={i} style={{ marginBottom: 22 }}>
                      {/* 주 헤더: N주차 ... 합계 */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 19, fontWeight: 800, color: C.honeyDark,
                          background: C.workBg, borderRadius: 8, padding: "5px 16px" }}>{i + 1}주차</span>
                        <span style={{ fontSize: 24, fontWeight: 800, color: C.honeyDark }}>{fmtHours(w.total)}</span>
                      </div>
                      {/* 날짜순 나열 (메모는 아랫줄) */}
                      {rows.map((r, ri) => (
                        <div key={r.d} style={{ padding: "9px 2px",
                          borderTop: ri === 0 ? "none" : `1px solid ${C.bg}` }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                            <span style={{ fontSize: 22, fontWeight: 600, color: r.off ? C.off : C.ink }}>
                              {month + 1}/{r.d} ({r.dow})
                            </span>
                            <span style={{ fontSize: 22, fontWeight: 800, color: r.off ? C.off : C.honeyDark }}>
                              {r.off ? "휴무" : `${fmtN(r.hours)}h`}
                            </span>
                          </div>
                          {r.memo && (
                            <div style={{ marginTop: 4, fontSize: 17, fontWeight: 600, color: C.note,
                              lineHeight: 1.4 }}>{r.memo}</div>
                          )}
                        </div>
                      ))}
                      {/* 검산식 */}
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${C.line}`,
                        fontFamily: "'SF Mono', ui-monospace, Menlo, monospace", fontSize: 19, color: C.sub }}>
                        {w.hrs.map(fmtN).join(" + ")} = <b style={{ color: C.honeyDark }}>{fmtHours(w.total)}</b>
                      </div>
                    </div>
                  );
                })}

                {/* 전체 합계 */}
                {breakdown.length > 1 && (
                  <div style={{ marginTop: 4, paddingTop: 14, borderTop: `2px solid ${C.line}`,
                    display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 21, fontWeight: 800 }}>합계</span>
                    <span style={{ fontFamily: "'SF Mono', ui-monospace, Menlo, monospace", fontSize: 19, color: C.sub }}>
                      {breakdown.map((w) => fmtN(w.total)).join(" + ")} = <b style={{ color: C.honeyDark, fontSize: 24 }}>{fmtHours(breakdownTotal)}</b>
                    </span>
                  </div>
                )}
              </div>
            )}
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
        <EditorSheet key={editKey} editing={editing} draft={draft} setDraft={setDraft}
          mode={mode} setMode={setMode} draftHours={hoursOf(draft)} entry={entries[editKey] || null}
          onSave={() => save(entryFromDraft())} onRemove={removeDay} onClose={closeEditor} />
      )}

      {snack && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 24, display: "flex",
          justifyContent: "center", zIndex: 31, pointerEvents: "none", padding: "0 16px" }}>
          <div style={{ background: "rgba(42,37,33,0.95)", color: "#fff", fontSize: 15, fontWeight: 700,
            padding: "12px 12px 12px 18px", borderRadius: 22, display: "flex", alignItems: "center", gap: 12,
            pointerEvents: "auto", maxWidth: 460, width: "100%", boxSizing: "border-box", justifyContent: "space-between" }}>
            <span>{snack.msg}</span>
            {snack.undo && (
              <button onClick={undoSnack} style={{ background: "transparent", border: "none",
                color: "#F0C074", fontSize: 15, fontWeight: 800, cursor: "pointer", padding: "4px 8px" }}>
                되돌리기
              </button>
            )}
          </div>
        </div>
      )}

      {exitToast && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 24, display: "flex",
          justifyContent: "center", zIndex: 30, pointerEvents: "none" }}>
          <div style={{ background: "rgba(42,37,33,0.92)", color: "#fff", fontSize: 14, fontWeight: 700,
            padding: "11px 18px", borderRadius: 20 }}>
            한 번 더 누르면 종료됩니다
          </div>
        </div>
      )}
    </div>
  );
}
