import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA 자동 갱신: 앱을 종료하지 않아도 새 배포를 감지해 반영
// - 주기적으로/다시 볼 때 서비스워커 업데이트 확인
// - 새 서비스워커가 제어권을 잡으면(=새 배포 활성화) 한 번만 새로고침
if ('serviceWorker' in navigator) {
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
  navigator.serviceWorker.ready.then((reg) => {
    const check = () => reg.update().catch(() => {})
    setInterval(check, 60 * 1000) // 1분마다 확인
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check() // 앱 다시 볼 때 확인
    })
  }).catch(() => {})
}
