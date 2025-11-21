export interface StoryData {
  title: string;
  author?: string;
  passages: Passage[];
  metadata?: Record<string, any>;
}

export interface Passage {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  position?: { x: number; y: number };
  links?: string[];
}

export interface ExportOptions {
  format: 'html' | 'json' | 'markdown' | 'pdf';
  includeMetadata?: boolean;
  compress?: boolean;
}

export interface Exporter {
  export(data: StoryData, options?: ExportOptions): Promise<string | Blob>;
  getFileExtension(): string;
  getMimeType(): string;
}
