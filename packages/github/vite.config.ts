import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*'],
      exclude: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'WhiskerGitHub',
      formats: ['es'],
      fileName: () => 'index.js',
    },
    rollupOptions: {
      external: [
        '@octokit/rest',
        '@writewhisker/storage',
        'svelte',
        'svelte/store',
      ],
      output: {
        preserveModules: false,
      },
    },
    sourcemap: true,
    emptyOutDir: true,
  },
});
