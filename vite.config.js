import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // '/api' ile başlayan istekleri backend sunucusuna yönlendir
      '/api': {
        target: 'http://localhost:3001', // Backend sunucunuzun adresi
        changeOrigin: true, // Farklı origin'ler arası istekler için gerekli
      },
      '/socket.io': {
        target: 'ws://localhost:3001', // WebSocket için
        ws: true,
      },
    },
  },
})
