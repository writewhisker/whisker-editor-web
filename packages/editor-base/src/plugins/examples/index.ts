/**
 * Example Plugins
 *
 * These plugins demonstrate the various capabilities of the Whisker plugin system
 */

export { customPassageTypesPlugin } from './customPassageTypesPlugin';
export { debugLoggerPlugin } from './debugLoggerPlugin';
export { customActionsPlugin } from './customActionsPlugin';

/**
 * Register all example plugins
 *
 * Usage:
 * ```typescript
 * import { registerExamplePlugins } from '$lib/plugins/examples';
 * import { pluginStoreActions } from '$lib/plugins';
 *
 * await registerExamplePlugins();
 * ```
 */
export async function registerExamplePlugins() {
  const { pluginStoreActions } = await import('../index');
  const { customPassageTypesPlugin } = await import('./customPassageTypesPlugin');
  const { debugLoggerPlugin } = await import('./debugLoggerPlugin');
  const { customActionsPlugin } = await import('./customActionsPlugin');

  await pluginStoreActions.register(customPassageTypesPlugin);
  await pluginStoreActions.register(debugLoggerPlugin);
  await pluginStoreActions.register(customActionsPlugin);

  console.log('All example plugins registered');
}
