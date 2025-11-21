import type { StoryData, Exporter, ExportOptions } from './types';

export class HTMLExporter implements Exporter {
  public async export(data: StoryData, options: ExportOptions = { format: 'html' }): Promise<string> {
    const passages = data.passages.map(p => `
      <div class="passage" data-id="${p.id}">
        <h2>${this.escapeHtml(p.title)}</h2>
        <div class="content">${this.escapeHtml(p.content)}</div>
        ${p.tags ? `<div class="tags">${p.tags.map(t => `<span class="tag">${this.escapeHtml(t)}</span>`).join('')}</div>` : ''}
      </div>
    `).join('\n');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(data.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #333; }
    .passage { margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-radius: 8px; }
    .passage h2 { margin-top: 0; color: #2c3e50; }
    .content { line-height: 1.6; }
    .tags { margin-top: 10px; }
    .tag { display: inline-block; padding: 4px 8px; background: #e0e0e0; border-radius: 4px; margin-right: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(data.title)}</h1>
  ${data.author ? `<p><strong>By:</strong> ${this.escapeHtml(data.author)}</p>` : ''}
  ${passages}
</body>
</html>
    `.trim();
  }

  public getFileExtension(): string {
    return 'html';
  }

  public getMimeType(): string {
    return 'text/html';
  }

  private escapeHtml(text: string): string {
    const div = typeof document !== 'undefined' ? document.createElement('div') : null;
    if (div) {
      div.textContent = text;
      return div.innerHTML;
    }
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
