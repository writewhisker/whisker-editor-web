/**
 * GitHub Actions CI/CD Workflows
 *
 * Utilities for creating GitHub Actions workflows for Whisker stories.
 * Provides validation, testing, deployment, and release automation.
 */

import type { Story } from '@writewhisker/story-models';

export interface GitHubWorkflow {
  name: string;
  on: WorkflowTriggers;
  jobs: Record<string, WorkflowJob>;
  env?: Record<string, string>;
  permissions?: Record<string, string>;
}

export interface WorkflowTriggers {
  push?: {
    branches?: string[];
    paths?: string[];
    tags?: string[];
  };
  pull_request?: {
    branches?: string[];
    paths?: string[];
    types?: string[];
  };
  workflow_dispatch?: {
    inputs?: Record<string, WorkflowInput>;
  };
  schedule?: Array<{ cron: string }>;
  release?: {
    types?: string[];
  };
}

export interface WorkflowInput {
  description: string;
  required?: boolean;
  default?: string;
  type?: 'string' | 'number' | 'boolean' | 'choice';
  options?: string[];
}

export interface WorkflowJob {
  'runs-on': string | string[];
  needs?: string | string[];
  if?: string;
  steps: WorkflowStep[];
  strategy?: {
    matrix?: Record<string, any[]>;
    'fail-fast'?: boolean;
    'max-parallel'?: number;
  };
  env?: Record<string, string>;
  outputs?: Record<string, string>;
}

export interface WorkflowStep {
  name?: string;
  id?: string;
  if?: string;
  uses?: string;
  with?: Record<string, any>;
  run?: string;
  env?: Record<string, string>;
  'continue-on-error'?: boolean;
}

/**
 * Generate validation workflow
 */
export function createValidationWorkflow(): GitHubWorkflow {
  return {
    name: 'Validate Whisker Stories',
    on: {
      push: {
        branches: ['main', 'develop'],
        paths: ['stories/**'],
      },
      pull_request: {
        branches: ['main', 'develop'],
        paths: ['stories/**'],
      },
    },
    jobs: {
      validate: {
        'runs-on': 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout code',
            uses: 'actions/checkout@v4',
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '20',
              cache: 'npm',
            },
          },
          {
            name: 'Install dependencies',
            run: 'npm ci',
          },
          {
            name: 'Validate stories',
            run: 'npm run validate:stories',
          },
          {
            name: 'Check for broken links',
            run: 'npm run check:links',
          },
          {
            name: 'Generate validation report',
            run: 'npm run report:validation',
          },
          {
            name: 'Upload validation report',
            uses: 'actions/upload-artifact@v4',
            with: {
              name: 'validation-report',
              path: 'reports/validation.html',
            },
          },
        ],
      },
    },
  };
}

/**
 * Generate test workflow
 */
export function createTestWorkflow(): GitHubWorkflow {
  return {
    name: 'Test Whisker Stories',
    on: {
      push: {
        branches: ['main', 'develop'],
      },
      pull_request: {
        branches: ['main', 'develop'],
      },
    },
    jobs: {
      test: {
        'runs-on': 'ubuntu-latest',
        strategy: {
          matrix: {
            'node-version': ['18', '20', '22'],
          },
        },
        steps: [
          {
            name: 'Checkout code',
            uses: 'actions/checkout@v4',
          },
          {
            name: 'Setup Node.js ${{ matrix.node-version }}',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '${{ matrix.node-version }}',
              cache: 'npm',
            },
          },
          {
            name: 'Install dependencies',
            run: 'npm ci',
          },
          {
            name: 'Run unit tests',
            run: 'npm test',
          },
          {
            name: 'Run story tests',
            run: 'npm run test:stories',
          },
          {
            name: 'Generate coverage report',
            run: 'npm run coverage',
          },
          {
            name: 'Upload coverage',
            uses: 'codecov/codecov-action@v4',
            with: {
              file: './coverage/coverage-final.json',
            },
          },
        ],
      },
    },
  };
}

/**
 * Generate deployment workflow
 */
export function createDeploymentWorkflow(platform: 'vercel' | 'netlify' | 'github-pages' = 'github-pages'): GitHubWorkflow {
  const baseSteps: WorkflowStep[] = [
    {
      name: 'Checkout code',
      uses: 'actions/checkout@v4',
    },
    {
      name: 'Setup Node.js',
      uses: 'actions/setup-node@v4',
      with: {
        'node-version': '20',
        cache: 'npm',
      },
    },
    {
      name: 'Install dependencies',
      run: 'npm ci',
    },
    {
      name: 'Build stories',
      run: 'npm run build:stories',
    },
  ];

  let deploySteps: WorkflowStep[] = [];

  switch (platform) {
    case 'github-pages':
      deploySteps = [
        {
          name: 'Deploy to GitHub Pages',
          uses: 'peaceiris/actions-gh-pages@v4',
          with: {
            'github_token': '${{ secrets.GITHUB_TOKEN }}',
            'publish_dir': './dist',
          },
        },
      ];
      break;

    case 'vercel':
      deploySteps = [
        {
          name: 'Deploy to Vercel',
          uses: 'amondnet/vercel-action@v25',
          with: {
            'vercel-token': '${{ secrets.VERCEL_TOKEN }}',
            'vercel-org-id': '${{ secrets.VERCEL_ORG_ID }}',
            'vercel-project-id': '${{ secrets.VERCEL_PROJECT_ID }}',
          },
        },
      ];
      break;

    case 'netlify':
      deploySteps = [
        {
          name: 'Deploy to Netlify',
          uses: 'nwtgck/actions-netlify@v3',
          with: {
            'publish-dir': './dist',
            'production-deploy': true,
            'github-token': '${{ secrets.GITHUB_TOKEN }}',
            'deploy-message': 'Deploy from GitHub Actions',
          },
          env: {
            NETLIFY_AUTH_TOKEN: '${{ secrets.NETLIFY_AUTH_TOKEN }}',
            NETLIFY_SITE_ID: '${{ secrets.NETLIFY_SITE_ID }}',
          },
        },
      ];
      break;
  }

  return {
    name: 'Deploy Whisker Stories',
    on: {
      push: {
        branches: ['main'],
      },
      workflow_dispatch: {},
    },
    permissions: {
      contents: 'read',
      pages: 'write',
      'id-token': 'write',
    },
    jobs: {
      deploy: {
        'runs-on': 'ubuntu-latest',
        steps: [...baseSteps, ...deploySteps],
      },
    },
  };
}

