import { C, FONT } from "./theme";

// 앱 시작 시 잠깐 보이는 스플래시 — 베이커리 배경 + 바구니 로고 + 앱 이름
export default function SplashScreen() {
  return (
    <div style={{ minHeight: "100vh", fontFamily: FONT, position: "relative",
      backgroundColor: C.bg,
      backgroundImage: "url(/bakery-bg.webp)", backgroundSize: "cover", backgroundPosition: "center",
      display: "flex", alignItems: "center", justifyContent: "center" }}>
      <style>{`
        @keyframes splashFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes logoBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
      `}</style>
      {/* 가독성 오버레이 */}
      <div style={{ position: "absolute", inset: 0, background: "rgba(35,24,14,0.5)" }} />
      <div style={{ position: "relative", textAlign: "center", animation: "splashFade .6s ease both" }}>
        <img src="/bakery-logo.webp" alt="" width="200"
          style={{ display: "block", margin: "0 auto 14px", maxWidth: "62vw", height: "auto",
            filter: "drop-shadow(0 8px 20px rgba(0,0,0,.35))", animation: "logoBob 1.6s ease-in-out infinite" }} />
        <div style={{ fontSize: 30, fontWeight: 800, color: "#fff",
          textShadow: "0 2px 10px rgba(0,0,0,.45)" }}>빵집 근무시간</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.92)", marginTop: 6,
          textShadow: "0 1px 6px rgba(0,0,0,.45)" }}>잠시만요…</div>
      </div>
    </div>
  );
}
