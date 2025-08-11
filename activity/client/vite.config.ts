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
    // Supabase fallback configuration (use real values in production)
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key'),
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    cors: true,
    headers: {
      // Discord Activities need specific CORS configuration
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      'Cross-Origin-Opener-Policy': 'unsafe-none',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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