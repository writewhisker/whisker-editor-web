/**
 * Tests for Butler CLI integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Butler } from './butler';
import { exec } from 'child_process';
import { writeFile, rm, mkdir } from 'fs/promises';

// Mock child_process and fs/promises
vi.mock('child_process');
vi.mock('fs/promises');

describe('Butler', () => {
  let butler: Butler;
  let mockExec: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    butler = new Butler('butler');
    mockExec = vi.fn();
    vi.mocked(exec).mockImplementation(mockExec as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getStatus', () => {
    it('should detect installed butler', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('-V')) {
          callback(null, { stdout: 'v15.21.0', stderr: '' });
        } else if (cmd.includes('status')) {
          callback(null, { stdout: 'User: testuser', stderr: '' });
        }
      });

      const status = await butler.getStatus();

      expect(status.installed).toBe(true);
      expect(status.version).toBe('v15.21.0');
      expect(status.loggedIn).toBe(true);
      expect(status.username).toBe('testuser');
    });

    it('should detect butler not installed', async () => {
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        callback(new Error('butler not found'), null);
      });

      const status = await butler.getStatus();

      expect(status.installed).toBe(false);
      expect(status.loggedIn).toBe(false);
      expect(status.error).toBeDefined();
    });

    it('should detect not logged in', async () => {
      mockExec.mockImplementation((cmd: string, callback: any) => {
        if (cmd.includes('-V')) {
          callback(null, { stdout: 'v15.21.0', stderr: '' });
        } else if (cmd.includes('status')) {
          callback(null, { stdout: 'No saved credentials', stderr: '' });
        }
      });

      const status = await butler.getStatus();

      expect(status.installed).toBe(true);
      expect(status.loggedIn).toBe(false);
      expect(status.username).toBeUndefined();
    });
  });

  describe('login', () => {
    it('should login successfully', async () => {
      mockExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, { stdout: 'Logged in successfully', stderr: '' });
      });

      const result = await butler.login('test-api-key');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle login failure', async () => {
      mockExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(new Error('Invalid API key'), null);
      });

      const result = await butler.login('invalid-key');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        callback(null, { stdout: 'Logged out', stderr: '' });
      });

      const result = await butler.logout();

      expect(result.success).toBe(true);
    });

    it('should handle logout failure', async () => {
      mockExec.mockImplementation((_cmd: string, callback: any) => {
        callback(new Error('Logout failed'), null);
      });

      const result = await butler.logout();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('push', () => {
    it('should upload successfully', async () => {
      mockExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(null, {
          stdout: 'Build ID: 12345\nhttps://itch.io/game/build/12345',
          stderr: '',
        });
      });

      const result = await butler.push('/tmp/build', {
        target: 'user/game',
        channel: 'html',
        version: '1.0.0',
      });

      expect(result.success).toBe(true);
      expect(result.buildId).toBe(12345);
      expect(result.buildUrl).toContain('itch.io');
    });

    it('should include fix-permissions flag', async () => {
      mockExec.mockImplementation((cmd: string, _options: any, callback: any) => {
        expect(cmd).toContain('--fix-permissions');
        callback(null, { stdout: '', stderr: '' });
      });

      await butler.push('/tmp/build', {
        target: 'user/game',
        channel: 'html',
        fixPermissions: true,
      });
    });

    it('should handle upload failure', async () => {
      mockExec.mockImplementation((_cmd: string, _options: any, callback: any) => {
        callback(new Error('Upload failed'), null);
      });

      const result = await butler.push('/tmp/build', {
        target: 'user/game',
        channel: 'html',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('prepareHtmlBuild', () => {
    it('should create build directory with HTML', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);
      vi.mocked(rm).mockResolvedValue(undefined);

      const htmlContent = '<html><body>Test</body></html>';
      const build = await butler.prepareHtmlBuild(htmlContent, 'test-project');

      expect(build.path).toBeDefined();
      expect(build.cleanup).toBeDefined();
      expect(mkdir).toHaveBeenCalled();
      expect(writeFile).toHaveBeenCalledWith(
        expect.stringContaining('index.html'),
        htmlContent,
        'utf-8'
      );

      // Test cleanup
      await build.cleanup();
      expect(rm).toHaveBeenCalledWith(build.path, { recursive: true, force: true });
    });

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(mkdir).mockResolvedValue(undefined);
      vi.mocked(writeFile).mockResolvedValue(undefined);
      vi.mocked(rm).mockRejectedValue(new Error('Cleanup failed'));

      const build = await butler.prepareHtmlBuild('<html></html>', 'test');

      // Should not throw
      await expect(build.cleanup()).resolves.toBeUndefined();
    });
  });

  describe('validateTarget', () => {
    it('should validate correct target format', () => {
      expect(Butler.validateTarget('user/game')).toBe(true);
      expect(Butler.validateTarget('user-name/game-name')).toBe(true);
      expect(Butler.validateTarget('user_name/game_name')).toBe(true);
    });

    it('should reject invalid target formats', () => {
      expect(Butler.validateTarget('invalid')).toBe(false);
      expect(Butler.validateTarget('user/')).toBe(false);
      expect(Butler.validateTarget('/game')).toBe(false);
      expect(Butler.validateTarget('user/game/extra')).toBe(false);
      expect(Butler.validateTarget('')).toBe(false);
    });
  });

  describe('getDownloadUrl', () => {
    it('should return download URL for current platform', () => {
      const url = Butler.getDownloadUrl();

      expect(url).toContain('broth.itch.ovh/butler');
      expect(url).toBeDefined();
    });
  });
});
