import { defineConfig } from 'tsup';
import path from 'path';

export default defineConfig({
  entry: ['src/server/index.ts'],
  outDir: 'dist',
  format: 'esm',
  minify: true,
  sourcemap: false,
  clean: true,
  esbuildOptions: (options) => {
    options.resolveExtensions = ['.ts', '.tsx', '.js', '.jsx'];
    options.alias = {
      '@': path.resolve(__dirname, 'src'),
      '@/app': path.resolve(__dirname, 'src/app'),
      '@/server': path.resolve(__dirname, 'src/server'),
    };
    options.loader = {
      '.html': 'text'
    };
  },
});