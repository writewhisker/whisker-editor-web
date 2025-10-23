# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]: "[plugin:vite-plugin-svelte:compile] src/lib/components/PassageList.svelte:317:14 `{@const}` must be the immediate child of `{#snippet}`, `{#if}`, `{:else if}`, `{:else}`, `{#each}`, `{:then}`, `{:catch}`, `<svelte:fragment>`, `<svelte:boundary` or `<Component>` https://svelte.dev/e/const_tag_invalid_placement"
  - generic [ref=e5]: PassageList.svelte:317:14
  - generic [ref=e6]: "315 | <span class=\"text-gray-400\" title=\"Dead end\">⏹</span> 316 | {/if} 317 | {@const validationSeverity = getPassageValidationSeverity(passage.id)} ^ 318 | {@const validationCount = getPassageValidationCount(passage.id)} 319 | {#if validationSeverity}"
  - generic [ref=e7]:
    - text: Click outside, press Esc key, or fix the code to dismiss.
    - text: You can also disable this overlay by setting
    - code [ref=e8]: server.hmr.overlay
    - text: to
    - code [ref=e9]: "false"
    - text: in
    - code [ref=e10]: vite.config.ts
    - text: .
```