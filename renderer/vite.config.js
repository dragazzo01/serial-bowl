import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  publicDir: path.resolve(__dirname, '../public'),
  build: {
    outDir: '../dist/renderer',
    emptyOutDir: true
  },
  server: {
    port: 5173
  }
})