import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx,js,jsx}', 'tests/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
      '**/.cache/**',
      '**/.output/**',
      '**/.next/**',
      '**/coverage/**',
      '**/tmp/**',
      '**/tmp/test-dist/**',
    ],
    environment: 'jsdom',
    setupFiles: ['./tests/setup.tsx'],
    globals: true,
    css: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
