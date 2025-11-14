import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
  plugins: [svelte()],
  css: {
    postcss: false, // Disable PostCSS for this package
  },
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, 'src/index.ts'),
        stores: path.resolve(__dirname, 'src/stores/index.ts'),
        components: path.resolve(__dirname, 'src/components/index.ts'),
        services: path.resolve(__dirname, 'src/services/index.ts'),
        export: path.resolve(__dirname, 'src/export/index.ts'),
        import: path.resolve(__dirname, 'src/import/index.ts'),
        utils: path.resolve(__dirname, 'src/utils/index.ts'),
        audio: path.resolve(__dirname, 'src/audio/index.ts'),
        analytics: path.resolve(__dirname, 'src/analytics/index.ts'),
        animations: path.resolve(__dirname, 'src/animations/index.ts'),
        publishing: path.resolve(__dirname, 'src/publishing/index.ts'),
        plugins: path.resolve(__dirname, 'src/plugins/index.ts'),
        scripting: path.resolve(__dirname, 'src/scripting/index.ts'),
        adapters: path.resolve(__dirname, 'src/adapters/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['svelte', '@whisker/core-ts', '@whisker/core-ts/validation'],
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
});
