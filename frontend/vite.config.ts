import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Custom plugin để thêm CORS headers cho manifest.json
    {
      name: 'add-cors-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Thêm CORS headers cho tất cả requests
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
          
          // Đặc biệt cho manifest.json
          if (req.url?.includes('manifest.json')) {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
          }
          
          if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
          }
          
          next();
        });
      },
    },
  ],
  optimizeDeps: {
    // Không exclude Safe SDK - để Vite optimize đúng cách
    esbuildOptions: {
      target: 'es2020',
    },
  },
  server: {
    headers: {
      // Cho phép được embed bởi Safe
      'Content-Security-Policy': "frame-ancestors 'self' https://app.safe.global https://*.safe.global",
      'X-Frame-Options': 'ALLOWALL',
    },
    cors: true, // Enable CORS
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'mui': ['@mui/material', '@mui/icons-material'],
          'ethers': ['ethers'],
          'zustand': ['zustand'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
})
