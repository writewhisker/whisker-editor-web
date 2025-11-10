/**
 * Kids Publishing Service
 * Handle publishing stories to kid-safe platforms
 */

import type { Story } from '@whisker/core-ts';

export interface PublishOptions {
  platform: 'web' | 'app' | 'classroom';
  visibility: 'public' | 'private' | 'unlisted';
  parentalApprovalRequired: boolean;
}

export interface PublishResult {
  success: boolean;
  url?: string;
  shareCode?: string;
  error?: string;
}

export interface ExportHistoryItem {
  storyTitle: string;
  platform: 'minecraft' | 'roblox' | 'web';
  timestamp: number;
  success: boolean;
}

export class PublishingService {
  private static exportHistory: ExportHistoryItem[] = [];

  static getExportHistory(): ExportHistoryItem[] {
    return this.exportHistory;
  }

  static addToHistory(item: ExportHistoryItem): void {
    this.exportHistory.push(item);
  }

  async publish(story: Story, options: PublishOptions): Promise<PublishResult> {
    // Validate story is kid-safe
    const validation = this.validateStory(story);
    if (!validation.safe) {
      return {
        success: false,
        error: validation.reason || 'Story failed safety validation',
      };
    }

    // In a real implementation, this would upload to a server
    // For now, return a mock result
    return {
      success: true,
      url: `https://whisker.kids/story/${story.id}`,
      shareCode: `KIDS-${story.id.substring(0, 8).toUpperCase()}`,
    };
  }

  validateStory(story: Story): { safe: boolean; reason?: string } {
    // Basic validation - in reality this would be much more comprehensive
    const passages = Array.from(story.passages.values());

    // Check for inappropriate content (very simplified)
    const blockedWords = ['violence', 'weapon', 'blood'];
    for (const passage of passages) {
      const content = ((passage as any).content || '').toLowerCase();
      for (const word of blockedWords) {
        if (content.includes(word)) {
          return {
            safe: false,
            reason: `Story contains potentially inappropriate content: "${word}"`,
          };
        }
      }
    }

    return { safe: true };
  }

  async unpublish(storyId: string): Promise<{ success: boolean; error?: string }> {
    // In a real implementation, this would remove from server
    return { success: true };
  }
}

export const publishingService = new PublishingService();
