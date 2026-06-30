import { pad } from "./time";
import { C } from "./theme";

// 큰 시/분 드롭다운 + 직접 입력(네이티브) 겸용 시간 선택기
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINS = Array.from({ length: 12 }, (_, i) => i * 5); // 0,5,...,55

const selStyle = {
  flex: 1, minWidth: 0, fontSize: 20, fontWeight: 800, color: C.ink,
  background: C.card, border: `1px solid ${C.line}`, borderRadius: 12,
  padding: "12px 8px", textAlign: "center", cursor: "pointer",
};

export default function TimeField({ label, value, onChange }) {
  const [h, m] = value.split(":").map(Number);
  // 직접 입력으로 들어온 5분 단위가 아닌 분도 목록에 보이게
  const mins = MINS.includes(m) ? MINS : [...MINS, m].sort((a, b) => a - b);
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, color: C.sub, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <select aria-label={`${label} 시`} value={h} style={selStyle}
          onChange={(e) => onChange(`${pad(Number(e.target.value))}:${pad(m)}`)}>
          {HOURS.map((x) => <option key={x} value={x}>{x}시</option>)}
        </select>
        <select aria-label={`${label} 분`} value={m} style={selStyle}
          onChange={(e) => onChange(`${pad(h)}:${pad(Number(e.target.value))}`)}>
          {mins.map((x) => <option key={x} value={x}>{pad(x)}분</option>)}
        </select>
      </div>
      <input type="time" aria-label={`${label} 직접 입력`} value={value}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        style={{ width: "100%", boxSizing: "border-box", marginTop: 8,
          border: `1px dashed ${C.line}`, borderRadius: 10, padding: "8px 10px",
          fontSize: 14, color: C.sub, background: C.bg }} />
    </div>
  );
}
