import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['framer-motion', 'lucide-react', '@emotion/react'],
          'vendor-charts': ['recharts'],
          'vendor-maps': ['@react-google-maps/api'],
          'vendor-data': ['@tanstack/react-query', 'axios', 'zod', 'zustand'],
        },
      },
    },
  },
})
