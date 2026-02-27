import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
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
