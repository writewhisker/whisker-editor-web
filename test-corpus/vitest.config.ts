import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@writewhisker/scripting': path.resolve(__dirname, '../packages/scripting/src'),
    },
  },
});
