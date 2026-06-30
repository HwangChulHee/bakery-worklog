import { C, FONT } from "./theme";
import BreadLogo from "./BreadLogo";

// 앱 시작 시 잠깐 보이는 스플래시 화면
export default function SplashScreen() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: FONT,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <style>{`
        @keyframes breadBob { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-10px) } }
        @keyframes breadFade { from{ opacity: 0 } to{ opacity: 1 } }
      `}</style>
      <div style={{ animation: "breadBob 1.1s ease-in-out infinite" }}>
        <BreadLogo size={132} />
      </div>
      <div style={{ animation: "breadFade .6s ease both", textAlign: "center" }}>
        <div style={{ fontSize: 24, fontWeight: 800 }}>빵집 근무시간</div>
        <div style={{ fontSize: 13, color: C.sub, marginTop: 4 }}>잠시만요…</div>
      </div>
    </div>
  );
}
