/**
 * GitHub Pages Publisher
 *
 * Publishes stories to GitHub Pages using the GitHub API.
 *
 * API Documentation: https://docs.github.com/en/rest
 */

import type { IPublisher, PublishOptions, PublishResult } from './types';
import type { Story } from '@writewhisker/core-ts';
import { StaticSiteExporter } from '@writewhisker/editor-base';

/**
 * GitHub authentication configuration
 */
export interface GitHubAuthConfig {
  /** Personal access token with repo permissions */
  token: string;
}

/**
 * GitHub repository information
 */
export interface GitHubRepoInfo {
  /** Repository owner (username or organization) */
  owner: string;

  /** Repository name */
  repo: string;

  /** Target branch (usually 'gh-pages') */
  branch?: string;
}

/**
 * GitHub Pages Publisher implementation
 *
 * Creates or updates a GitHub repository and deploys stories to GitHub Pages.
 */
export class GitHubPublisher implements IPublisher {
  readonly platform = 'github-pages' as const;
  readonly name = 'GitHub Pages';
  readonly description = 'Deploy to GitHub Pages';
  readonly requiresAuth = true;

  private token: string | null = null;
  private readonly apiBase = 'https://api.github.com';

  /**
   * Set authentication credentials
   */
  authenticate(config: GitHubAuthConfig): void {
    this.token = config.token;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.token !== null && this.token.length > 0;
  }

  /**
   * Get authenticated user information
   */
  async getCurrentUser(): Promise<{ login: string; id: number } | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    try {
      const response = await fetch(`${this.apiBase}/user`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        login: data.login,
        id: data.id,
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  /**
   * Check if repository exists
   */
  private async repositoryExists(owner: string, repo: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.apiBase}/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a new repository
   */
  private async createRepository(
    repoName: string,
    description?: string
  ): Promise<{ owner: string; repo: string } | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.apiBase}/user/repos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: repoName,
          description: description || 'Interactive story created with Whisker Editor',
          auto_init: true, // Initialize with README
          has_pages: true, // Enable GitHub Pages
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to create repository:', error);
        return null;
      }

      const data = await response.json();
      return {
        owner: data.owner.login,
        repo: data.name,
      };
    } catch (error) {
      console.error('Failed to create repository:', error);
      return null;
    }
  }

  /**
   * Get reference (commit SHA) for a branch
   */
  private async getRef(owner: string, repo: string, branch: string): Promise<string | null> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.apiBase}/repos/${owner}/${repo}/git/ref/heads/${branch}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.object.sha;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create a new branch
   */
  private async createBranch(
    owner: string,
    repo: string,
    branch: string,
    fromSha: string
  ): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.apiBase}/repos/${owner}/${repo}/git/refs`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ref: `refs/heads/${branch}`,
          sha: fromSha,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to create branch:', error);
      return false;
    }
  }

  /**
   * Upload file to repository
   */
  private async uploadFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    content: string,
    message: string
  ): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      // Encode content as base64
      const base64Content = btoa(unescape(encodeURIComponent(content)));

      // Check if file exists to get its SHA (for updates)
      let existingSha: string | undefined;
      try {
        const existingResponse = await fetch(
          `${this.apiBase}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
          {
            headers: {
              Authorization: `Bearer ${this.token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          }
        );

        if (existingResponse.ok) {
          const existingData = await existingResponse.json();
          existingSha = existingData.sha;
        }
      } catch (error) {
        // File doesn't exist, that's fine
      }

      // Create or update file
      const response = await fetch(`${this.apiBase}/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          content: base64Content,
          branch,
          ...(existingSha && { sha: existingSha }),
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to upload file:', error);
      return false;
    }
  }

  /**
   * Enable GitHub Pages for a repository
   */
  private async enablePages(owner: string, repo: string, branch: string): Promise<boolean> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(`${this.apiBase}/repos/${owner}/${repo}/pages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: {
            branch,
            path: '/',
          },
        }),
      });

      // 201 = created, 409 = already exists (both are success)
      return response.ok || response.status === 409;
    } catch (error) {
      console.error('Failed to enable pages:', error);
      return false;
    }
  }

  /**
   * Publish story to GitHub Pages
   */
  async publish(story: Story, options: PublishOptions): Promise<PublishResult> {
    // Check authentication
    if (!this.isAuthenticated()) {
      return {
        success: false,
        platform: this.platform,
        error: 'Not authenticated. Please provide a GitHub personal access token.',
      };
    }

    try {
      // Get current user
      const user = await this.getCurrentUser();
      if (!user) {
        return {
          success: false,
          platform: this.platform,
          error: 'Failed to authenticate with GitHub. Please check your token.',
        };
      }

      // Determine repository name
      const repoName = options.githubRepo || this.sanitizeRepoName(options.filename || story.metadata.title);
      const branch = options.githubBranch || 'gh-pages';

      // Check if repository exists
      const repoExists = await this.repositoryExists(user.login, repoName);

      let owner = user.login;
      let repo = repoName;

      if (!repoExists) {
        // Create repository
        const created = await this.createRepository(repoName, options.description || story.metadata.description);
        if (!created) {
          return {
            success: false,
            platform: this.platform,
            error: 'Failed to create GitHub repository',
          };
        }

        owner = created.owner;
        repo = created.repo;

        // Wait a moment for GitHub to initialize the repo
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Export story as HTML
      const exporter = new StaticSiteExporter();
      const exportResult = await exporter.export({
        story,
        options: {
          format: 'html-standalone',
          filename: 'index',
          theme: options.defaultTheme,
        },
      });

      if (!exportResult.success) {
        return {
          success: false,
          platform: this.platform,
          error: exportResult.error || 'Failed to export story',
        };
      }

      // Get main branch ref
      const mainRef = await this.getRef(owner, repo, 'main') || await this.getRef(owner, repo, 'master');
      if (!mainRef) {
        return {
          success: false,
          platform: this.platform,
          error: 'Failed to get repository reference',
        };
      }

      // Create or get gh-pages branch
      const branchExists = await this.getRef(owner, repo, branch);
      if (!branchExists) {
        const created = await this.createBranch(owner, repo, branch, mainRef);
        if (!created) {
          return {
            success: false,
            platform: this.platform,
            error: `Failed to create ${branch} branch`,
          };
        }
      }

      // Upload HTML file
      const uploadSuccess = await this.uploadFile(
        owner,
        repo,
        branch,
        'index.html',
        exportResult.content as string,
        `Update story: ${story.metadata.title}`
      );

      if (!uploadSuccess) {
        return {
          success: false,
          platform: this.platform,
          error: 'Failed to upload file to GitHub',
        };
      }

      // Enable GitHub Pages
      await this.enablePages(owner, repo, branch);

      // Construct GitHub Pages URL
      const url = `https://${owner}.github.io/${repo}/`;

      return {
        success: true,
        platform: this.platform,
        url,
        metadata: {
          owner,
          repo,
          branch,
          username: user.login,
        },
      };
    } catch (error) {
      return {
        success: false,
        platform: this.platform,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Sanitize repository name (GitHub requirements)
   */
  private sanitizeRepoName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 100) // GitHub repo name limit
      || 'story';
  }
}
