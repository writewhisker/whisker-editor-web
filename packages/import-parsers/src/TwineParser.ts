import type { Parser, ParsedStory, ParsedPassage } from './types';

export class TwineParser implements Parser {
  public async parse(content: string): Promise<ParsedStory> {
    const passages: ParsedPassage[] = [];
    const passageRegex = /::([^\n]+)\s*(?:\[([^\]]+)\])?\s*(?:{([^}]+)})?\n((?:.*\n)*?)(?=\n::|$)/g;

    let match;
    while ((match = passageRegex.exec(content)) !== null) {
      const title = match[1].trim();
      const tags = match[2] ? match[2].split(/\s+/).filter(Boolean) : [];
      const position = match[3] ? this.parsePosition(match[3]) : undefined;
      const passageContent = match[4].trim();
      const links = this.extractLinks(passageContent);

      passages.push({
        id: this.generateId(title),
        title,
        content: passageContent,
        tags,
        position,
        links,
      });
    }

    return {
      title: 'Imported Story',
      passages,
    };
  }

  public canParse(content: string): boolean {
    return content.includes('::') && content.includes('[[');
  }

  public getFormat(): string {
    return 'twine';
  }

  private parsePosition(posStr: string): { x: number; y: number } | undefined {
    const match = posStr.match(/(\d+),(\d+)/);
    if (match) {
      return { x: parseInt(match[1]), y: parseInt(match[2]) };
    }
    return undefined;
  }

  private extractLinks(content: string): string[] {
    const linkRegex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g;
    const links: string[] = [];
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      links.push(match[2] || match[1]);
    }

    return links;
  }

  private generateId(title: string): string {
    return title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
}
