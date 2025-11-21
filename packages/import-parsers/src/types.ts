export interface ParsedStory {
  title: string;
  author?: string;
  passages: ParsedPassage[];
  metadata?: Record<string, any>;
}

export interface ParsedPassage {
  id: string;
  title: string;
  content: string;
  tags?: string[];
  position?: { x: number; y: number };
  links?: string[];
}

export interface Parser {
  parse(content: string): Promise<ParsedStory>;
  canParse(content: string): boolean;
  getFormat(): string;
}
