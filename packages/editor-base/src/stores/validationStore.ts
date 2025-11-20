/**
 * Validation Store
 *
 * Manages validation state and provides reactive validation results.
 */

import { writable, derived, get } from 'svelte/store';
import type { EditorValidationResult, QualityMetrics, ValidationOptions, AutoFixResult } from '@writewhisker/core-ts';
import { createDefaultValidator } from '@writewhisker/core-ts';
import { createQualityAnalyzer } from '@writewhisker/core-ts';
import { createAutoFixer } from '@writewhisker/core-ts';
import { currentStory } from './storyStateStore';
import type { Story } from '@writewhisker/core-ts';

// Settings persistence
const STORAGE_KEY_OPTIONS = 'whisker_validation_options';
const STORAGE_KEY_AUTO_VALIDATE = 'whisker_auto_validate';
const STORAGE_KEY_VALIDATOR_CONFIG = 'whisker_validator_config';

// Validator configuration interface
export interface ValidatorConfig {
  enabled: boolean;
  severity?: 'error' | 'warning' | 'info';
}

export type ValidatorConfigMap = Record<string, ValidatorConfig>;

// Load settings from localStorage
function loadOptions(): ValidationOptions {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPTIONS);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load validation options:', error);
    }
  }
  return {
    includeWarnings: true,
    includeInfo: true,
    skipSlowChecks: false,
    categories: ['structure', 'links', 'variables', 'content', 'quality'],
  };
}

function loadAutoValidate(): boolean {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTO_VALIDATE);
      if (saved !== null) {
        return saved === 'true';
      }
    } catch (error) {
      console.error('Failed to load auto-validate setting:', error);
    }
  }
  return true;
}

function loadValidatorConfig(): ValidatorConfigMap {
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_VALIDATOR_CONFIG);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Failed to load validator config:', error);
    }
  }
  // Default: all validators enabled
  return {
    missing_start_passage: { enabled: true },
    dead_links: { enabled: true },
    unreachable_passages: { enabled: true },
    empty_passages: { enabled: true },
    undefined_variables: { enabled: true },
    unused_variables: { enabled: true },
  };
}

// Validation state
export const validationResult = writable<EditorValidationResult | null>(null);
export const qualityMetrics = writable<QualityMetrics | null>(null);
export const isValidating = writable<boolean>(false);
export const autoValidate = writable<boolean>(loadAutoValidate());
export const validationOptions = writable<ValidationOptions>(loadOptions());
export const validatorConfig = writable<ValidatorConfigMap>(loadValidatorConfig());

// Validation history
export const validationHistory = writable<EditorValidationResult[]>([]);
const MAX_HISTORY = 20; // Keep last 20 validation results

// Derived stores
export const hasErrors = derived(validationResult, ($result) => {
  return $result ? $result.errorCount > 0 : false;
});

export const hasWarnings = derived(validationResult, ($result) => {
  return $result ? $result.warningCount > 0 : false;
});

export const isValid = derived(validationResult, ($result) => {
  return $result ? $result.valid : true;
});

export const errorCount = derived(validationResult, ($result) => {
  return $result?.errorCount || 0;
});

export const warningCount = derived(validationResult, ($result) => {
  return $result?.warningCount || 0;
});

export const infoCount = derived(validationResult, ($result) => {
  return $result?.infoCount || 0;
});

// Performance metrics
export const performanceMetrics = derived(validationHistory, ($history) => {
  if ($history.length === 0) {
    return null;
  }

  const durations = $history.map(h => h.duration);
  const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  // Calculate trend (comparing first half to second half)
  let trend: 'improving' | 'degrading' | 'stable' = 'stable';
  if ($history.length >= 4) {
    const mid = Math.floor($history.length / 2);
    const recentAvg = durations.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
    const olderAvg = durations.slice(mid).reduce((a, b) => a + b, 0) / (durations.length - mid);

    if (recentAvg < olderAvg * 0.9) {
      trend = 'improving';
    } else if (recentAvg > olderAvg * 1.1) {
      trend = 'degrading';
    }
  }

  return {
    avgDuration: Math.round(avgDuration),
    minDuration,
    maxDuration,
    trend,
    totalRuns: $history.length,
  };
});

