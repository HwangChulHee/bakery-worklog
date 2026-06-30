import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// 테스트는 PWA 플러그인 없이 (서비스워커 주입과 무관하게) 실행
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.js'],
    css: false,
  },
})
