import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      formats: ['es'],
      fileName: 'index',
    },
    rollupOptions: {
      external: [],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/index.ts'],
      thresholds: {
        lines: 79,
        branches: 84,
        functions: 95,
        statements: 79,
      },
    },
  },
});
