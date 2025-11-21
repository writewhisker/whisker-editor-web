export default {
  onwarn: (warning, handler) => {
    if (warning.code.startsWith('a11y_') || warning.code === 'svelte_self_deprecated') return;
    handler(warning);
  }
};