/**
 * Generate release workflow
 */
export function createReleaseWorkflow(): GitHubWorkflow {
  return {
    name: 'Release Whisker Story',
    on: {
      push: {
        tags: ['v*'],
      },
    },
    permissions: {
      contents: 'write',
    },
    jobs: {
      release: {
        'runs-on': 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout code',
            uses: 'actions/checkout@v4',
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '20',
              cache: 'npm',
            },
          },
          {
            name: 'Install dependencies',
            run: 'npm ci',
          },
          {
            name: 'Build stories',
            run: 'npm run build:stories',
          },
          {
            name: 'Create release package',
            run: 'npm run package:release',
          },
          {
            name: 'Create GitHub Release',
            uses: 'softprops/action-gh-release@v2',
            with: {
              files: 'release/*',
              'generate_release_notes': true,
            },
          },
        ],
      },
    },
  };
}

/**
 * Generate lint workflow
 */
export function createLintWorkflow(): GitHubWorkflow {
  return {
    name: 'Lint Whisker Stories',
    on: {
      push: {
        branches: ['main', 'develop'],
      },
      pull_request: {
        branches: ['main', 'develop'],
      },
    },
    jobs: {
      lint: {
        'runs-on': 'ubuntu-latest',
        steps: [
          {
            name: 'Checkout code',
            uses: 'actions/checkout@v4',
          },
          {
            name: 'Setup Node.js',
            uses: 'actions/setup-node@v4',
            with: {
              'node-version': '20',
              cache: 'npm',
            },
          },
          {
            name: 'Install dependencies',
            run: 'npm ci',
          },
          {
            name: 'Lint stories',
            run: 'npm run lint:stories',
          },
          {
            name: 'Check formatting',
            run: 'npm run format:check',
          },
          {
            name: 'Type check',
            run: 'npm run type-check',
          },
        ],
      },
    },
  };
}

/**
 * Convert workflow to YAML string
 */
export function workflowToYAML(workflow: GitHubWorkflow): string {
  const yaml: string[] = [];

  yaml.push(`name: ${workflow.name}`);
  yaml.push('');

  // Triggers
  yaml.push('on:');
  for (const [trigger, config] of Object.entries(workflow.on)) {
    if (trigger === 'workflow_dispatch' && Object.keys(config || {}).length === 0) {
      yaml.push(`  ${trigger}:`);
    } else if (config) {
      yaml.push(`  ${trigger}:`);
      yaml.push(stringifyObject(config, 4));
    }
  }
  yaml.push('');

  // Permissions
  if (workflow.permissions) {
    yaml.push('permissions:');
    for (const [perm, value] of Object.entries(workflow.permissions)) {
      yaml.push(`  ${perm}: ${value}`);
    }
    yaml.push('');
  }

  // Jobs
  yaml.push('jobs:');
  for (const [jobName, job] of Object.entries(workflow.jobs)) {
    yaml.push(`  ${jobName}:`);
    yaml.push(`    runs-on: ${job['runs-on']}`);

    if (job.strategy) {
      yaml.push('    strategy:');
      yaml.push(stringifyObject(job.strategy, 6));
    }

    yaml.push('    steps:');
    for (const step of job.steps) {
      yaml.push('      - name: ' + (step.name || 'Step'));
      if (step.uses) {
        yaml.push(`        uses: ${step.uses}`);
      }
      if (step.with) {
        yaml.push('        with:');
        yaml.push(stringifyObject(step.with, 10));
      }
      if (step.run) {
        yaml.push(`        run: ${step.run}`);
      }
      if (step.env) {
        yaml.push('        env:');
        yaml.push(stringifyObject(step.env, 10));
      }
    }
  }

  return yaml.join('\n');
}

function stringifyObject(obj: any, indent: number): string {
  const lines: string[] = [];
  const spaces = ' '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && !Array.isArray(value)) {
      lines.push(`${spaces}${key}:`);
      lines.push(stringifyObject(value, indent + 2));
    } else if (Array.isArray(value)) {
      lines.push(`${spaces}${key}:`);
      for (const item of value) {
        if (typeof item === 'object') {
          lines.push(`${spaces}  -`);
          lines.push(stringifyObject(item, indent + 4));
        } else {
          lines.push(`${spaces}  - ${item}`);
        }
      }
    } else {
      lines.push(`${spaces}${key}: ${value}`);
    }
  }

  return lines.join('\n');
}

/**
 * Create all standard workflows
 */
export function createStandardWorkflows(): Record<string, string> {
  return {
    'validate.yml': workflowToYAML(createValidationWorkflow()),
    'test.yml': workflowToYAML(createTestWorkflow()),
    'lint.yml': workflowToYAML(createLintWorkflow()),
    'deploy.yml': workflowToYAML(createDeploymentWorkflow()),
    'release.yml': workflowToYAML(createReleaseWorkflow()),
  };
}
