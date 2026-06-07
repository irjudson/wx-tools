import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Prevent the SPA navigation fallback from swallowing API requests
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Never cache file downloads — streaming responses can't be cloned
            urlPattern: /^\/api\/weather\/export/,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^\/api\/weather\/current/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-current',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 1, maxAgeSeconds: 600 },
            },
          },
          {
            urlPattern: /^\/api\/weather\/readings/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'weather-readings',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 10, maxAgeSeconds: 300 },
            },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
