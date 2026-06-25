import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API = 'http://localhost:4021';

export default defineConfig({
  root: 'web',
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': API,
      '/g': API,
      '/facilitator': API,
      '/health': API,
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
