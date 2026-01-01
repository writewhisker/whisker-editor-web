/**
 * Re-export scripting from @writewhisker/scripting package
 * This maintains backwards compatibility for editor-base exports
 */

export * from '@writewhisker/scripting';

/**
 * Monaco Editor language configurations
 */
export {
  registerLuaLanguage,
  registerStoryTheme,
  initializeLuaSupport,
} from './luaConfig';

export {
  registerWlsLanguage,
  registerWlsTheme,
  initializeWlsSupport,
} from './wlsConfig';
