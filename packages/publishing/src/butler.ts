/**
 * Butler CLI Integration
 *
 * Provides integration with itch.io's butler command-line tool for uploading builds.
 * Butler is the recommended way to upload content to itch.io.
 *
 * Documentation: https://itch.io/docs/butler/
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, rm, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

/**
 * Butler command options
 */
export interface ButlerOptions {
  /** Butler executable path (defaults to 'butler' in PATH) */
  butlerPath?: string;

  /** User/project format: "user/game" */
  target: string;

  /** Channel name (e.g., "html", "windows", "mac", "linux") */
  channel: string;

  /** Version number or tag */
  version?: string;

  /** Fix permissions before uploading */
  fixPermissions?: boolean;

  /** User data directory for butler */
  userDataDir?: string;
}

/**
 * Butler upload result
 */
export interface ButlerUploadResult {
  /** Whether upload succeeded */
  success: boolean;

  /** Build ID from itch.io */
  buildId?: number;

  /** Build URL */
  buildUrl?: string;

  /** Error message if failed */
  error?: string;

  /** Butler output */
  output?: string;
}

/**
 * Butler status information
 */
export interface ButlerStatus {
  /** Whether butler is installed and available */
  installed: boolean;

  /** Butler version */
  version?: string;

  /** Whether user is logged in */
  loggedIn: boolean;

  /** Logged in username */
  username?: string;

  /** Error message if any */
  error?: string;
}

/**
 * Butler CLI wrapper
 */
export class Butler {
  private readonly butlerPath: string;

  constructor(butlerPath: string = 'butler') {
    this.butlerPath = butlerPath;
  }

  /**
   * Check butler installation and login status
   */
  async getStatus(): Promise<ButlerStatus> {
    try {
      // Check version
      const { stdout: versionOutput } = await execAsync(`${this.butlerPath} -V`);
      const version = versionOutput.trim();

      // Check login status
      try {
        const { stdout: statusOutput } = await execAsync(`${this.butlerPath} status`);
        const loggedIn = !statusOutput.includes('No saved credentials');

        // Extract username if logged in
        let username: string | undefined;
        if (loggedIn) {
          const match = statusOutput.match(/User:\s+(\S+)/);
          if (match) {
            username = match[1];
          }
        }

        return {
          installed: true,
          version,
          loggedIn,
          username,
        };
      } catch (statusError) {
        // Butler installed but not logged in
        return {
          installed: true,
          version,
          loggedIn: false,
        };
      }
    } catch (error) {
      return {
        installed: false,
        loggedIn: false,
        error: error instanceof Error ? error.message : 'Butler not found',
      };
    }
  }

  /**
   * Login to itch.io using butler
   */
  async login(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      await execAsync(`${this.butlerPath} login`, {
        env: {
          ...process.env,
          BUTLER_API_KEY: apiKey,
        },
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Logout from itch.io
   */
  async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      await execAsync(`${this.butlerPath} logout`);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Logout failed',
      };
    }
  }

  /**
   * Upload a file to itch.io
   */
  async push(
    filePath: string,
    options: ButlerOptions
  ): Promise<ButlerUploadResult> {
    try {
      // Build butler command
      const args: string[] = ['push'];

      if (options.fixPermissions) {
        args.push('--fix-permissions');
      }

      if (options.userDataDir) {
        args.push('--userdata-dir', options.userDataDir);
      }

      args.push(filePath);
      args.push(`${options.target}:${options.channel}`);

      if (options.version) {
        args.push('--userversion', options.version);
      }

      const command = `${this.butlerPath} ${args.join(' ')}`;

      // Execute butler push
      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large uploads
      });

      const output = stdout + stderr;

      // Parse build ID from output
      let buildId: number | undefined;
      let buildUrl: string | undefined;

      const buildIdMatch = output.match(/Build\s+ID:\s+(\d+)/i);
      if (buildIdMatch) {
        buildId = parseInt(buildIdMatch[1], 10);
      }

      const urlMatch = output.match(/https:\/\/[^\s]+/);
      if (urlMatch) {
        buildUrl = urlMatch[0];
      }

      return {
        success: true,
        buildId,
        buildUrl,
        output,
      };
    } catch (error) {
      const err = error as any;
      return {
        success: false,
        error: err.message || 'Upload failed',
        output: err.stdout ? err.stdout + err.stderr : undefined,
      };
    }
  }

  /**
   * Create a temporary directory with HTML content for upload
   */
  async prepareHtmlBuild(
    htmlContent: string,
    projectName: string
  ): Promise<{ path: string; cleanup: () => Promise<void> }> {
    const buildDir = join(tmpdir(), `whisker-build-${Date.now()}`);

    // Create build directory
    await mkdir(buildDir, { recursive: true });

    // Write index.html
    const indexPath = join(buildDir, 'index.html');
    await writeFile(indexPath, htmlContent, 'utf-8');

    // Return path and cleanup function
    return {
      path: buildDir,
      cleanup: async () => {
        try {
          await rm(buildDir, { recursive: true, force: true });
        } catch (error) {
          console.error('Failed to cleanup build directory:', error);
        }
      },
    };
  }

  /**
   * Validate target format (user/game)
   */
  static validateTarget(target: string): boolean {
    return /^[\w-]+\/[\w-]+$/.test(target);
  }

  /**
   * Get butler download URL for the current platform
   */
  static getDownloadUrl(): string {
    const platform = process.platform;
    const arch = process.arch;

    const baseUrl = 'https://broth.itch.ovh/butler';

    if (platform === 'darwin') {
      return `${baseUrl}/darwin-amd64/LATEST/archive/default`;
    } else if (platform === 'win32') {
      if (arch === 'x64') {
        return `${baseUrl}/windows-amd64/LATEST/archive/default`;
      }
      return `${baseUrl}/windows-386/LATEST/archive/default`;
    } else if (platform === 'linux') {
      if (arch === 'x64') {
        return `${baseUrl}/linux-amd64/LATEST/archive/default`;
      }
      return `${baseUrl}/linux-386/LATEST/archive/default`;
    }

    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }
}
