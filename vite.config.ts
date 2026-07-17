
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Load env variables
  const env = loadEnv(mode, __dirname, '');
  const isDev = mode === 'development';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      // Fix: Explicit HMR config so Vite doesn't use the base path for its WS connection
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 3000,
      },
    },
    plugins: [react()],
    optimizeDeps: {
      include: ['react-window'],
    },
    // Use '/' in dev (HMR needs root), '/Order_System/' in prod (GitHub Pages)
    base: isDev ? '/' : '/Order_System/',
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
  };
});
