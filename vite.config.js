import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'icon-192.png', 'icon-512.png', 'bakery-bg.webp', 'bakery-logo.webp'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp}'],
        cleanupOutdatedCaches: true, // 옛 프리캐시 정리
        clientsClaim: true,          // 새 SW가 기존 탭 즉시 제어
        skipWaiting: true,           // 대기 없이 새 SW 활성화
      },
      manifest: {
        name: '빵집 근무시간',
        short_name: '근무시간',
        theme_color: '#CC8A3C',
        background_color: '#F6F1E9',
        display: 'standalone',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
