import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { setupAutoUpdate } from './pwa'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

setupAutoUpdate() // PWA 자동 갱신(앱 안 꺼도 새 배포 반영)
