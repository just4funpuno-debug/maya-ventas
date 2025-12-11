import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

console.log('[vite.config] Configuración cargada - 100% Supabase');

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Permitir conexiones desde la red local (para probar en móvil)
    port: 5173
  },
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
