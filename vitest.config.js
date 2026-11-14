import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.{js,jsx}'],
    environmentMatchGlobs: [['tests/**/*.test.jsx', 'jsdom']],
    setupFiles: ['tests/setup.js'],
    testTimeout: 20000,
  },
});
