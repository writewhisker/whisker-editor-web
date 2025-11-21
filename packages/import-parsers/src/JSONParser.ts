import type { Parser, ParsedStory } from './types';

export class JSONParser implements Parser {
  public async parse(content: string): Promise<ParsedStory> {
    try {
      const data = JSON.parse(content);
      return data as ParsedStory;
    } catch (error) {
      throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public canParse(content: string): boolean {
    try {
      const data = JSON.parse(content);
      return typeof data === 'object' && data !== null && 'passages' in data;
    } catch {
      return false;
    }
  }

  public getFormat(): string {
    return 'json';
  }
}
