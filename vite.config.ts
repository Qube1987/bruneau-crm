import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['crm-android-chrome-512x512_(1).png'],
      manifest: {
        name: 'CRM Bruneau Protection',
        short_name: 'CRM',
        description: 'CRM Bruneau Protection',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/crm-android-chrome-512x512_(1).png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/crm-android-chrome-512x512_(1).png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  server: {
    proxy: {
      '/extrabat-api': {
        target: 'https://api.extrabat.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/extrabat-api/, ''),
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
