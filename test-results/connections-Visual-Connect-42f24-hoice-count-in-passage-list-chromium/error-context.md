# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite:import-analysis] Failed to resolve import \"$lib/stores/keyboardShortcutsStore\" from \"src/lib/components/help/KeyboardShortcutsHelp.svelte\". Does the file exist?"
  - generic [ref=e5]: KeyboardShortcutsHelp.svelte:2:56
  - generic [ref=e6]: "5 | 6 | import * as $ from 'svelte/internal/client'; 7 | import { shortcutCategories, showShortcutsHelp } from '$lib/stores/keyboardShortcutsStore'; | ^ 8 | import { trapFocus } from '$lib/utils/accessibility'; 9 | import { onMount } from 'svelte';"
  - generic [ref=e7]: at TransformPluginContext._formatLog (file:///Users/jims/code/github.com/writewhisker/whisker-editor-web/node_modules/vite/dist/node/chunks/dep-B0GuR2De.js:31105:43) at TransformPluginContext.error (file:///Users/jims/code/github.com/writewhisker/whisker-editor-web/node_modules/vite/dist/node/chunks/dep-B0GuR2De.js:31102:14) at normalizeUrl (file:///Users/jims/code/github.com/writewhisker/whisker-editor-web/node_modules/vite/dist/node/chunks/dep-B0GuR2De.js:29589:18) at async file:///Users/jims/code/github.com/writewhisker/whisker-editor-web/node_modules/vite/dist/node/chunks/dep-B0GuR2De.js:29647:32 at async Promise.all (index 3) at async TransformPluginContext.transform (file:///Users/jims/code/github.com/writewhisker/whisker-editor-web/node_modules/vite/dist/node/chunks/dep-B0GuR2De.js:29615:4) at async EnvironmentPluginContainer.transform (file:///Users/jims/code/github.com/writewhisker/whisker-editor-web/node_modules/vite/dist/node/chunks/dep-B0GuR2De.js:30904:14) at async loadAndTransform (file:///Users/jims/code/github.com/writewhisker/whisker-editor-web/node_modules/vite/dist/node/chunks/dep-B0GuR2De.js:26042:26)
  - generic [ref=e8]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e9]: server.hmr.overlay
    - text: to
    - code [ref=e10]: "false"
    - text: in
    - code [ref=e11]: vite.config.ts
    - text: .
```