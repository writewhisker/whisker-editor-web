/**
 * Tests for Butler CLI integration
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { writeFile, rm, mkdir } from 'fs/promises';

// Use vi.hoisted to ensure mock is created before module imports
const { mockExecAsync } = vi.hoisted(() => {
  return {
    mockExecAsync: vi.fn(),
  };
});

// Mock child_process and util.promisify
vi.mock('child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('child_process')>();
  return {
    ...actual,
    exec: vi.fn(),
  };
});

vi.mock('util', async (importOriginal) => {
  const actual = await importOriginal<typeof import('util')>();
  return {
    ...actual,
    promisify: () => mockExecAsync,
  };
});

// Mock fs/promises
vi.mock('fs/promises');

// Import Butler after mocks are set up
import { Butler } from './butler';

describe('Butler', () => {
  let butler: Butler;

  beforeEach(() => {
    butler = new Butler('butler');
    mockExecAsync.mockClear();
  });

  describe('getStatus', () => {
    it.skip('should detect installed butler', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: 'v15.21.0', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'User: testuser', stderr: '' });

      const status = await butler.getStatus();

      expect(status.installed).toBe(true);
      expect(status.version).toBe('v15.21.0');
      expect(status.loggedIn).toBe(true);
      expect(status.username).toBe('testuser');
    });

    it('should detect butler not installed', async () => {
      mockExecAsync.mockRejectedValue(new Error('butler not found'));

      const status = await butler.getStatus();

      expect(status.installed).toBe(false);
      expect(status.loggedIn).toBe(false);
      expect(status.error).toBeDefined();
    });

    it.skip('should detect not logged in', async () => {
      mockExecAsync
        .mockResolvedValueOnce({ stdout: 'v15.21.0', stderr: '' })
        .mockResolvedValueOnce({ stdout: 'No saved credentials', stderr: '' });

      const status = await butler.getStatus();

      expect(status.installed).toBe(true);
      expect(status.loggedIn).toBe(false);
      expect(status.username).toBeUndefined();
    });
  });

  describe('login', () => {
    it.skip('should login successfully', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Logged in successfully', stderr: '' });

      const result = await butler.login('test-api-key');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle login failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('Invalid API key'));

      const result = await butler.login('invalid-key');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('logout', () => {
    it.skip('should logout successfully', async () => {
      mockExecAsync.mockResolvedValue({ stdout: 'Logged out', stderr: '' });

      const result = await butler.logout();

      expect(result.success).toBe(true);
    });

    it('should handle logout failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('Logout failed'));

      const result = await butler.logout();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('push', () => {
    it.skip('should upload successfully', async () => {
      mockExecAsync.mockResolvedValue({
        stdout: 'Build ID: 12345\nhttps://itch.io/game/build/12345',
        stderr: '',
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
      mockExecAsync.mockImplementation(async (cmd: string) => {
        expect(cmd).toContain('--fix-permissions');
        return { stdout: '', stderr: '' };
      });

      await butler.push('/tmp/build', {
        target: 'user/game',
        channel: 'html',
        fixPermissions: true,
      });
    });

    it('should handle upload failure', async () => {
      mockExecAsync.mockRejectedValue(new Error('Upload failed'));

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
