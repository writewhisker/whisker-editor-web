import type { StoryData, Exporter, ExportOptions } from './types';

export class JSONExporter implements Exporter {
  public async export(data: StoryData, options: ExportOptions = { format: 'json' }): Promise<string> {
    const exportData = {
      ...data,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(exportData, null, 2);
  }

  public getFileExtension(): string {
    return 'json';
  }

  public getMimeType(): string {
    return 'application/json';
  }
}
