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
    testTimeout: 30000, // Longer timeout for e2e tests
  },
} as VitestConfigExport); 