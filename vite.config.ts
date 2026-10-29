import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'prompt',
      injectRegister: false,
      devOptions: {
        enabled: process.env.ENABLE_PWA_DEV === 'true',
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      },
      manifest: {
        id: '/',
        name: 'FocusOS — Command Center',
        short_name: 'FocusOS',
        description: 'Your daily command center built for college life.',
        start_url: '/?source=pwa',
        display: 'standalone',
        orientation: 'any',
        theme_color: '#4f46e5',
        background_color: '#030712',
        categories: ['productivity', 'education'],
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Quick Capture',
            short_name: 'Add Task',
            url: '/?capture=1',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: 'Today View',
            short_name: 'Today',
            url: '/daily',
            icons: [{ src: '/pwa-192x192.png', sizes: '192x192' }],
          },
        ],
        share_target: {
          action: '/?share=1',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url',
          },
        },
      },
    }),
  ],
})
