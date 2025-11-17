import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
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
        '@writewhisker/editor-base',
        '@writewhisker/editor-base/utils',
        '@writewhisker/editor-base/stores',
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
