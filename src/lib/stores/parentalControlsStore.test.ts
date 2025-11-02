/**
 * Tests for Parental Controls Store
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  parentalControlsStore,
  parentalControlsActions,
  exportAllowed,
  onlineSharingAllowed,
} from './parentalControlsStore';

describe('parentalControlsStore', () => {
  beforeEach(() => {
    // Reset to default state
    parentalControlsActions.reset();
  });

  describe('Default State', () => {
    it('should have parental controls disabled by default', () => {
      const controls = get(parentalControlsStore);
      expect(controls.enabled).toBe(false);
    });

    it('should have no PIN set by default', () => {
      const controls = get(parentalControlsStore);
      expect(controls.pin).toBeNull();
    });

    it('should allow exports by default', () => {
      const controls = get(parentalControlsStore);
      expect(controls.exportRestricted).toBe(false);
      expect(controls.allowLocalExport).toBe(true);
    });

    it('should have mild content filter by default', () => {
      const controls = get(parentalControlsStore);
      expect(controls.contentFilterLevel).toBe('mild');
    });

    it('should not allow online sharing by default', () => {
      const controls = get(parentalControlsStore);
      expect(controls.allowOnlineSharing).toBe(false);
    });

    it('should have empty activity log', () => {
      const controls = get(parentalControlsStore);
      expect(controls.activityLog).toEqual([]);
    });
  });

  describe('setEnabled', () => {
    it('should enable parental controls', () => {
      parentalControlsActions.setEnabled(true);
      const controls = get(parentalControlsStore);
      expect(controls.enabled).toBe(true);
    });

    it('should disable parental controls', () => {
      parentalControlsActions.setEnabled(true);
      parentalControlsActions.setEnabled(false);
      const controls = get(parentalControlsStore);
      expect(controls.enabled).toBe(false);
    });
  });

  describe('PIN Management', () => {
    it('should set PIN', () => {
      parentalControlsActions.setPIN('1234');
      const controls = get(parentalControlsStore);
      expect(controls.pin).toBeTruthy();
      expect(controls.pin).not.toBe('1234'); // Should be hashed
    });

    it('should verify correct PIN', () => {
      parentalControlsActions.setPIN('1234');
      expect(parentalControlsActions.verifyPIN('1234')).toBe(true);
    });

    it('should reject incorrect PIN', () => {
      parentalControlsActions.setPIN('1234');
      expect(parentalControlsActions.verifyPIN('5678')).toBe(false);
    });

    it('should allow access when no PIN is set', () => {
      expect(parentalControlsActions.verifyPIN('anything')).toBe(true);
    });

    it('should report PIN requirement status', () => {
      expect(parentalControlsActions.isPINRequired()).toBe(false);

      parentalControlsActions.setEnabled(true);
      parentalControlsActions.setPIN('1234');

      expect(parentalControlsActions.isPINRequired()).toBe(true);
    });
  });

  describe('Export Settings', () => {
    it('should restrict exports', () => {
      parentalControlsActions.setExportRestricted(true);
      const controls = get(parentalControlsStore);
      expect(controls.exportRestricted).toBe(true);
    });

    it('should allow local exports', () => {
      parentalControlsActions.setAllowLocalExport(true);
      const controls = get(parentalControlsStore);
      expect(controls.allowLocalExport).toBe(true);
    });

    it('should disallow local exports', () => {
      parentalControlsActions.setAllowLocalExport(false);
      const controls = get(parentalControlsStore);
      expect(controls.allowLocalExport).toBe(false);
    });

    it('should allow online sharing', () => {
      parentalControlsActions.setAllowOnlineSharing(true);
      const controls = get(parentalControlsStore);
      expect(controls.allowOnlineSharing).toBe(true);
    });

    it('should disallow online sharing', () => {
      parentalControlsActions.setAllowOnlineSharing(false);
      const controls = get(parentalControlsStore);
      expect(controls.allowOnlineSharing).toBe(false);
    });
  });

  describe('Content Filter', () => {
    it('should set filter level to none', () => {
      parentalControlsActions.setContentFilterLevel('none');
      const controls = get(parentalControlsStore);
      expect(controls.contentFilterLevel).toBe('none');
    });

    it('should set filter level to mild', () => {
      parentalControlsActions.setContentFilterLevel('mild');
      const controls = get(parentalControlsStore);
      expect(controls.contentFilterLevel).toBe('mild');
    });

    it('should set filter level to strict', () => {
      parentalControlsActions.setContentFilterLevel('strict');
      const controls = get(parentalControlsStore);
      expect(controls.contentFilterLevel).toBe('strict');
    });
  });

  describe('Export Approval', () => {
    it('should require approval for exports', () => {
      parentalControlsActions.setRequireApprovalForExport(true);
      const controls = get(parentalControlsStore);
      expect(controls.requireApprovalForExport).toBe(true);
    });

    it('should not require approval for exports', () => {
      parentalControlsActions.setRequireApprovalForExport(false);
      const controls = get(parentalControlsStore);
      expect(controls.requireApprovalForExport).toBe(false);
    });
  });

  describe('Session Time', () => {
    it('should set max session time', () => {
      parentalControlsActions.setMaxSessionTime(30);
      const controls = get(parentalControlsStore);
      expect(controls.maxSessionTime).toBe(30);
    });

    it('should allow unlimited session time', () => {
      parentalControlsActions.setMaxSessionTime(null);
      const controls = get(parentalControlsStore);
      expect(controls.maxSessionTime).toBeNull();
    });
  });

  describe('Activity Log', () => {
    it('should log activity', () => {
      parentalControlsActions.logActivity('Test Action', 'Test details');
      const controls = get(parentalControlsStore);

      expect(controls.activityLog).toHaveLength(1);
      expect(controls.activityLog[0].action).toBe('Test Action');
      expect(controls.activityLog[0].details).toBe('Test details');
    });

    it('should include timestamp in log entry', () => {
      const beforeTime = new Date();
      parentalControlsActions.logActivity('Test', 'Details');
      const afterTime = new Date();

      const controls = get(parentalControlsStore);
      const logTime = new Date(controls.activityLog[0].timestamp);

      expect(logTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(logTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should get activity log', () => {
      parentalControlsActions.logActivity('Action 1', 'Details 1');
      parentalControlsActions.logActivity('Action 2', 'Details 2');

      const log = parentalControlsActions.getActivityLog();

      expect(log).toHaveLength(2);
      expect(log[0].action).toBe('Action 1');
      expect(log[1].action).toBe('Action 2');
    });

    it('should clear activity log', () => {
      parentalControlsActions.logActivity('Test', 'Details');
      expect(get(parentalControlsStore).activityLog).toHaveLength(1);

      parentalControlsActions.clearActivityLog();
      expect(get(parentalControlsStore).activityLog).toEqual([]);
    });

    it('should limit activity log to 100 entries', () => {
      // Add 150 entries
      for (let i = 0; i < 150; i++) {
        parentalControlsActions.logActivity(`Action ${i}`, `Details ${i}`);
      }

      const controls = get(parentalControlsStore);
      expect(controls.activityLog.length).toBeLessThanOrEqual(100);
    });

    it('should log setting changes automatically', () => {
      parentalControlsActions.setExportRestricted(true);

      const log = parentalControlsActions.getActivityLog();
      expect(log.some(entry => entry.action === 'Setting Changed')).toBe(true);
    });
  });

  describe('Derived Stores', () => {
    it('should derive exportAllowed correctly when not restricted', () => {
      parentalControlsActions.setExportRestricted(false);
      expect(get(exportAllowed)).toBe(true);
    });

    it('should derive exportAllowed correctly when restricted but local allowed', () => {
      parentalControlsActions.setExportRestricted(true);
      parentalControlsActions.setAllowLocalExport(true);
      expect(get(exportAllowed)).toBe(true);
    });

    it('should derive exportAllowed correctly when fully restricted', () => {
      parentalControlsActions.setExportRestricted(true);
      parentalControlsActions.setAllowLocalExport(false);
      expect(get(exportAllowed)).toBe(false);
    });

    it('should derive onlineSharingAllowed correctly', () => {
      parentalControlsActions.setExportRestricted(false);
      parentalControlsActions.setAllowOnlineSharing(true);
      expect(get(onlineSharingAllowed)).toBe(true);
    });

    it('should block online sharing when exports restricted', () => {
      parentalControlsActions.setExportRestricted(true);
      parentalControlsActions.setAllowOnlineSharing(true);
      expect(get(onlineSharingAllowed)).toBe(false);
    });
  });

  describe('reset', () => {
    it('should reset all settings to defaults', () => {
      // Change all settings
      parentalControlsActions.setEnabled(true);
      parentalControlsActions.setPIN('1234');
      parentalControlsActions.setExportRestricted(true);
      parentalControlsActions.setContentFilterLevel('strict');
      parentalControlsActions.logActivity('Test', 'Test');

      // Reset
      parentalControlsActions.reset();

      // Verify defaults
      const controls = get(parentalControlsStore);
      expect(controls.enabled).toBe(false);
      expect(controls.pin).toBeNull();
      expect(controls.exportRestricted).toBe(false);
      expect(controls.contentFilterLevel).toBe('mild');
      expect(controls.activityLog).toEqual([]);
    });
  });
});
