import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-01-01',

  devtools: { enabled: false },

  srcDir: 'app/',
  serverDir: 'server/',
  dir: { public: '../public' },

  modules: ['@vite-pwa/nuxt'],

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || '',
    pgliteDir: process.env.PGLITE_DIR || '.data/pglite',
    storePinHash: process.env.STORE_PIN_HASH || '',
    sessionSecret: process.env.SESSION_SECRET || 'dev-only-insecure-secret',
  },

  nitro: {
    experimental: {
      wasm: true,
    },
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Sari-Sari Store',
      short_name: 'SariSari',
      description: 'Inventory, sales, and profit tracking for a sari-sari store',
      theme_color: '#16a34a',
      background_color: '#ffffff',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      navigateFallback: '/',
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
    },
    devOptions: {
      enabled: false,
    },
  },

  app: {
    head: {
      viewport: 'width=device-width, initial-scale=1, viewport-fit=cover',
      meta: [{ name: 'theme-color', content: '#16a34a' }],
      link: [{ rel: 'icon', type: 'image/png', href: '/icons/icon-192.png' }],
    },
  },

  typescript: {
    strict: true,
  },
})
