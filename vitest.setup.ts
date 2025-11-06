import '@testing-library/jest-dom';

// Workaround for Svelte 5 + JSDOM DOM node issues
// See: https://github.com/sveltejs/svelte/issues/9388
globalThis.HTMLElement.prototype.insertBefore = new Proxy(
  globalThis.HTMLElement.prototype.insertBefore,
  {
    apply(target, thisArg, argArray) {
      // Ensure nodes are valid before insertion
      if (!argArray[0] || !argArray[0].nodeType) {
        console.warn('Attempted to insert invalid node, skipping');
        return argArray[0];
      }
      return Reflect.apply(target, thisArg, argArray);
    },
  }
);
