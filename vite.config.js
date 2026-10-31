import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    // Forward /api calls to the Google Earth Engine service (server/ee_server.py)
    proxy: {
      '/api': 'http://127.0.0.1:5001'
    }
  }
});

