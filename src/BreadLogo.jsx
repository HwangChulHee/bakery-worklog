// 식빵 로고 (스플래시 / 로그인 화면 / 파비콘 / 앱 아이콘 공용)
export default function BreadLogo({ size = 120 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg"
      role="img" aria-label="식빵">
      {/* 바닥 그림자 */}
      <ellipse cx="60" cy="101" rx="38" ry="6" fill="#0000000f" />
      {/* 식빵 전체(크러스트): 사각 몸통 + 부드러운 윗면 */}
      <path d="M16 86 L16 60 C16 44 28 38 60 38 C92 38 104 44 104 60 L104 86 Q104 92 98 92 L22 92 Q16 92 16 86 Z"
        fill="#C9893C" />
      {/* 아래 속살(밝은 부분) */}
      <path d="M17 74 C40 68 80 68 103 74 L103 86 Q103 91 98 91 L22 91 Q17 91 17 86 Z" fill="#F2E2BB" />
      {/* 윗면 하이라이트 */}
      <path d="M27 58 C31 46 45 42 60 42 C75 42 89 46 93 58 C78 52 42 52 27 58 Z" fill="#DCA75A" />
    </svg>
  );
}
