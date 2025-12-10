import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

console.log('[vite.config] Configuración cargada - 100% Supabase');

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          motion: ["framer-motion"],
          recharts: ["recharts"],
          ui: ["lucide-react"],
          csv: ["papaparse"]
        }
      }
    },
    chunkSizeWarningLimit: 1600
  }
});
