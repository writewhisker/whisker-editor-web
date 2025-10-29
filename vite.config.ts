import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import monacoEditorPlugin from 'vite-plugin-monaco-editor'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    svelte(),
    monacoEditorPlugin.default({
      languageWorkers: ['editorWorkerService'],
      customWorkers: [
        {
          label: 'lua',
          entry: 'monaco-editor/esm/vs/language/typescript/ts.worker',
        },
      ],
    }),
  ],
  base: '/whisker-editor-web/',
  resolve: {
    alias: {
      '$lib': path.resolve('./src/lib')
    }
  },
  optimizeDeps: {
    include: ['monaco-editor'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
  }
})
