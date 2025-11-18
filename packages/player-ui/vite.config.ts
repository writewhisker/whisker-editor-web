import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'WhiskerPlayerUI',
      formats: ['es'],
      fileName: () => 'index.js'
    },
    rollupOptions: {
      external: ['@writewhisker/core-ts'],
      output: {
        globals: {
          '@writewhisker/core-ts': 'WhiskerCore'
        }
      }
    }
  }
});
