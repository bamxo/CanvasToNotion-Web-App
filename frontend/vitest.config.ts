/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./src/test/setupTests.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/src/types/**',
      '**/vite.config.ts',
      // Add any other patterns you want to exclude
    ],
    coverage: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/src/types/**',
        '**/vite.config.ts',
        '**/vitest.config.ts',
        '**/src/test/setup.ts',
        '**/src/test/__mocks__/**',
        '**/src/test/setupTests.ts',
        '**/src/main.tsx',
        '**/src/vite-env.d.ts'
      ],
      include: [
        'src/components/**/*.{ts,tsx}',
        'src/App.tsx'
      ],
      reporter: ['text', 'json', 'html'],
      all: true
    },
  },
}) 