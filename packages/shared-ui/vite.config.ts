import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    svelte({
      compilerOptions: {
        // Generate custom element compatible code
        customElement: false,
      },
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        components: resolve(__dirname, 'src/components/index.ts'),
        utils: resolve(__dirname, 'src/utils/index.ts'),
      },
      name: 'WhiskerSharedUI',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['svelte', 'svelte/internal', 'svelte/store'],
      output: {
        // Preserve module structure
        preserveModules: true,
        preserveModulesRoot: 'src',
        entryFileNames: '[name].js',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
