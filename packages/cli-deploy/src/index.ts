/**
 * CLI Deploy Command
 *
 * Deployment helpers for Whisker stories to various platforms.
 */

import type { Command, CommandContext } from './types.js';

/**
 * Deployment platform
 */
export type DeployPlatform = 'github-pages' | 'netlify' | 'vercel' | 'itch-io' | 's3';

/**
 * Deployment configuration
 */
export interface DeployConfig {
  platform: DeployPlatform;
  buildDir: string;
  projectName?: string;
  domain?: string;
  credentials?: Record<string, string>;
}

/**
 * Deploy result
 */
export interface DeployResult {
  success: boolean;
  url?: string;
  message: string;
}

/**
 * Deploy a story to a platform
 */
export async function deployStory(config: DeployConfig): Promise<DeployResult> {
  switch (config.platform) {
    case 'github-pages':
      return deployToGitHubPages(config);
    case 'netlify':
      return deployToNetlify(config);
    case 'vercel':
      return deployToVercel(config);
    case 'itch-io':
      return deployToItchIO(config);
    case 's3':
      return deployToS3(config);
    default:
      throw new Error(`Unknown platform: ${config.platform}`);
  }
}

/**
 * Deploy to GitHub Pages
 */
async function deployToGitHubPages(config: DeployConfig): Promise<DeployResult> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Check if git is initialized
    try {
      await execAsync('git rev-parse --git-dir');
    } catch {
      return {
        success: false,
        message: 'Git repository not initialized. Run "git init" first.',
      };
    }

    // Create gh-pages branch if it doesn't exist
    try {
      await execAsync('git show-ref --verify --quiet refs/heads/gh-pages');
    } catch {
      await execAsync('git checkout --orphan gh-pages');
      await execAsync('git rm -rf .');
      await execAsync('git commit --allow-empty -m "Initial gh-pages commit"');
      await execAsync('git checkout main || git checkout master');
    }

    // Copy build to gh-pages branch
    const fs = await import('fs/promises');
    const path = await import('path');

    await execAsync('git checkout gh-pages');
    await execAsync('git rm -rf . || true');

    // Copy build files
    const buildFiles = await fs.readdir(config.buildDir);
    for (const file of buildFiles) {
      const sourcePath = path.join(config.buildDir, file);
      await execAsync(`cp -r "${sourcePath}" .`);
    }

    // Commit and push
    await execAsync('git add .');
    await execAsync('git commit -m "Deploy to GitHub Pages"');
    await execAsync('git push origin gh-pages --force');
    await execAsync('git checkout main || git checkout master');

    // Get repository URL
    const { stdout } = await execAsync('git remote get-url origin');
    const repoUrl = stdout.trim();
    const match = repoUrl.match(/github\.com[:/](.+?)\/(.+?)(\.git)?$/);

    let url = '';
    if (match) {
      const [, owner, repo] = match;
      url = `https://${owner}.github.io/${repo.replace('.git', '')}/`;
    }

    return {
      success: true,
      url,
      message: 'Successfully deployed to GitHub Pages',
    };
  } catch (error) {
    return {
      success: false,
      message: `Deployment failed: ${error}`,
    };
  }
}

/**
 * Deploy to Netlify
 */
async function deployToNetlify(config: DeployConfig): Promise<DeployResult> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Check if Netlify CLI is installed
    try {
      await execAsync('netlify --version');
    } catch {
      return {
        success: false,
        message: 'Netlify CLI not found. Install with: npm install -g netlify-cli',
      };
    }

    // Deploy to Netlify
    const { stdout } = await execAsync(`netlify deploy --prod --dir="${config.buildDir}"`);

    // Extract URL from output
    const urlMatch = stdout.match(/Website URL:\s+(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1] : '';

    return {
      success: true,
      url,
      message: 'Successfully deployed to Netlify',
    };
  } catch (error) {
    return {
      success: false,
      message: `Deployment failed: ${error}`,
    };
  }
}

/**
 * Deploy to Vercel
 */
async function deployToVercel(config: DeployConfig): Promise<DeployResult> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Check if Vercel CLI is installed
    try {
      await execAsync('vercel --version');
    } catch {
      return {
        success: false,
        message: 'Vercel CLI not found. Install with: npm install -g vercel',
      };
    }

    // Deploy to Vercel
    const { stdout } = await execAsync(`vercel --prod --yes "${config.buildDir}"`);

    // Extract URL from output
    const urlMatch = stdout.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1] : '';

    return {
      success: true,
      url,
      message: 'Successfully deployed to Vercel',
    };
  } catch (error) {
    return {
      success: false,
      message: `Deployment failed: ${error}`,
    };
  }
}

/**
 * Deploy to itch.io
 */
