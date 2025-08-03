import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { copyFileSync } from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
    // Embed environment variables for production
    'import.meta.env.VITE_DISCORD_CLIENT_ID': JSON.stringify('1388207626944249856'),
    'import.meta.env.VITE_API_URL': JSON.stringify('https://api.opure.uk'),
    'import.meta.env.VITE_WS_URL': JSON.stringify('wss://api.opure.uk'),
    'import.meta.env.VITE_ENVIRONMENT': JSON.stringify('production'),
    'import.meta.env.VITE_DEBUG_MODE': JSON.stringify('false'),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          discord: ['@discord/embedded-app-sdk'],
          ui: ['framer-motion', '@headlessui/react'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
    cors: true,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@discord/embedded-app-sdk',
      'framer-motion',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'socket.io-client',
    ],
  },
})