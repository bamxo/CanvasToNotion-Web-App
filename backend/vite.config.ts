/// <reference types="vitest" />
import { defineConfig } from 'vite';
import type { UserConfig } from 'vite';
import type { InlineConfig } from 'vitest';

interface VitestConfigExport extends UserConfig {
  test: InlineConfig;
}

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'test/',
        'netlify/',
        'netlify/functions/**',
        '.netlify/',
        'dist/',
      ],
    },
  },
} as VitestConfigExport); 