async function deployToItchIO(config: DeployConfig): Promise<DeployResult> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Check if butler is installed
    try {
      await execAsync('butler --version');
    } catch {
      return {
        success: false,
        message: 'Butler (itch.io CLI) not found. Install from: https://itch.io/docs/butler/',
      };
    }

    if (!config.projectName) {
      return {
        success: false,
        message: 'Project name required for itch.io deployment',
      };
    }

    // Create zip of build directory
    const path = await import('path');
    const zipFile = path.join(process.cwd(), 'build.zip');
    await execAsync(`cd "${config.buildDir}" && zip -r "${zipFile}" .`);

    // Push to itch.io
    await execAsync(`butler push "${zipFile}" ${config.projectName}:html`);

    // Clean up zip
    const fs = await import('fs/promises');
    await fs.unlink(zipFile);

    return {
      success: true,
      url: `https://${config.projectName}.itch.io`,
      message: 'Successfully deployed to itch.io',
    };
  } catch (error) {
    return {
      success: false,
      message: `Deployment failed: ${error}`,
    };
  }
}

/**
 * Deploy to AWS S3
 */
async function deployToS3(config: DeployConfig): Promise<DeployResult> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Check if AWS CLI is installed
    try {
      await execAsync('aws --version');
    } catch {
      return {
        success: false,
        message: 'AWS CLI not found. Install from: https://aws.amazon.com/cli/',
      };
    }

    if (!config.credentials?.bucket) {
      return {
        success: false,
        message: 'S3 bucket name required',
      };
    }

    const bucket = config.credentials.bucket;
    const region = config.credentials.region || 'us-east-1';

    // Sync to S3
    await execAsync(`aws s3 sync "${config.buildDir}" s3://${bucket} --delete`);

    // Set public read permissions
    await execAsync(
      `aws s3api put-bucket-acl --bucket ${bucket} --acl public-read --region ${region}`
    );

    // Enable website hosting
    await execAsync(
      `aws s3 website s3://${bucket} --index-document index.html --error-document error.html --region ${region}`
    );

    const url = `http://${bucket}.s3-website-${region}.amazonaws.com`;

    return {
      success: true,
      url,
      message: 'Successfully deployed to AWS S3',
    };
  } catch (error) {
    return {
      success: false,
      message: `Deployment failed: ${error}`,
    };
  }
}

/**
 * Verify deployment
 */
export async function verifyDeployment(url: string): Promise<boolean> {
  try {
    const https = await import('https');
    const http = await import('http');

    const protocol = url.startsWith('https') ? https : http;

    return new Promise((resolve) => {
      const request = protocol.get(url, (response) => {
        resolve(response.statusCode === 200);
      });

      request.on('error', () => {
        resolve(false);
      });

      request.setTimeout(5000, () => {
        request.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

/**
 * Generate deployment configuration
 */
export function generateDeployConfig(
  platform: DeployPlatform,
  buildDir: string = 'dist'
): DeployConfig {
  return {
    platform,
    buildDir,
  };
}

/**
 * Deploy command
 */
export const deployCommand: Command = {
  name: 'deploy',
  description: 'Deploy a Whisker story to a platform',
  options: [
    {
      name: 'platform',
      alias: 'p',
      description: 'Deployment platform (github-pages, netlify, vercel, itch-io, s3)',
      type: 'string',
      required: true,
    },
    {
      name: 'build-dir',
      alias: 'd',
      description: 'Build directory',
      type: 'string',
      default: 'dist',
    },
    {
      name: 'project',
      description: 'Project name (for itch.io)',
      type: 'string',
    },
    {
      name: 'bucket',
      description: 'S3 bucket name (for AWS S3)',
      type: 'string',
    },
    {
      name: 'region',
      description: 'AWS region (for AWS S3)',
      type: 'string',
      default: 'us-east-1',
    },
  ],
  execute: async (context: CommandContext) => {
    const { options, cwd } = context;
    const path = await import('path');

    const config: DeployConfig = {
      platform: options.platform as DeployPlatform,
      buildDir: path.resolve(cwd, options['build-dir'] || 'dist'),
      projectName: options.project,
      credentials: {
        bucket: options.bucket,
        region: options.region || 'us-east-1',
      },
    };

    console.log(`Deploying to ${config.platform}...`);
    console.log(`  Build directory: ${config.buildDir}`);
    console.log('');

    const result = await deployStory(config);

    if (result.success) {
      console.log(`✓ ${result.message}`);
      if (result.url) {
        console.log(`  URL: ${result.url}`);
        console.log('');
        console.log('Verifying deployment...');

        const verified = await verifyDeployment(result.url);
        if (verified) {
          console.log('✓ Deployment verified and accessible');
        } else {
          console.log('⚠ Could not verify deployment (may still be processing)');
        }
      }
    } else {
      console.error(`✗ ${result.message}`);
      process.exit(1);
    }
  },
};
