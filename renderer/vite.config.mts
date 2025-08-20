import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from "vite-plugin-pwa";
import path from 'path'

const BASEDIR = process.env.BASEDIR

export default defineConfig({
  plugins: [react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'favicon.ico',
        'robots.txt',
        'apple-touch-icon.png'
      ],
      manifest: {
        name: 'Serial Bowl',
        short_name: 'SerialBowl',
        description: 'Track serialized content like manga, manhwa, and web novels',
        theme_color: '#ffffff',
        start_url: '/index-pwa.html', // 🚨 point to your PWA-specific index
        display: 'standalone',
      }
    })
  ],
  base: BASEDIR,
  publicDir: path.resolve(__dirname, '../public'),
  build: {
    outDir: '../dist/renderer/',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        electron: path.resolve(__dirname, "index.html"), // for desktop
        pwa: path.resolve(__dirname, "index-pwa.html"),        // for mobile/PWA
      },
    },
  },
  server: {
    port: 5173
  }
})