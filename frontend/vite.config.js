import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';
import react from '@vitejs/plugin-react';

// gh-pages serves 404.html for unknown paths: duplicate the SPA entry so
// BrowserRouter deep links (e.g. /MrCVWeb/new-cv) resolve on refresh.
const spa404 = () => ({
  name: 'spa-404-fallback',
  closeBundle: () => {
    try {
      copyFileSync(resolve(__dirname, 'dist/index.html'), resolve(__dirname, 'dist/404.html'));
    } catch (e) { /* ignore */ }
  },
});

export default defineConfig({
  // '/' locally; '/MrCVWeb/' for gh-pages project hosting (GHPAGES=1).
  // Absolute base keeps deep BrowserRouter routes working in production.
  base: process.env.GHPAGES ? '/MrCVWeb/' : '/',
  root: resolve(__dirname, 'src'),
  plugins: [react(), spa404()],
  server: {
    host: true,
    port: 3000,
    hot: true,
    open: true,
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app', '.ngrok.io', '.ngrok.dev', '.ngrok.app'],
  },
  css: {
    preprocessorOptions: {
      scss: {},
    },
  },
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/js/[name].js',
        entryFileNames: 'assets/js/[name].js',
        assetFileNames: ({ name }) => {
          if (/\.(gif|jpe?g|png|svg)$/.test(name ?? '')) {
            return 'assets/images/[name][extname]';
          }
          if (/\.css$/.test(name ?? '')) {
            return 'assets/css/[name][extname]';
          }
          return 'assets/[name][extname]';
        },
      },
    },
  },
});
