import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // '/api' ile başlayan istekleri backend sunucusuna yönlendir
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // WebSocket bağlantılarını da proxy'le
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
})
