import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'frontend',
  publicDir: 'frontend/public',
  build: {
    outDir: '../dist'
  }
})
