import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor Layout & UI
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react') || id.includes('node_modules/@emotion')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/@react-google-maps')) {
            return 'vendor-maps';
          }

          // Data & Utils
          if (id.includes('node_modules/@tanstack') || id.includes('node_modules/axios') || id.includes('node_modules/zod') || id.includes('node_modules/zustand')) {
            return 'vendor-data';
          }
          if (id.includes('node_modules/clsx') || id.includes('node_modules/tailwind-merge')) {
            return 'vendor-utils';
          }

          // Auth & Web3
          if (id.includes('node_modules/@privy-io')) {
            return 'vendor-auth-privy';
          }
          // Group all other Web3 deps to avoid circular dependencies
          if (id.includes('node_modules/@solana') ||
            id.includes('node_modules/bs58') ||
            id.includes('node_modules/buffer-layout') ||
            id.includes('node_modules/viem') ||
            id.includes('node_modules/abitype') ||
            id.includes('node_modules/ethers') ||
            id.includes('node_modules/@ethersproject') ||
            id.includes('node_modules/@walletconnect') ||
            id.includes('node_modules/@web3modal') ||
            id.includes('node_modules/@base-org') ||
            id.includes('node_modules/ox')) {
            return 'vendor-web3';
          }
        },
      },
    },
  },
})
