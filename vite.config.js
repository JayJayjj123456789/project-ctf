import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // Route API calls (image upload) to Express server
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  }
})
