import { useRef, useEffect, useCallback } from "react";
import { backupToCloud } from "./cloud";

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const readLastBackup = () => { try { return localStorage.getItem("lastBackupDate") || ""; } catch { return ""; } };
const writeLastBackup = (v) => { try { localStorage.setItem("lastBackupDate", v); } catch { /* 무시 */ } };

// 클라우드 자동백업(하루 1번) + 수동 백업(force). 상태는 setCloud 로 보고.
// 반환: flush(force) — 설정의 "지금 백업" 버튼이 flush(true) 로 호출.
export function useDailyBackup({ auth, entries, account, defaultStart, defaultEnd, showHolidays, setCloud }) {
  const authRef = useRef(auth);
  const snapRef = useRef(null);
  const dirtyRef = useRef(false);
  const didMount = useRef(false);

  useEffect(() => { authRef.current = auth; }, [auth]);
  useEffect(() => {
    snapRef.current = { entries, account, defaultStart, defaultEnd, showHolidays };
  }, [entries, account, defaultStart, defaultEnd, showHolidays]);

  const flush = useCallback(async (force = false) => {
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
  }, [setCloud]);

  // 변경되면 dirty 표시 + 8초 뒤 자동백업 시도(하루 1번). 첫 렌더는 건너뜀.
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; return; }
    if (!authRef.current || !authRef.current.password) return;
    dirtyRef.current = true;
    const t = setTimeout(() => flush(false), 8000);
    return () => clearTimeout(t);
  }, [entries, account, defaultStart, defaultEnd, showHolidays, flush]);

  // 앱을 백그라운드로 보내거나 닫을 때도 자동백업 시도(하루 1번 규칙 동일)
  useEffect(() => {
    const f = () => flush(false);
    const onVis = () => { if (document.visibilityState === "hidden") f(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", f);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", f);
    };
  }, [flush]);

  return flush;
}
