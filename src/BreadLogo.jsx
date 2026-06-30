// 빵 로고 — 배경 일러스트와 같은 따뜻한 카툰풍(굵은 테두리) 캄파뉴
// 스플래시/로그인/파비콘/앱 아이콘 공용
export default function BreadLogo({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="빵">
      <defs>
        <radialGradient id="breadBody" cx="40%" cy="32%" r="80%">
          <stop offset="0%" stopColor="#F0C074" />
          <stop offset="55%" stopColor="#D7A04E" />
          <stop offset="100%" stopColor="#C4863A" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="104" rx="34" ry="6" fill="#0000000f" />
      {/* 둥근 캄파뉴 몸통 */}
      <path d="M60 30 C30 30 18 50 18 66 C18 86 36 96 60 96 C84 96 102 86 102 66 C102 50 90 30 60 30 Z"
        fill="url(#breadBody)" stroke="#5C3A1C" strokeWidth="4.5" strokeLinejoin="round" />
      {/* 가운데 칼집(슬래시) */}
      <path d="M34 60 Q60 50 86 60" stroke="#5C3A1C" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M40 60 Q43 70 40 80" stroke="#7A4E22" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M52 61 Q54 72 52 84" stroke="#7A4E22" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M68 61 Q66 72 68 84" stroke="#7A4E22" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      <path d="M80 60 Q77 70 80 80" stroke="#7A4E22" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
      {/* 윗면 하이라이트 */}
      <path d="M34 44 Q48 36 64 38" stroke="#F6D79B" strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.8" />
    </svg>
  );
}
