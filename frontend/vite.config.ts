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
  server: {
    port: 5173,
    strictPort: true,
  },
  // define: { 'global': 'globalThis' } -> Removed to avoid conflict with vite-plugin-node-polyfills
  define: {
    // 'process.env': {} // Handled by plugin
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
    sourcemap: false, // Disable sourcemaps in production for smaller bundles
    target: 'esnext', // Modern browsers — enables smaller output
    cssCodeSplit: true, // Split CSS per chunk for better caching
    minify: 'esbuild', // Fastest minification
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React Ecosystem (React + Router + State + Query + UI Libs)
          // Grouping these prevents issues where a lib tries to use React before it's initialized
          if (id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router-dom') ||
            id.includes('node_modules/zustand') ||
            id.includes('node_modules/@tanstack') ||
            id.includes('node_modules/framer-motion') ||
            id.includes('node_modules/lucide-react') ||
            id.includes('node_modules/clsx') ||
            id.includes('node_modules/tailwind-merge')) {
            return 'vendor-core';
          }

          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }
          if (id.includes('node_modules/@react-google-maps')) {
            return 'vendor-maps';
          }

          // Other heavy data libs
          if (id.includes('node_modules/axios') || id.includes('node_modules/zod')) {
            return 'vendor-libs';
          }

          // Security & validation libs
          if (id.includes('node_modules/dompurify')) {
            return 'vendor-security';
          }

          // Web3 & Auth - Let Vite handle these completely
          // Manual chunking caused circular dependency issues (Nt, $a initialization errors)
          if (id.includes('node_modules/@privy-io') ||
            id.includes('node_modules/@reown') ||
            id.includes('node_modules/@walletconnect') ||
            id.includes('node_modules/@web3modal') ||
            id.includes('node_modules/@solana') ||
            id.includes('node_modules/ethers')) {
            return null; // Let Vite split or bundle as needed
          }
        },
      },
    },
  },
})
