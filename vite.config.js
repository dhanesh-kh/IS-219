import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'recharts',
      'leaflet',
      'react-leaflet',
      'date-fns'
    ]
  },
  publicDir: 'public',
  assetsInclude: ['**/*.csv']
}); 