import react from '@vitejs/plugin-react';

export default {
  plugins: [react()],
  server: {
    proxy: {
      // /api/v1/* → Spring Boot on port 8080, prefix kept intact
      '/api/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
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
