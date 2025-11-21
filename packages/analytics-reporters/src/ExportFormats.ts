import type { Report } from './types';

export class ReportExporter {
  public toJSON(report: Report): string {
    return JSON.stringify(report, null, 2);
  }

  public toCSV(report: Report): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${report.title}`);
    lines.push(`Generated: ${new Date(report.generatedAt).toISOString()}`);
    lines.push(
      `Period: ${new Date(report.period.start).toISOString()} - ${new Date(report.period.end).toISOString()}`
    );
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push(`Total Events,${report.summary.totalEvents}`);
    lines.push(`Unique Sessions,${report.summary.uniqueSessions}`);
    lines.push(`Average Session Duration (ms),${report.summary.averageSessionDuration}`);
    lines.push('');

    // Top Categories
    lines.push('## Top Categories');
    lines.push('Category,Count');
    report.summary.topCategories.forEach(({ category, count }) => {
      lines.push(`${category},${count}`);
    });
    lines.push('');

    // Top Actions
    lines.push('## Top Actions');
    lines.push('Action,Count');
    report.summary.topActions.forEach(({ action, count }) => {
      lines.push(`${action},${count}`);
    });

    return lines.join('\n');
  }

  public toMarkdown(report: Report): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${report.title}`);
    lines.push('');
    lines.push(`**Generated:** ${new Date(report.generatedAt).toISOString()}`);
    lines.push(
      `**Period:** ${new Date(report.period.start).toISOString()} - ${new Date(report.period.end).toISOString()}`
    );
    lines.push('');

    // Summary
    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Events:** ${report.summary.totalEvents}`);
    lines.push(`- **Unique Sessions:** ${report.summary.uniqueSessions}`);
    lines.push(`- **Average Session Duration:** ${Math.round(report.summary.averageSessionDuration / 1000)}s`);
    lines.push('');

    // Top Categories
    lines.push('### Top Categories');
    lines.push('');
    lines.push('| Category | Count |');
    lines.push('|----------|-------|');
    report.summary.topCategories.forEach(({ category, count }) => {
      lines.push(`| ${category} | ${count} |`);
    });
    lines.push('');

    // Top Actions
    lines.push('### Top Actions');
    lines.push('');
    lines.push('| Action | Count |');
    lines.push('|--------|-------|');
    report.summary.topActions.forEach(({ action, count }) => {
      lines.push(`| ${action} | ${count} |`);
    });

    return lines.join('\n');
  }

  public toHTML(report: Report): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>${report.title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .summary { background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; }
  </style>
</head>
<body>
  <h1>${report.title}</h1>
  <p><strong>Generated:</strong> ${new Date(report.generatedAt).toISOString()}</p>
  <p><strong>Period:</strong> ${new Date(report.period.start).toISOString()} - ${new Date(report.period.end).toISOString()}</p>

  <div class="summary">
    <h2>Summary</h2>
    <ul>
      <li><strong>Total Events:</strong> ${report.summary.totalEvents}</li>
      <li><strong>Unique Sessions:</strong> ${report.summary.uniqueSessions}</li>
      <li><strong>Average Session Duration:</strong> ${Math.round(report.summary.averageSessionDuration / 1000)}s</li>
    </ul>
  </div>

  <h2>Top Categories</h2>
  <table>
    <tr><th>Category</th><th>Count</th></tr>
    ${report.summary.topCategories.map(({ category, count }) => `<tr><td>${category}</td><td>${count}</td></tr>`).join('\n')}
  </table>

  <h2>Top Actions</h2>
  <table>
    <tr><th>Action</th><th>Count</th></tr>
    ${report.summary.topActions.map(({ action, count }) => `<tr><td>${action}</td><td>${count}</td></tr>`).join('\n')}
  </table>
</body>
</html>
    `.trim();
  }
}
