/**
 * Publishing Service for Kids Mode
 *
 * Handles exporting and sharing stories for Minecraft and Roblox.
 * Provides kid-friendly interfaces and achievement tracking.
 */

import type { Story } from '@whisker/core-ts';
import { MinecraftExporter, type MinecraftExportOptions } from '../../export/MinecraftExporter';
import { RobloxExporter, type RobloxExportOptions } from '../../export/RobloxExporter';
import { kidsModeActions } from '../../stores/kidsModeStore';
import { nanoid } from 'nanoid';

export type ExportPlatform = 'minecraft' | 'roblox';

export interface ExportHistory {
  id: string;
  platform: ExportPlatform;
  storyTitle: string;
  filename: string;
  timestamp: Date;
  success: boolean;
}

export interface ShareOptions {
  platform: ExportPlatform;
  includeReadme: boolean;
  generateThumbnail: boolean;
}

/**
 * Publishing Service for Kids Mode
 */
export class PublishingService {
  private static exportHistory: ExportHistory[] = [];

  /**
   * Export story for Minecraft
   */
  static async exportForMinecraft(
    story: Story,
    options?: Partial<MinecraftExportOptions>
  ): Promise<Blob> {
    const defaultOptions: MinecraftExportOptions = {
      datapackName: story.metadata.title.replace(/\s+/g, '_'),
      description: `An adventure created in Whisker Editor`,
      minecraftVersion: '1.20',
      includeNPCs: true,
      includeDialogue: true,
      includeCommands: true,
      ...options,
    };

    try {
      const blob = await MinecraftExporter.export(story, defaultOptions);
      const filename = MinecraftExporter.getSuggestedFilename(story);

      // Track export history
      this.recordExport({
        id: nanoid(),
        platform: 'minecraft',
        storyTitle: story.metadata.title,
        filename,
        timestamp: new Date(),
        success: true,
      });

      // Award achievement on first Minecraft export
      this.checkAndAwardBadges('minecraft');

      return blob;
    } catch (error) {
      // Track failed export
      this.recordExport({
        id: nanoid(),
        platform: 'minecraft',
        storyTitle: story.metadata.title,
        filename: 'failed',
        timestamp: new Date(),
        success: false,
      });

      throw error;
    }
  }

  /**
   * Export story for Roblox
   */
  static async exportForRoblox(
    story: Story,
    options?: Partial<RobloxExportOptions>
  ): Promise<Blob> {
    const defaultOptions: RobloxExportOptions = {
      projectName: story.metadata.title.replace(/\s+/g, '_'),
      description: `A story created in Whisker Editor`,
      includeGUI: true,
      includeDialogueSystem: true,
      includeBadges: true,
      includeDataStore: true,
      ...options,
    };

    try {
      const blob = await RobloxExporter.export(story, defaultOptions);
      const filename = RobloxExporter.getSuggestedFilename(story);

      // Track export history
      this.recordExport({
        id: nanoid(),
        platform: 'roblox',
        storyTitle: story.metadata.title,
        filename,
        timestamp: new Date(),
        success: true,
      });

      // Award achievement on first Roblox export
      this.checkAndAwardBadges('roblox');

      return blob;
    } catch (error) {
      // Track failed export
      this.recordExport({
        id: nanoid(),
        platform: 'roblox',
        storyTitle: story.metadata.title,
        filename: 'failed',
        timestamp: new Date(),
        success: false,
      });

      throw error;
    }
  }

  /**
   * Download blob as file
   */
  static downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get export history
   */
  static getExportHistory(): ExportHistory[] {
    return [...this.exportHistory];
  }

  /**
   * Get successful exports count
   */
  static getSuccessfulExportsCount(platform?: ExportPlatform): number {
    if (platform) {
      return this.exportHistory.filter(
        e => e.success && e.platform === platform
      ).length;
    }
    return this.exportHistory.filter(e => e.success).length;
  }

  /**
   * Clear export history
   */
  static clearHistory(): void {
    this.exportHistory = [];
  }

  /**
   * Record an export in history
   */
  private static recordExport(entry: ExportHistory): void {
    this.exportHistory.push(entry);

    // Keep only last 50 exports
    if (this.exportHistory.length > 50) {
      this.exportHistory = this.exportHistory.slice(-50);
    }
  }

  /**
   * Check and award badges based on export history
   */
  private static checkAndAwardBadges(platform: ExportPlatform): void {
    const totalSuccessful = this.getSuccessfulExportsCount();
    const platformSuccessful = this.getSuccessfulExportsCount(platform);

    // First export ever
    if (totalSuccessful === 1) {
      kidsModeActions.awardBadge('first_export');
    }

    // Platform-specific first export
    if (platformSuccessful === 1) {
      if (platform === 'minecraft') {
        kidsModeActions.awardBadge('minecraft_creator');
      } else {
        kidsModeActions.awardBadge('roblox_creator');
      }
    }

    // Milestone badges
    if (totalSuccessful === 5) {
      kidsModeActions.awardBadge('export_veteran');
    }

    if (totalSuccessful === 10) {
      kidsModeActions.awardBadge('export_master');
    }

    // Both platforms
    const minecraftCount = this.getSuccessfulExportsCount('minecraft');
    const robloxCount = this.getSuccessfulExportsCount('roblox');
    if (minecraftCount > 0 && robloxCount > 0) {
      kidsModeActions.awardBadge('multi_platform_creator');
    }
  }

  /**
   * Generate a simple thumbnail/preview of the story
   * Returns a data URL for an image
   */
  static generateThumbnail(story: Story): string {
    // Check if we're in a browser environment
    if (typeof document === 'undefined') return '';

    // Create a simple canvas-based thumbnail
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 400, 300);
    gradient.addColorStop(0, '#8b5cf6');
    gradient.addColorStop(1, '#ec4899');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 400, 300);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(story.metadata.title, 200, 100);

    // Stats
    const passageCount = story.passages.size;
    ctx.font = '24px Arial';
    ctx.fillText(`${passageCount} Story Pages`, 200, 180);

    // Author
    if (story.metadata.author) {
      ctx.font = '20px Arial';
      ctx.fillText(`by ${story.metadata.author}`, 200, 240);
    }

    return canvas.toDataURL('image/png');
  }

  /**
   * Copy story text to clipboard
   */
  static async copyToClipboard(story: Story): Promise<void> {
    let text = `${story.metadata.title}\n`;
    text += '='.repeat(story.metadata.title.length) + '\n\n';

    if (story.metadata.author) {
      text += `By ${story.metadata.author}\n\n`;
    }

    story.passages.forEach((passage) => {
      text += `## ${passage.title}\n\n`;
      text += `${passage.content}\n\n`;

      if (passage.choices && passage.choices.length > 0) {
        text += 'Choices:\n';
        passage.choices.forEach((choice, i) => {
          text += `${i + 1}. ${choice.text}\n`;
        });
        text += '\n';
      }
    });

    // Check if clipboard API is available
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
    }
  }

  /**
   * Generate QR code for sharing (returns data URL)
   * This is a placeholder - would need a QR code library in production
   */
  static async generateQRCode(url: string): Promise<string> {
    // Check if we're in a browser environment
    if (typeof document === 'undefined') return '';

    // Placeholder: In production, use a library like 'qrcode'
    // For now, return a simple placeholder image
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Simple placeholder
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 200, 200);
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', 100, 100);
    ctx.fillText('(Coming Soon)', 100, 120);

    return canvas.toDataURL('image/png');
  }
}
