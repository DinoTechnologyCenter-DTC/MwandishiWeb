import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';
import react from '@vitejs/plugin-react';

// Static hosts that serve 404.html for unknown paths need the SPA entry
// duplicated there, or BrowserRouter deep links (e.g. /new-cv) 404 on refresh.
// Harmless everywhere else.
const spa404 = () => ({
  name: 'spa-404-fallback',
  closeBundle: () => {
    try {
      copyFileSync(resolve(__dirname, 'dist/index.html'), resolve(__dirname, 'dist/404.html'));
    } catch (e) { /* ignore */ }
  },
});

export default defineConfig({
  // Served from the domain root at https://mwandishi.dtcwonders.online/
  base: '/',
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