// Validator instances
const validator = createDefaultValidator();
const analyzer = createQualityAnalyzer();
const autoFixer = createAutoFixer();

// Debounce timer
let validationTimer: number | null = null;
const VALIDATION_DEBOUNCE_MS = 500;

/**
 * Validation actions
 */
export const validationActions = {
  /**
   * Validate the current story
   */
  validate(story: Story | null = null): void {
    const storyToValidate = story || get(currentStory);

    if (!storyToValidate) {
      validationResult.set(null);
      qualityMetrics.set(null);
      return;
    }

    isValidating.set(true);

    try {
      // Get current validator configuration
      const config = get(validatorConfig);
      const options = get(validationOptions);

      // Filter validators based on configuration
      const enabledValidatorNames = Object.entries(config)
        .filter(([_, cfg]) => cfg.enabled)
        .map(([name, _]) => name);

      // Run validation with filtered validators
      const result = validator.validate(storyToValidate, options, enabledValidatorNames);
      validationResult.set(result);

      // Add to history
      validationHistory.update(history => {
        const newHistory = [result, ...history];
        return newHistory.slice(0, MAX_HISTORY);
      });

      // Run quality analysis
      const metrics = analyzer.analyze(storyToValidate);
      qualityMetrics.set(metrics);
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      isValidating.set(false);
    }
  },

  /**
   * Validate with debounce
   */
  validateDebounced(story: Story | null = null): void {
    if (validationTimer !== null) {
      clearTimeout(validationTimer);
    }

    validationTimer = window.setTimeout(() => {
      this.validate(story);
      validationTimer = null;
    }, VALIDATION_DEBOUNCE_MS);
  },

  /**
   * Clear validation results
   */
  clear(): void {
    validationResult.set(null);
    qualityMetrics.set(null);
    isValidating.set(false);
  },

  /**
   * Update validation options
   */
  setOptions(options: Partial<ValidationOptions>): void {
    validationOptions.update((current) => ({
      ...current,
      ...options,
    }));

    // Re-validate with new options
    if (get(autoValidate)) {
      this.validate();
    }
  },

  /**
   * Toggle auto-validation
   */
  setAutoValidate(enabled: boolean): void {
    autoValidate.set(enabled);

    if (enabled) {
      this.validate();
    }
  },

  /**
   * Get issues for a specific passage
   */
  getPassageIssues(passageId: string) {
    const result = get(validationResult);
    if (!result) return [];

    return result.issues.filter(issue => issue.passageId === passageId);
  },

  /**
   * Get fixable issues
   */
  getFixableIssues() {
    const result = get(validationResult);
    if (!result) return [];

    return result.issues.filter(issue => issue.fixable);
  },

  /**
   * Auto-fix validation issues
   */
  autoFix(story: Story | null = null): AutoFixResult | null {
    const storyToFix = story || get(currentStory);
    const result = get(validationResult);

    if (!storyToFix || !result) {
      return null;
    }

    const fixableIssues = this.getFixableIssues();
    if (fixableIssues.length === 0) {
      return {
        success: true,
        issuesFixed: 0,
        issuesFailed: 0,
        errors: [],
      };
    }

    // Apply fixes
    const fixResult = autoFixer.fix(storyToFix, fixableIssues);

    // Re-validate after fixes
    if (fixResult.issuesFixed > 0) {
      this.validate(storyToFix);
    }

    return fixResult;
  },

  /**
   * Fix a single validation issue
   */
  fixIssue(issueId: string, story: Story | null = null): AutoFixResult | null {
    const storyToFix = story || get(currentStory);
    const result = get(validationResult);

    if (!storyToFix || !result) {
      return null;
    }

    const issue = result.issues.find(i => i.id === issueId);
    if (!issue || !issue.fixable) {
      return null;
    }

    // Apply fix for single issue
    const fixResult = autoFixer.fix(storyToFix, [issue]);

    // Re-validate after fix
    if (fixResult.issuesFixed > 0) {
      this.validate(storyToFix);
    }

    return fixResult;
  },

  /**
   * Get preview description for a single issue fix
   */
  getIssueFixPreview(issueId: string): string {
    const result = get(validationResult);
    if (!result) return '';

    const issue = result.issues.find(i => i.id === issueId);
    if (!issue || !issue.fixable) {
      return 'This issue cannot be auto-fixed';
    }

    return issue.fixDescription || `Fix ${issue.message}`;
  },

  /**
   * Get auto-fix description
   */
  getAutoFixDescription(): string {
    const fixableIssues = this.getFixableIssues();
    return autoFixer.getFixDescription(fixableIssues);
  },

  /**
   * Export validation results as JSON
   */
  exportJSON(): string {
    const result = get(validationResult);
    const metrics = get(qualityMetrics);

    return JSON.stringify({
      validation: result,
      quality: metrics,
      exportDate: new Date().toISOString(),
    }, null, 2);
  },

  /**
   * Export validation results as CSV
   */
  exportCSV(): string {
    const result = get(validationResult);
    if (!result) return '';

    const rows = [
      ['Severity', 'Category', 'Message', 'Description', 'Passage', 'Variable', 'Fixable'],
      ...result.issues.map(issue => [
        issue.severity,
        issue.category,
        issue.message,
        issue.description || '',
        issue.passageTitle || '',
        issue.variableName || '',
        issue.fixable ? 'Yes' : 'No',
      ])
    ];

    return rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  },

  /**
   * Export validation results as Markdown
   */
  exportMarkdown(): string {
    const result = get(validationResult);
    const metrics = get(qualityMetrics);
    if (!result) return '';

    let md = `# Validation Report\n\n`;
    md += `**Date**: ${new Date(result.timestamp).toLocaleString()}\n`;
    md += `**Duration**: ${result.duration}ms\n`;
    md += `**Status**: ${result.valid ? '✅ Valid' : '❌ Invalid'}\n\n`;

    md += `## Summary\n\n`;
    md += `- Errors: ${result.errorCount}\n`;
    md += `- Warnings: ${result.warningCount}\n`;
    md += `- Info: ${result.infoCount}\n\n`;

    if (result.issues.length > 0) {
      md += `## Issues\n\n`;
      const grouped = result.issues.reduce((acc, issue) => {
        if (!acc[issue.category]) acc[issue.category] = [];
        acc[issue.category].push(issue);
        return acc;
      }, {} as Record<string, typeof result.issues>);

      for (const [category, issues] of Object.entries(grouped)) {
        md += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
        for (const issue of issues as typeof result.issues) {
          const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
          md += `${icon} **${issue.message}**\n`;
          if (issue.description) md += `   - ${issue.description}\n`;
          if (issue.passageTitle) md += `   - Passage: ${issue.passageTitle}\n`;
          if (issue.fixable) md += `   - ✅ Auto-fixable\n`;
          md += `\n`;
        }
      }
    }

    if (metrics) {
      md += `## Quality Metrics\n\n`;
      md += `### Structure\n`;
      md += `- Depth: ${metrics.depth}\n`;
      md += `- Branching Factor: ${metrics.branchingFactor.toFixed(2)}\n`;
      md += `- Density: ${(metrics.density * 100).toFixed(1)}%\n`;
      md += `- Reachability: ${metrics.reachabilityScore.toFixed(1)}%\n\n`;

      md += `### Content\n`;
      md += `- Passages: ${metrics.totalPassages}\n`;
      md += `- Choices: ${metrics.totalChoices}\n`;
      md += `- Variables: ${metrics.totalVariables}\n`;
      md += `- Total Words: ${metrics.totalWords}\n`;
      md += `- Avg Words/Passage: ${metrics.avgWordsPerPassage.toFixed(0)}\n\n`;

      md += `### Estimates\n`;
      md += `- Estimated Play Time: ${metrics.estimatedPlayTime} minutes\n`;
      md += `- Estimated Paths: ${metrics.estimatedPaths}\n`;
    }

    return md;
  },

  /**
   * Export validation results as HTML
   */
  exportHTML(): string {
    const result = get(validationResult);
    const metrics = get(qualityMetrics);
    if (!result) return '';

    const date = new Date(result.timestamp).toLocaleString();
    const statusColor = result.valid ? '#10b981' : '#ef4444';
    const statusText = result.valid ? '✅ Valid' : '❌ Invalid';

    let html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Validation Report - ${date}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f3f4f6;
    }
    .container {
      background: white;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1f2937;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }
    .status {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 6px;
      background: ${statusColor}20;
      color: ${statusColor};
      font-weight: bold;
      margin: 10px 0;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }
    .metric {
      background: #f9fafb;
      padding: 15px;
      border-radius: 6px;
      border: 1px solid #e5e7eb;
    }
    .metric-label {
      color: #6b7280;
      font-size: 0.875rem;
      margin-bottom: 5px;
    }
    .metric-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: #1f2937;
    }
    .issue {
      background: #f9fafb;
      border-left: 4px solid;
      padding: 15px;
      margin: 10px 0;
      border-radius: 4px;
    }
    .issue.error {
      border-left-color: #ef4444;
      background: #fef2f2;
    }
    .issue.warning {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }
    .issue.info {
      border-left-color: #3b82f6;
      background: #eff6ff;
    }
    .issue-title {
      font-weight: bold;
      color: #1f2937;
      margin-bottom: 5px;
    }
    .issue-desc {
      color: #6b7280;
      font-size: 0.875rem;
    }
    .issue-meta {
      display: flex;
      gap: 15px;
      margin-top: 8px;
      font-size: 0.75rem;
      color: #9ca3af;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 12px;
      background: #e5e7eb;
      font-size: 0.75rem;
    }
    .badge.fixable {
      background: #d1fae5;
      color: #065f46;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      text-align: left;
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    th {
      background: #f9fafb;
      font-weight: 600;
      color: #374151;
    }
    .filter-btn {
      padding: 6px 12px;
      margin: 5px;
      border: 1px solid #d1d5db;
      background: white;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.875rem;
    }
    .filter-btn.active {
      background: #3b82f6;
      color: white;
      border-color: #3b82f6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 Validation Report</h1>

    <div>
      <strong>Date:</strong> ${date}<br>
      <strong>Duration:</strong> ${result.duration}ms<br>
      <div class="status">${statusText}</div>
    </div>

    <h2>Summary</h2>
    <div class="summary">
      <div class="metric">
        <div class="metric-label">Errors</div>
        <div class="metric-value" style="color: #ef4444">${result.errorCount}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Warnings</div>
        <div class="metric-value" style="color: #f59e0b">${result.warningCount}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Info</div>
        <div class="metric-value" style="color: #3b82f6">${result.infoCount}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Total Issues</div>
        <div class="metric-value">${result.issues.length}</div>
      </div>
    </div>`;

    if (result.issues.length > 0) {
      html += `
    <h2>Issues (${result.issues.length})</h2>
    <div id="issues">`;

      for (const issue of result.issues) {
        html += `
      <div class="issue ${issue.severity}">
        <div class="issue-title">${issue.message}</div>
        ${issue.description ? `<div class="issue-desc">${issue.description}</div>` : ''}
        <div class="issue-meta">
          <span class="badge">${issue.category}</span>
          ${issue.passageTitle ? `<span>📄 ${issue.passageTitle}</span>` : ''}
          ${issue.variableName ? `<span>🔢 ${issue.variableName}</span>` : ''}
          ${issue.fixable ? '<span class="badge fixable">Auto-fixable</span>' : ''}
        </div>
      </div>`;
      }

      html += `
    </div>`;
    }

    if (metrics) {
      html += `
    <h2>Quality Metrics</h2>
    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        <tr><td>Depth</td><td>${metrics.depth}</td></tr>
        <tr><td>Branching Factor</td><td>${metrics.branchingFactor.toFixed(2)}</td></tr>
        <tr><td>Density</td><td>${(metrics.density * 100).toFixed(1)}%</td></tr>
        <tr><td>Reachability Score</td><td>${metrics.reachabilityScore.toFixed(1)}%</td></tr>
        <tr><td>Total Passages</td><td>${metrics.totalPassages}</td></tr>
        <tr><td>Total Choices</td><td>${metrics.totalChoices}</td></tr>
        <tr><td>Total Variables</td><td>${metrics.totalVariables}</td></tr>
        <tr><td>Total Words</td><td>${metrics.totalWords.toLocaleString()}</td></tr>
        <tr><td>Avg Words/Passage</td><td>${metrics.avgWordsPerPassage.toFixed(0)}</td></tr>
        <tr><td>Estimated Play Time</td><td>${metrics.estimatedPlayTime} minutes</td></tr>
        <tr><td>Estimated Paths</td><td>${metrics.estimatedPaths.toLocaleString()}</td></tr>
      </tbody>
    </table>`;
    }

    html += `
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem; text-align: center;">
      Generated with Whisker Editor • ${new Date().toISOString()}
    </div>
  </div>
</body>
</html>`;

    return html;
  },

  /**
   * Clear validation history
   */
  clearHistory(): void {
    validationHistory.set([]);
  },

  /**
   * Update validator configuration
   */
  setValidatorEnabled(validatorName: string, enabled: boolean): void {
    validatorConfig.update(config => ({
      ...config,
      [validatorName]: { ...config[validatorName], enabled },
    }));

    // Re-validate with new configuration
    if (get(autoValidate)) {
      this.validate();
    }
  },

  /**
   * Get all validator names
   */
  getValidatorNames(): string[] {
    return Object.keys(get(validatorConfig));
  },

  /**
   * Reset validator configuration to defaults
   */
  resetValidatorConfig(): void {
    validatorConfig.set({
      missing_start_passage: { enabled: true },
      dead_links: { enabled: true },
      unreachable_passages: { enabled: true },
      empty_passages: { enabled: true },
      undefined_variables: { enabled: true },
      unused_variables: { enabled: true },
    });

    // Re-validate
    if (get(autoValidate)) {
      this.validate();
    }
  },

  /**
   * Import validation results from JSON
   */
  importJSON(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);

      // Validate the imported data structure
      if (!data.validation || typeof data.validation !== 'object') {
        throw new Error('Invalid validation data format');
      }

      const imported = data.validation as EditorValidationResult;

      // Basic validation of required fields
      if (typeof imported.timestamp !== 'number' ||
          typeof imported.valid !== 'boolean' ||
          !Array.isArray(imported.issues)) {
        throw new Error('Missing required validation fields');
      }

      // Set the imported result as current
      validationResult.set(imported);

      // If quality metrics are included, set them too
      if (data.quality) {
        qualityMetrics.set(data.quality as QualityMetrics);
      }

      // Add to history if not already there
      validationHistory.update(history => {
        // Check if this exact timestamp already exists
        const exists = history.some(h => h.timestamp === imported.timestamp);
        if (!exists) {
          const newHistory = [imported, ...history];
          return newHistory.slice(0, MAX_HISTORY);
        }
        return history;
      });

      return true;
    } catch (error) {
      console.error('Failed to import validation results:', error);
      return false;
    }
  },
};

// Save settings to localStorage when they change
validationOptions.subscribe((options) => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_OPTIONS, JSON.stringify(options));
    } catch (error) {
      console.error('Failed to save validation options:', error);
    }
  }
});

autoValidate.subscribe((enabled) => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_AUTO_VALIDATE, String(enabled));
    } catch (error) {
      console.error('Failed to save auto-validate setting:', error);
    }
  }
});

validatorConfig.subscribe((config) => {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_VALIDATOR_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save validator config:', error);
    }
  }
});

// Auto-validate when story changes
let lastStoryJson = '';
currentStory.subscribe((story) => {
  if (!story) {
    validationActions.clear();
    return;
  }

  // Only validate if auto-validate is enabled
  if (!get(autoValidate)) {
    return;
  }

  // Debounce validation to avoid excessive re-validation
  // Check if story actually changed (deep comparison via JSON)
  try {
    const currentStoryJson = JSON.stringify(story.serialize());
    if (currentStoryJson !== lastStoryJson) {
      lastStoryJson = currentStoryJson;
      validationActions.validateDebounced(story);
    }
  } catch (error) {
    // If serialization fails, just validate anyway
    validationActions.validateDebounced(story);
  }
});
