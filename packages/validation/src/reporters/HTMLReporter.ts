/**
 * HTML reporter for human-readable reports
 */

import type { ValidationResult } from '@writewhisker/core-ts';
import type { Reporter } from './Reporter.js';

export class HTMLReporter implements Reporter {
  format(result: ValidationResult): string {
    const errors = result.issues.filter(i => i.severity === 'error');
    const warnings = result.issues.filter(i => i.severity === 'warning');
    const info = result.issues.filter(i => i.severity === 'info');
    const totalIssues = errors.length + warnings.length + info.length;
    const timestamp = new Date().toLocaleString();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Whisker Validation Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: ${result.valid ? '#10b981' : '#ef4444'};
      color: white;
      padding: 30px;
    }
    .header h1 { font-size: 28px; margin-bottom: 10px; }
    .header p { opacity: 0.9; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-card {
      text-align: center;
      padding: 20px;
      background: white;
      border-radius: 6px;
      border: 2px solid #e5e7eb;
    }
    .summary-card h2 { font-size: 36px; margin-bottom: 5px; }
    .summary-card p { color: #6b7280; text-transform: uppercase; font-size: 12px; font-weight: 600; }
    .summary-card.errors { border-color: #ef4444; }
    .summary-card.errors h2 { color: #ef4444; }
    .summary-card.warnings { border-color: #f59e0b; }
    .summary-card.warnings h2 { color: #f59e0b; }
    .summary-card.info { border-color: #3b82f6; }
    .summary-card.info h2 { color: #3b82f6; }
    .issues {
      padding: 30px;
    }
    .issues-section {
      margin-bottom: 30px;
    }
    .issues-section h2 {
      font-size: 20px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e5e7eb;
    }
    .issues-section.errors h2 { color: #ef4444; border-color: #ef4444; }
    .issues-section.warnings h2 { color: #f59e0b; border-color: #f59e0b; }
    .issues-section.info h2 { color: #3b82f6; border-color: #3b82f6; }
    .issue {
      padding: 15px;
      margin-bottom: 10px;
      background: #f9fafb;
      border-left: 4px solid #e5e7eb;
      border-radius: 4px;
    }
    .issue.error { border-left-color: #ef4444; background: #fef2f2; }
    .issue.warning { border-left-color: #f59e0b; background: #fffbeb; }
    .issue.info { border-left-color: #3b82f6; background: #eff6ff; }
    .issue-message { font-weight: 600; margin-bottom: 5px; }
    .issue-path { font-size: 14px; color: #6b7280; font-family: 'Courier New', monospace; margin-bottom: 5px; }
    .issue-suggestion { font-size: 14px; color: #059669; margin-top: 10px; padding: 8px; background: #d1fae5; border-radius: 4px; }
    .footer {
      padding: 20px 30px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${result.valid ? '✓ Validation Passed' : '✗ Validation Failed'}</h1>
      <p>Generated ${timestamp}</p>
    </div>

    <div class="summary">
      <div class="summary-card">
        <h2>${totalIssues}</h2>
        <p>Total Issues</p>
      </div>
      <div class="summary-card errors">
        <h2>${errors.length}</h2>
        <p>Errors</p>
      </div>
      <div class="summary-card warnings">
        <h2>${warnings.length}</h2>
        <p>Warnings</p>
      </div>
      <div class="summary-card info">
        <h2>${info.length}</h2>
        <p>Info</p>
      </div>
    </div>

    <div class="issues">
      ${this.renderIssues('Errors', errors, 'errors', 'error')}
      ${this.renderIssues('Warnings', warnings, 'warnings', 'warning')}
      ${this.renderIssues('Info', info, 'info', 'info')}
    </div>

    <div class="footer">
      <p>Whisker Story Validation Report</p>
    </div>
  </div>
</body>
</html>`;
  }

  private renderIssues(
    title: string,
    issues: Array<{ message: string; path?: string; suggestion?: string }>,
    sectionClass: string,
    issueClass: string
  ): string {
    if (issues.length === 0) return '';

    const issuesHtml = issues.map(issue => `
      <div class="issue ${issueClass}">
        <div class="issue-message">${this.escapeHtml(issue.message)}</div>
        ${issue.path ? `<div class="issue-path">Path: ${this.escapeHtml(issue.path)}</div>` : ''}
        ${issue.suggestion ? `<div class="issue-suggestion">💡 ${this.escapeHtml(issue.suggestion)}</div>` : ''}
      </div>
    `).join('');

    return `
      <div class="issues-section ${sectionClass}">
        <h2>${title} (${issues.length})</h2>
        ${issuesHtml}
      </div>
    `;
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  getExtension(): string {
    return 'html';
  }
}
