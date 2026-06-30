// 앱 공통 색상/폰트 (App, LoginScreen 공유)
export const C = {
  bg: "#F6F1E9", card: "#FFFFFF", ink: "#2A2521", sub: "#857A6D",
  line: "#E7DFD3", honey: "#CC8A3C", honeyDark: "#B0721E",
  workBg: "#FBEFD8", sun: "#C2453B", sat: "#2F6FB0", band: "#EFE5D3",
  offBg: "#ECE5D9", off: "#9A8C78",
};

export const FONT =
  "-apple-system, 'Apple SD Gothic Neo', 'Pretendard', system-ui, sans-serif";

// 공용 버튼/입력 스타일
export const navBtn = { width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.line}`,
  background: C.card, fontSize: 16, cursor: "pointer", color: C.ink };
export const iconBtn = { width: 40, height: 40, borderRadius: 12, border: `1px solid ${C.line}`,
  background: C.card, fontSize: 18, cursor: "pointer", color: C.ink,
  display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 };
export const primaryBtn = { background: C.honey, color: "#fff", border: "none", borderRadius: 12,
  fontWeight: 800, cursor: "pointer" };
export const ghostBtn = { background: C.card, color: C.sub, border: `1px solid ${C.line}`,
  borderRadius: 12, padding: "14px 0", fontSize: 16, fontWeight: 700, cursor: "pointer" };
export const timeBox = { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6,
  background: C.bg, border: `1px solid ${C.line}`, borderRadius: 12, padding: "10px 12px", boxSizing: "border-box" };
export const timeLabel = { fontSize: 12, color: C.sub, fontWeight: 700 };
export const timeInput = { width: "100%", maxWidth: "100%", boxSizing: "border-box", border: "none",
  background: "transparent", fontSize: 16, fontWeight: 700, color: C.ink, outline: "none" };
