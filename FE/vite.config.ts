/// <reference types="vitest/config" />
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vite.dev/config/
export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(dirname, 'src'),
      // FE dùng thẳng source của shared (không cần build) – BE dùng bản build dist
      '@sango/shared': path.resolve(dirname, '../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['src/features/**/{hooks,utils,model}/**', 'src/common/{hooks,api,utils}/**'],
      thresholds: { lines: 50, functions: 50, statements: 50, branches: 50 },
    },
  },
});
