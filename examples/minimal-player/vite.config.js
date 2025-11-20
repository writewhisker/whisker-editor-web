import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'whisker-core': ['@writewhisker/core-ts'],
          'whisker-player': ['@writewhisker/player-ui'],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
