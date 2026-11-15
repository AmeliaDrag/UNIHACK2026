import react from '@vitejs/plugin-react';

export default {
  plugins: [react()],
  server: {
    proxy: {
      // Spring Boot REST API — /api/v1/* → backend port 8081
      '/api/v1': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      // All other /api/* requests → json-server on port 3001
      // The /api prefix is stripped so json-server sees /reports, /contacts, etc.
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Proxy Nominatim to avoid CORS issues in dev
      '/nominatim': {
        target: 'https://nominatim.openstreetmap.org',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/nominatim/, ''),
        headers: {
          'User-Agent': 'SafeWalk-dev/1.0',
        },
      },
    },
  },
};
