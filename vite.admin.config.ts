import path from 'path'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const serverUrl = process.env.SERVER_URL || env.SERVER_URL || 'http://localhost:5174'

  return {
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
    define: {
      'import.meta.env.SERVER_URL': JSON.stringify(serverUrl),
    },
    build: {
      outDir: path.resolve(__dirname, 'dist-admin'),
      emptyOutDir: true,
    },
    server: {
      port: 5175,
      proxy: {
        '/api': {
          target: serverUrl,
          changeOrigin: true,
        },
      },
    },
  }
})
