import { C, FONT } from "./theme";

// 앱 시작 시 잠깐 보이는 스플래시 — 베이커리 배경 + 앱 이름
export default function SplashScreen() {
  return (
    <div style={{ minHeight: "100vh", fontFamily: FONT, position: "relative",
      backgroundColor: C.bg,
      backgroundImage: "url(/bakery-bg.webp)", backgroundSize: "cover", backgroundPosition: "center",
      display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <style>{`@keyframes splashFade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}`}</style>
      {/* 가독성 오버레이 */}
      <div style={{ position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, rgba(40,28,16,0) 45%, rgba(40,28,16,0.6) 100%)" }} />
      <div style={{ position: "relative", textAlign: "center", paddingBottom: "14vh",
        animation: "splashFade .6s ease both" }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: "#fff",
          textShadow: "0 2px 10px rgba(0,0,0,.45)" }}>빵집 근무시간</div>
        <div style={{ fontSize: 14, color: "rgba(255,255,255,.92)", marginTop: 6,
          textShadow: "0 1px 6px rgba(0,0,0,.45)" }}>잠시만요…</div>
      </div>
    </div>
  );
}
