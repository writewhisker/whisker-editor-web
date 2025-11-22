/**
 * Tests for CLI Deploy Command
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  deployStory,
  deployCommand,
  verifyDeployment,
  generateDeployConfig,
  type DeployConfig,
  type DeployPlatform,
  type DeployResult,
} from './index.js';

// Mock fs/promises
vi.mock('fs/promises', () => {
  return {
    readdir: vi.fn(),
    copyFile: vi.fn(),
    unlink: vi.fn(),
  };
});

// Mock child_process
vi.mock('child_process', () => {
  return {
    exec: vi.fn((cmd, opts, callback) => {
      if (typeof opts === 'function') {
        callback = opts;
      }
      callback(null, { stdout: '', stderr: '' });
    }),
  };
});

// Mock https/http
vi.mock('https', () => {
  return {
    get: vi.fn(),
  };
});

vi.mock('http', () => {
  return {
    get: vi.fn(),
  };
});

describe('generateDeployConfig', () => {
  it('should generate config with default build directory', () => {
    const config = generateDeployConfig('netlify');

    expect(config).toEqual({
      platform: 'netlify',
      buildDir: 'dist',
    });
  });

  it('should generate config with custom build directory', () => {
    const config = generateDeployConfig('vercel', 'build');

    expect(config).toEqual({
      platform: 'vercel',
      buildDir: 'build',
    });
  });

  it('should work with all platform types', () => {
    const platforms: DeployPlatform[] = ['github-pages', 'netlify', 'vercel', 'itch-io', 's3'];

    for (const platform of platforms) {
      const config = generateDeployConfig(platform);
      expect(config.platform).toBe(platform);
      expect(config.buildDir).toBe('dist');
    }
  });
});

describe('deployStory', () => {
  let childProcess: any;
  let fs: any;

  beforeEach(async () => {
    childProcess = await import('child_process');
    fs = await import('fs/promises');
    vi.clearAllMocks();
  });

  describe('GitHub Pages', () => {
    it('should deploy to GitHub Pages successfully', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        const cmdStr = typeof cmd === 'string' ? cmd : '';

        if (cmdStr.includes('remote get-url')) {
          callback(null, { stdout: 'git@github.com:user/repo.git\n', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      (childProcess.exec as any) = execMock;
      (fs.readdir as any).mockResolvedValue(['index.html', 'style.css']);

      const config: DeployConfig = {
        platform: 'github-pages',
        buildDir: '/test/dist',
      };

      const result = await deployStory(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain('GitHub Pages');
      expect(result.url).toContain('github.io');
    });

    it('should fail if git is not initialized', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        const cmdStr = typeof cmd === 'string' ? cmd : '';

        if (cmdStr.includes('rev-parse')) {
          callback(new Error('Not a git repository'), { stdout: '', stderr: '' });
        }
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 'github-pages',
        buildDir: '/test/dist',
      };

      const result = await deployStory(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Git repository not initialized');
    });

    it('should handle deployment errors', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        const cmdStr = typeof cmd === 'string' ? cmd : '';

        if (cmdStr.includes('push')) {
          callback(new Error('Push failed'), { stdout: '', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });

      (childProcess.exec as any) = execMock;
      (fs.readdir as any).mockResolvedValue(['index.html']);

      const config: DeployConfig = {
        platform: 'github-pages',
        buildDir: '/test/dist',
      };

      const result = await deployStory(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Deployment failed');
    });
  });

  describe('Netlify', () => {
    it('should deploy to Netlify successfully', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        const cmdStr = typeof cmd === 'string' ? cmd : '';

        if (cmdStr.includes('netlify --version')) {
          callback(null, { stdout: '12.0.0', stderr: '' });
        } else if (cmdStr.includes('netlify deploy')) {
          callback(null, {
            stdout: 'Website URL: https://mysite.netlify.app',
            stderr: '',
          });
        }
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 'netlify',
        buildDir: '/test/dist',
      };

      const result = await deployStory(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Netlify');
      expect(result.url).toContain('netlify.app');
    });

    it('should fail if Netlify CLI is not installed', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        const cmdStr = typeof cmd === 'string' ? cmd : '';

        if (cmdStr.includes('netlify --version')) {
          callback(new Error('Command not found'), { stdout: '', stderr: '' });
        }
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 'netlify',
        buildDir: '/test/dist',
      };

      const result = await deployStory(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Netlify CLI not found');
    });
  });

  describe('Vercel', () => {
    it('should deploy to Vercel successfully', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        const cmdStr = typeof cmd === 'string' ? cmd : '';

        if (cmdStr.includes('vercel --version')) {
          callback(null, { stdout: '28.0.0', stderr: '' });
        } else if (cmdStr.includes('vercel --prod')) {
          callback(null, {
            stdout: 'https://myproject.vercel.app',
            stderr: '',
          });
        }
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 'vercel',
        buildDir: '/test/dist',
      };

      const result = await deployStory(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Vercel');
      expect(result.url).toContain('vercel.app');
    });

    it('should fail if Vercel CLI is not installed', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        const cmdStr = typeof cmd === 'string' ? cmd : '';

        if (cmdStr.includes('vercel --version')) {
          callback(new Error('Command not found'), { stdout: '', stderr: '' });
        }
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 'vercel',
        buildDir: '/test/dist',
      };

      const result = await deployStory(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Vercel CLI not found');
    });
  });

  describe('Itch.io', () => {
    it('should deploy to itch.io successfully', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        callback(null, { stdout: '', stderr: '' });
      });

      (childProcess.exec as any) = execMock;
      (fs.unlink as any).mockResolvedValue(undefined);

      const config: DeployConfig = {
        platform: 'itch-io',
        buildDir: '/test/dist',
        projectName: 'user/game',
      };

      const result = await deployStory(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain('itch.io');
      expect(result.url).toContain('itch.io');
    });

    it('should fail if butler is not installed', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        const cmdStr = typeof cmd === 'string' ? cmd : '';

        if (cmdStr.includes('butler --version')) {
          callback(new Error('Command not found'), { stdout: '', stderr: '' });
        }
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 'itch-io',
        buildDir: '/test/dist',
        projectName: 'user/game',
      };

      const result = await deployStory(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Butler');
    });

    it('should fail if project name is missing', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        callback(null, { stdout: '', stderr: '' });
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 'itch-io',
        buildDir: '/test/dist',
      };

      const result = await deployStory(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Project name required');
    });
  });

  describe('AWS S3', () => {
    it('should deploy to S3 successfully', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        callback(null, { stdout: '', stderr: '' });
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 's3',
        buildDir: '/test/dist',
        credentials: {
          bucket: 'my-bucket',
          region: 'us-west-2',
        },
      };

      const result = await deployStory(config);

      expect(result.success).toBe(true);
      expect(result.message).toContain('S3');
      expect(result.url).toContain('s3-website');
      expect(result.url).toContain('us-west-2');
    });

    it('should use default region if not specified', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        callback(null, { stdout: '', stderr: '' });
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 's3',
        buildDir: '/test/dist',
        credentials: {
          bucket: 'my-bucket',
        },
      };

      const result = await deployStory(config);

      expect(result.success).toBe(true);
      expect(result.url).toContain('us-east-1');
    });

    it('should fail if AWS CLI is not installed', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        const cmdStr = typeof cmd === 'string' ? cmd : '';

        if (cmdStr.includes('aws --version')) {
          callback(new Error('Command not found'), { stdout: '', stderr: '' });
        }
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 's3',
        buildDir: '/test/dist',
        credentials: {
          bucket: 'my-bucket',
        },
      };

      const result = await deployStory(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('AWS CLI not found');
    });

    it('should fail if bucket name is missing', async () => {
      const execMock = vi.fn((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
        }

        callback(null, { stdout: '', stderr: '' });
      });

      (childProcess.exec as any) = execMock;

      const config: DeployConfig = {
        platform: 's3',
        buildDir: '/test/dist',
        credentials: {},
      };

      const result = await deployStory(config);

      expect(result.success).toBe(false);
      expect(result.message).toContain('S3 bucket name required');
    });
  });

  describe('unknown platform', () => {
    it('should throw error for unknown platform', async () => {
      const config: DeployConfig = {
        platform: 'unknown' as DeployPlatform,
        buildDir: '/test/dist',
      };

      await expect(deployStory(config)).rejects.toThrow('Unknown platform');
    });
  });
});

describe('verifyDeployment', () => {
  let https: any;
  let http: any;

  beforeEach(async () => {
    https = await import('https');
    http = await import('http');
    vi.clearAllMocks();
  });

  it('should verify HTTPS deployment successfully', async () => {
    const mockRequest = {
      on: vi.fn(),
      setTimeout: vi.fn(),
      destroy: vi.fn(),
    };

    (https.get as any).mockImplementation((url: string, callback: any) => {
      callback({ statusCode: 200 });
      return mockRequest;
    });

    const result = await verifyDeployment('https://example.com');

    expect(result).toBe(true);
    expect(https.get).toHaveBeenCalledWith('https://example.com', expect.any(Function));
  });

  it('should verify HTTP deployment successfully', async () => {
    const mockRequest = {
      on: vi.fn(),
      setTimeout: vi.fn(),
      destroy: vi.fn(),
    };

    (http.get as any).mockImplementation((url: string, callback: any) => {
      callback({ statusCode: 200 });
      return mockRequest;
    });

    const result = await verifyDeployment('http://example.com');

    expect(result).toBe(true);
    expect(http.get).toHaveBeenCalledWith('http://example.com', expect.any(Function));
  });

  it('should return false for non-200 status', async () => {
    const mockRequest = {
      on: vi.fn(),
      setTimeout: vi.fn(),
      destroy: vi.fn(),
    };

    (https.get as any).mockImplementation((url: string, callback: any) => {
      callback({ statusCode: 404 });
      return mockRequest;
    });

    const result = await verifyDeployment('https://example.com');

    expect(result).toBe(false);
  });

  it('should return false on request error', async () => {
    const mockRequest = {
      on: vi.fn((event: string, handler: any) => {
        if (event === 'error') {
          handler(new Error('Connection failed'));
        }
      }),
      setTimeout: vi.fn(),
      destroy: vi.fn(),
    };

    (https.get as any).mockImplementation(() => mockRequest);

    const result = await verifyDeployment('https://example.com');

    expect(result).toBe(false);
  });

  it('should return false on timeout', async () => {
    const mockRequest = {
      on: vi.fn(),
      setTimeout: vi.fn((timeout: number, handler: any) => {
        handler();
      }),
      destroy: vi.fn(),
    };

    (https.get as any).mockImplementation(() => mockRequest);

    const result = await verifyDeployment('https://example.com');

    expect(result).toBe(false);
    expect(mockRequest.destroy).toHaveBeenCalled();
  });

  it('should handle exceptions', async () => {
    (https.get as any).mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await verifyDeployment('https://example.com');

    expect(result).toBe(false);
  });
});

describe('deployCommand', () => {
  let childProcess: any;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;

  beforeEach(async () => {
    childProcess = await import('child_process');
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.clearAllMocks();

    // Default successful execution
    (childProcess.exec as any) = vi.fn((cmd, opts, callback) => {
      if (typeof opts === 'function') {
        callback = opts;
      }
      callback(null, { stdout: 'https://deployed.example.com', stderr: '' });
    });
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it('should have correct command structure', () => {
    expect(deployCommand).toHaveProperty('name', 'deploy');
    expect(deployCommand).toHaveProperty('description');
    expect(deployCommand).toHaveProperty('options');
    expect(deployCommand).toHaveProperty('execute');
    expect(Array.isArray(deployCommand.options)).toBe(true);
  });

  it('should have required options', () => {
    const optionNames = deployCommand.options?.map(opt => opt.name) || [];
    expect(optionNames).toContain('platform');
    expect(optionNames).toContain('build-dir');
    expect(optionNames).toContain('project');
    expect(optionNames).toContain('bucket');
    expect(optionNames).toContain('region');
  });

  it('should execute deployment successfully', async () => {
    await deployCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        platform: 'netlify',
        'build-dir': 'dist',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Deploying'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Build directory'));
  });

  it('should handle deployment failure', async () => {
    (childProcess.exec as any) = vi.fn((cmd, opts, callback) => {
      if (typeof opts === 'function') {
        callback = opts;
      }

      const cmdStr = typeof cmd === 'string' ? cmd : '';

      if (cmdStr.includes('netlify --version')) {
        callback(new Error('Not found'), { stdout: '', stderr: '' });
      }
    });

    await deployCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        platform: 'netlify',
      },
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should use default build directory', async () => {
    await deployCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        platform: 'netlify',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('dist'));
  });

  it('should use custom build directory', async () => {
    await deployCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        platform: 'netlify',
        'build-dir': 'build',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('build'));
  });

  it('should pass project name for itch.io', async () => {
    const execMock = vi.fn((cmd, opts, callback) => {
      if (typeof opts === 'function') {
        callback = opts;
      }
      callback(null, { stdout: '', stderr: '' });
    });

    (childProcess.exec as any) = execMock;

    await deployCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        platform: 'itch-io',
        project: 'user/game',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalled();
  });

  it('should pass S3 credentials', async () => {
    const execMock = vi.fn((cmd, opts, callback) => {
      if (typeof opts === 'function') {
        callback = opts;
      }
      callback(null, { stdout: '', stderr: '' });
    });

    (childProcess.exec as any) = execMock;

    await deployCommand.execute({
      cwd: '/test',
      args: [],
      options: {
        platform: 's3',
        bucket: 'my-bucket',
        region: 'us-west-1',
      },
    });

    expect(consoleLogSpy).toHaveBeenCalled();
  });
});
