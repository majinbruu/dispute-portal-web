import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const coverageThreshold = { lines: 80, statements: 80, functions: 80, branches: 70 };

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://localhost:5080', changeOrigin: true },
    },
  },
  preview: { port: 3000, strictPort: true },
  build: { sourcemap: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/**/*.d.ts', 'src/main.tsx'],
      thresholds: {
        'src/lib/**': coverageThreshold,
        'src/components/**': coverageThreshold,
      },
    },
  },
});
