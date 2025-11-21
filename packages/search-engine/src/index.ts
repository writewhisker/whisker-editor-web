/**
 * Search Engine
 * Fuzzy search with ranking algorithms
 */

export interface SearchResult<T> {
  item: T;
  score: number;
  matches: number[];
}

export class SearchEngine<T> {
  private items: T[];
  private getSearchableText: (item: T) => string;

  constructor(items: T[], getSearchableText: (item: T) => string) {
    this.items = items;
    this.getSearchableText = getSearchableText;
  }

  search(query: string, limit: number = 10): SearchResult<T>[] {
    if (!query.trim()) return [];

    const results: SearchResult<T>[] = [];
    const lowerQuery = query.toLowerCase();

    for (const item of this.items) {
      const text = this.getSearchableText(item).toLowerCase();
      const score = this.calculateScore(lowerQuery, text);

      if (score > 0) {
        results.push({
          item,
          score,
          matches: this.findMatches(lowerQuery, text),
        });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private calculateScore(query: string, text: string): number {
    if (text.includes(query)) return 100;

    let score = 0;
    let lastIndex = -1;

    for (const char of query) {
      const index = text.indexOf(char, lastIndex + 1);
      if (index === -1) return 0;

      score += 10;
      if (index === lastIndex + 1) score += 5; // Consecutive match bonus
      lastIndex = index;
    }

    return score;
  }

  private findMatches(query: string, text: string): number[] {
    const matches: number[] = [];
    let lastIndex = -1;

    for (const char of query) {
      const index = text.indexOf(char, lastIndex + 1);
      if (index !== -1) {
        matches.push(index);
        lastIndex = index;
      }
    }

    return matches;
  }

  updateItems(items: T[]): void {
    this.items = items;
  }
}
