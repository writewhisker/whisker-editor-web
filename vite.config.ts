import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    svelte(),
    (monacoEditorPlugin as any).default ? (monacoEditorPlugin as any).default({
      languageWorkers: ['editorWorkerService'],
      customWorkers: [
        {
          label: 'lua',
          entry: 'monaco-editor/esm/vs/language/typescript/ts.worker',
        },
      ],
    }) : monacoEditorPlugin({
      languageWorkers: ['editorWorkerService'],
      customWorkers: [
        {
          label: 'lua',
          entry: 'monaco-editor/esm/vs/language/typescript/ts.worker',
        },
      ],
    }),
  ],
  // Use root path for dev, /whisker-editor-web/ for production (GitHub Pages)
  base: mode === 'production' ? '/whisker-editor-web/' : '/',
  resolve: {
    alias: {
      '$lib': path.resolve('./packages/editor-base/src'),
      '@writewhisker/core-ts': path.resolve('./packages/core-ts/src'),
      '@writewhisker/editor-base': path.resolve('./packages/editor-base/src'),
      '@writewhisker/storage': path.resolve('./packages/storage/dist'),
      '@writewhisker/github': path.resolve('./packages/github/dist')
    }
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
  }
}))
