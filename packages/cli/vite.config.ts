import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        cli: resolve(__dirname, 'src/cli.ts'),
      },
      formats: ['es'],
      fileName: (format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        '@writewhisker/cli-init',
        '@writewhisker/cli-build',
        '@writewhisker/cli-deploy',
        '@writewhisker/cli-migrate',
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
