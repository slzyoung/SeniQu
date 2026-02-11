import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Polyfill strictly for Web3 compatibility
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  base: '/', // Ensure absolute paths
  define: {
    'global': 'globalThis', // Polyfill for some Web3/older libs
    'process.env': {}, // Polyfill for libs accessing process.env
  },
  optimizeDeps: {
    include: [
      '@reown/appkit',
      '@reown/appkit/react',
      '@reown/appkit-adapter-solana',
      '@reown/appkit/networks',
      '@solana/wallet-adapter-wallets',
      '@solana/web3.js',
      'bs58',
      'buffer',
    ],
  },
  build: {
    chunkSizeWarningLimit: 4000, // Increased to accommodate combined Web3 chunk
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

          // Web3 & Auth (Unified Buffer to avoid circular deps)
          if (id.includes('node_modules/@privy-io') ||
            id.includes('node_modules/@solana') ||
            id.includes('node_modules/@reown') ||
            id.includes('node_modules/@walletconnect') ||
            id.includes('node_modules/@web3modal') ||
            id.includes('node_modules/viem') ||
            id.includes('node_modules/ethers') ||
            id.includes('node_modules/@ethersproject') ||
            id.includes('node_modules/bs58') ||
            id.includes('node_modules/buffer') ||
            id.includes('node_modules/elliptic') ||
            id.includes('node_modules/bn.js') ||
            id.includes('node_modules/ox')) {
            return 'vendor-web3';
          }
        },
      },
    },
  },
})
