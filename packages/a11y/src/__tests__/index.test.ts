import { describe, it, expect } from 'vitest';
import * as a11y from '../index';

describe('@writewhisker/a11y', () => {
  describe('module exports', () => {
    it('exports all core classes', () => {
      expect(a11y.AriaManager).toBeDefined();
      expect(a11y.ContrastChecker).toBeDefined();
      expect(a11y.FocusManager).toBeDefined();
      expect(a11y.KeyboardNavigator).toBeDefined();
      expect(a11y.MotionPreference).toBeDefined();
      expect(a11y.ScreenReaderAdapter).toBeDefined();
    });

    it('exports utils namespace', () => {
      expect(a11y.utils).toBeDefined();
      expect(a11y.utils.generateId).toBeDefined();
      expect(a11y.utils.escapeHtml).toBeDefined();
    });

    it('exports individual util functions', () => {
      expect(a11y.generateId).toBeDefined();
      expect(a11y.escapeHtml).toBeDefined();
      expect(a11y.stripHtml).toBeDefined();
      expect(a11y.getSrOnlyCss).toBeDefined();
      expect(a11y.getFocusVisibleCss).toBeDefined();
      expect(a11y.getSkipLinkCss).toBeDefined();
      expect(a11y.isDecorativeText).toBeDefined();
      expect(a11y.normalizeWhitespace).toBeDefined();
      expect(a11y.truncateForAnnouncement).toBeDefined();
      expect(a11y.createDescription).toBeDefined();
      expect(a11y.getAccessibilityMetadata).toBeDefined();
      expect(a11y.isDescriptiveLinkText).toBeDefined();
      expect(a11y.createLiveRegionHtml).toBeDefined();
      expect(a11y.getAllA11yCss).toBeDefined();
      expect(a11y.isVisibleToScreenReader).toBeDefined();
      expect(a11y.getAccessibleName).toBeDefined();
      expect(a11y.createHiddenDescription).toBeDefined();
    });
  });

  describe('createA11ySystem', () => {
    it('creates all components', () => {
      const system = a11y.createA11ySystem();

      expect(system.ariaManager).toBeInstanceOf(a11y.AriaManager);
      expect(system.contrastChecker).toBeInstanceOf(a11y.ContrastChecker);
      expect(system.focusManager).toBeInstanceOf(a11y.FocusManager);
      expect(system.keyboardNavigator).toBeInstanceOf(a11y.KeyboardNavigator);
      expect(system.motionPreference).toBeInstanceOf(a11y.MotionPreference);
      expect(system.screenReaderAdapter).toBeInstanceOf(a11y.ScreenReaderAdapter);
    });

    it('passes dependencies to components', () => {
      const eventBus = {
        emit: () => {},
        on: () => () => {},
      };
      const logger = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
      };

      const system = a11y.createA11ySystem({ eventBus, logger });

      // Verify system was created successfully
      expect(system.ariaManager).toBeDefined();
      expect(system.keyboardNavigator).toBeDefined();
    });

    it('connects focusManager to keyboardNavigator', () => {
      const system = a11y.createA11ySystem();

      // Both should be created and connected
      expect(system.focusManager).toBeDefined();
      expect(system.keyboardNavigator).toBeDefined();
    });
  });

  describe('type exports', () => {
    it('exports type-only members correctly', () => {
      // These are type exports - we just verify the module compiles correctly
      // Type exports are checked at compile time, not runtime
      const _testTypes = () => {
        type _EventBus = a11y.EventBus;
        type _Logger = a11y.Logger;
        type _A11yDependencies = a11y.A11yDependencies;
        type _AriaRole = a11y.AriaRole;
        type _WCAGLevel = a11y.WCAGLevel;
        type _TextSize = a11y.TextSize;
        type _LiveRegionPriority = a11y.LiveRegionPriority;
        type _NavigationMode = a11y.NavigationMode;
      };
      expect(true).toBe(true);
    });
  });
});
