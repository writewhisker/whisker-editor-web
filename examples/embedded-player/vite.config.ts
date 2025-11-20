import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2020',
    minify: 'terser',
    sourcemap: true,
    lib: {
      entry: 'src/whisker-player.ts',
      formats: ['es'],
      fileName: 'whisker-player',
    },
    rollupOptions: {
      output: {
        assetFileNames: 'whisker-player.[ext]',
      },
    },
  },
  server: {
    port: 3003,
    open: true,
  },
});
