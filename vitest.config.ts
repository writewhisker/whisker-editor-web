import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [
    svelte({
      hot: !process.env.VITEST
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/lib/**/*.{js,ts,svelte}'],
      exclude: [
        'src/lib/**/*.{test,spec}.{js,ts}',
        'src/lib/components/**/*.svelte',
      ],
    },
    deps: {
      inline: ['monaco-editor', 'wasmoon'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '$lib': path.resolve(__dirname, './src/lib'),
      'monaco-editor': path.resolve(__dirname, './src/test/mocks/monaco-editor.ts'),
      'wasmoon': path.resolve(__dirname, './src/test/mocks/wasmoon.ts'),
    },
    conditions: ['browser', 'default'],
  },
});
