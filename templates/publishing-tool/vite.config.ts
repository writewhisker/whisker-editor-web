import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
  },
  optimizeDeps: {
    include: ['@writewhisker/core-ts', '@writewhisker/export', '@writewhisker/publishing'],
  },
});
