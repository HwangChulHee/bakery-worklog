// 귀여운 빵 로고 (스플래시 / 로그인 화면 공용)
export default function BreadLogo({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="빵">
      {/* 바닥 그림자 */}
      <ellipse cx="60" cy="103" rx="33" ry="6" fill="#00000012" />

      {/* 빵 몸통 */}
      <path d="M20 72 Q20 36 60 36 Q100 36 100 72 L100 80 Q100 92 88 92 L32 92 Q20 92 20 80 Z"
        fill="#CC8A3C" />
      {/* 부드러운 윗면 하이라이트 */}
      <path d="M27 66 Q30 44 60 44 Q90 44 93 66 Q76 58 60 58 Q44 58 27 66 Z" fill="#E2AB60" />
      {/* 칼집(스코어) */}
      <path d="M40 56 Q46 50 52 56" stroke="#B0721E" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M68 56 Q74 50 80 56" stroke="#B0721E" strokeWidth="3" fill="none" strokeLinecap="round" />
      {/* 아래 크러스트 */}
      <rect x="20" y="83" width="80" height="9" rx="4.5" fill="#B0721E" />

      {/* 볼터치 */}
      <circle cx="40" cy="77" r="4.5" fill="#E68A6A" opacity="0.45" />
      <circle cx="80" cy="77" r="4.5" fill="#E68A6A" opacity="0.45" />
      {/* 눈 */}
      <circle cx="49" cy="70" r="3.8" fill="#3A2A18" />
      <circle cx="71" cy="70" r="3.8" fill="#3A2A18" />
      <circle cx="50.2" cy="68.8" r="1.2" fill="#fff" />
      <circle cx="72.2" cy="68.8" r="1.2" fill="#fff" />
      {/* 입 */}
      <path d="M54 78 Q60 84 66 78" stroke="#3A2A18" strokeWidth="3" fill="none" strokeLinecap="round" />
    </svg>
  );
}
