/// <reference types="vitest" />


import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,           // 👈 this makes `expect` available
    environment: 'jsdom',    // 👈 this mimics the browser
    setupFiles: './src/setupTests.ts',// 👈 optional, for custom setup like jest-dom
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
      reporter: ['text', 'lcov'],
    },
  },
})


//working with  vite