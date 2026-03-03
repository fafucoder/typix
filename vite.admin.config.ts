import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig({
  root: './src/admin',
  publicDir: '../public',
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
      routesDirectory: './routes',
      generatedRouteTree: './routeTree.gen.ts',
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/admin'),
    },
  },
  build: {
    outDir: path.resolve(__dirname, 'dist-admin'),
    emptyOutDir: true,
  },
  server: {
    port: 5175,
  },
})
