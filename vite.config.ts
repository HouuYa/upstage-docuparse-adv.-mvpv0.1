
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0', // Expose to network if needed
      proxy: {
        // Unified Proxy for all Upstage APIs
        // Maps /api/upstage/* -> https://api.upstage.ai/v1/*
        '/api/upstage': {
          target: 'https://api.upstage.ai',
          changeOrigin: true,
          secure: false,
          timeout: 300000,
          proxyTimeout: 300000,
          rewrite: (path) => path.replace(/^\/api\/upstage/, '/v1'),
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.error('Proxy Error:', err);
            });
          },
        },
      },
    },
    plugins: [react()],
  };
});
