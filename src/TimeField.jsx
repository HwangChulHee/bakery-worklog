import { pad } from "./time";
import { C } from "./theme";

// 큰 시/분 드롭다운 + 직접 입력(네이티브) 겸용 시간 선택기
// 8시~18시만 선택 (그 외 시간대 제외)
const HOURS = Array.from({ length: 11 }, (_, i) => i + 8); // 8,9,...,18
const MINS = [0, 30]; // 0분 / 30분만 선택

const selStyle = {
  flex: 1, minWidth: 0, fontSize: 22, fontWeight: 800, color: C.ink,
  background: C.card, border: `1px solid ${C.line}`, borderRadius: 12,
  padding: "14px 8px", textAlign: "center", cursor: "pointer",
};

export default function TimeField({ label, value, onChange, disabled = false, icon }) {
  const [h, m] = value.split(":").map(Number);
  // 기존에 저장된, 범위 밖 시/분도 그 값만은 목록에 보이게
  const hours = HOURS.includes(h) ? HOURS : [...HOURS, h].sort((a, b) => a - b);
  const mins = MINS.includes(m) ? MINS : [...MINS, m].sort((a, b) => a - b);
  return (
    <div style={{ minWidth: 0, opacity: disabled ? 0.4 : 1 }}>
      <div style={{ fontSize: 14, color: C.sub, fontWeight: 700, marginBottom: 6,
        display: "flex", alignItems: "center", gap: 5 }}>
        {icon && <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>}{label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <select aria-label={`${label} 시`} value={h} style={selStyle} disabled={disabled}
          onChange={(e) => onChange(`${pad(Number(e.target.value))}:${pad(m)}`)}>
          {hours.map((x) => <option key={x} value={x}>{x}시</option>)}
        </select>
        <select aria-label={`${label} 분`} value={m} style={selStyle} disabled={disabled}
          onChange={(e) => onChange(`${pad(h)}:${pad(Number(e.target.value))}`)}>
          {mins.map((x) => <option key={x} value={x}>{pad(x)}분</option>)}
        </select>
      </div>
    </div>
  );
}
