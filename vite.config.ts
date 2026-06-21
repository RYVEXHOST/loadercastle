import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 3000,
  },
  preview: {
    port: 4173,
  },
});
