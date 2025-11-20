/**
 * PDF Exporter
 *
 * Exports stories as PDF documents with multiple formats:
 * - Playable: Interactive playthrough format (default)
 * - Manuscript: Printable text format for reading/editing
 * - Outline: Story structure and graph visualization
 */

import jsPDF from 'jspdf';
import type { Story, Passage, Choice } from '@writewhisker/core-ts';
import type {
  ExportContext,
  ExportResult,
  ExportOptions,
  IExporter,
} from '../types';

/**
 * PDF Exporter
 *
 * Creates PDF documents from stories with configurable layout and content.
 */
export class PDFExporter implements IExporter {
  readonly name = 'PDF Exporter';
  readonly format = 'pdf' as const;
  readonly extension = '.pdf';
  readonly mimeType = 'application/pdf';

  /**
   * Export a story to PDF
   */
  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Validate story has passages
      if (context.story.passages.size === 0) {
        return {
          success: false,
          error: 'Story has no passages to export',
          duration: Date.now() - startTime,
        };
      }

      // Extract options
      const mode = context.options.pdfMode || 'playable';
      const format = context.options.pdfFormat || 'a4';
      const orientation = context.options.pdfOrientation || 'portrait';
      const includeTOC = context.options.pdfIncludeTOC ?? true;
      const includeGraph = context.options.pdfIncludeGraph ?? false;
      const fontSize = context.options.pdfFontSize || 11;
      const lineHeight = context.options.pdfLineHeight || 1.5;
      const margin = context.options.pdfMargin || 20;

      // Create PDF document
      const pdf = new jsPDF({
        format,
        orientation,
        unit: 'mm',
      });

      // Set default font properties
      pdf.setFontSize(fontSize);
      pdf.setLineHeightFactor(lineHeight);

      // Add cover page
      this.addCoverPage(pdf, context.story, margin);

      // Add table of contents if requested
      if (includeTOC && mode !== 'outline') {
        pdf.addPage();
        this.addTableOfContents(pdf, context.story, margin, fontSize);
      }

      // Add content based on mode
      pdf.addPage();
      switch (mode) {
        case 'manuscript':
          await this.addManuscriptContent(pdf, context.story, margin, fontSize, lineHeight);
          break;
        case 'outline':
          await this.addOutlineContent(pdf, context.story, margin, fontSize);
          break;
        case 'playable':
        default:
          await this.addPlayableContent(pdf, context.story, margin, fontSize, lineHeight);
          break;
      }

      // Add graph visualization if requested
      if (includeGraph && mode === 'outline') {
        warnings.push('Graph visualization in PDF requires html2canvas integration (not yet implemented)');
      }

      // Generate PDF blob
      const pdfBlob = pdf.output('blob');
      const size = pdfBlob.size;

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const storyName = context.story.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${storyName}_${mode}_${timestamp}.pdf`;

      const duration = Date.now() - startTime;

      return {
        success: true,
        content: pdfBlob,
        filename,
        mimeType: this.mimeType,
        size,
        duration,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Add cover page with story metadata
   */
  private addCoverPage(pdf: jsPDF, story: Story, margin: number): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const centerX = pageWidth / 2;

    // Title
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    const titleY = pageHeight / 3;
    pdf.text(story.metadata.title, centerX, titleY, { align: 'center' });

    // Author
    if (story.metadata.author) {
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`by ${story.metadata.author}`, centerX, titleY + 15, { align: 'center' });
    }

    // Description
    if (story.metadata.description) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'italic');
      const descWidth = pageWidth - (margin * 2);
      const descLines = pdf.splitTextToSize(story.metadata.description, descWidth);
      pdf.text(descLines, centerX, titleY + 35, { align: 'center', maxWidth: descWidth });
    }

    // Metadata footer
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const footerY = pageHeight - margin;

    const metadata = [
      `Passages: ${story.passages.size}`,
      `Created: ${new Date(story.metadata.createdAt).toLocaleDateString()}`,
      `Exported: ${new Date().toLocaleDateString()}`,
    ];

    pdf.text(metadata.join(' | '), centerX, footerY, { align: 'center' });
  }

  /**
   * Add table of contents
   */
  private addTableOfContents(pdf: jsPDF, story: Story, margin: number, fontSize: number): void {
    const pageWidth = pdf.internal.pageSize.getWidth();
    let yPos = margin;

    // Title
    pdf.setFontSize(fontSize + 4);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Table of Contents', margin, yPos);
    yPos += 15;

    // Reset font
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');

    // Get passages sorted by name
    const passages = Array.from(story.passages.values()).sort((a: Passage, b: Passage) =>
      a.name.localeCompare(b.name)
    );

    // Add each passage to TOC
    passages.forEach((passage: Passage) => {
      // Check if we need a new page
      if (yPos > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        yPos = margin;
      }

      // Passage name
      const passageName = passage.name;
      const isStart = passage.id === story.startPassage;
      const displayName = isStart ? `${passageName} (Start)` : passageName;

      pdf.text(displayName, margin, yPos);
      yPos += fontSize * 1.5;
    });
  }

  /**
   * Add playable content (interactive playthrough format)
   */
  private async addPlayableContent(
    pdf: jsPDF,
    story: Story,
    margin: number,
    fontSize: number,
    lineHeight: number
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const maxWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Get start passage
    const startPassage = story.startPassage ? story.passages.get(story.startPassage) : undefined;
    if (!startPassage) {
      pdf.text('No start passage defined', margin, yPos);
      return;
    }

    // Build playthrough order (breadth-first traversal)
    const visited = new Set<string>();
    const queue: Passage[] = [startPassage];
    const playthroughOrder: Passage[] = [];

    while (queue.length > 0) {
      const passage = queue.shift()!;

      if (visited.has(passage.id)) {
        continue;
      }

      visited.add(passage.id);
      playthroughOrder.push(passage);

      // Add linked passages to queue
      for (const choice of passage.choices) {
        if (choice.targetPassageId) {
          const target = story.passages.get(choice.targetPassageId);
          if (target && !visited.has(target.id)) {
            queue.push(target);
          }
        }
      }
    }

    // Add each passage in playthrough order
    for (let i = 0; i < playthroughOrder.length; i++) {
      const passage = playthroughOrder[i];

      // Check if we need a new page
      if (yPos > pdf.internal.pageSize.getHeight() - margin * 2) {
        pdf.addPage();
        yPos = margin;
      }

      // Passage header
      pdf.setFontSize(fontSize + 2);
      pdf.setFont('helvetica', 'bold');
      const header = i === 0 ? `${passage.name} (Start)` : passage.name;
      pdf.text(header, margin, yPos);
      yPos += fontSize * 1.8;

      // Passage content
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'normal');

      if (passage.content.trim()) {
        const contentLines = pdf.splitTextToSize(passage.content, maxWidth);
        pdf.text(contentLines, margin, yPos);
        yPos += (contentLines.length * fontSize * lineHeight);
      }

      yPos += fontSize;

      // Choices
      if (passage.choices.length > 0) {
        pdf.setFont('helvetica', 'italic');
        pdf.text('Choices:', margin, yPos);
        yPos += fontSize * 1.5;

        for (const choice of passage.choices) {
          if (yPos > pdf.internal.pageSize.getHeight() - margin) {
            pdf.addPage();
            yPos = margin;
          }

          const target = choice.targetPassageId ? story.passages.get(choice.targetPassageId) : undefined;
          const targetName = target ? target.name : '[No target]';
          const choiceText = `• ${choice.text} → ${targetName}`;

          const choiceLines = pdf.splitTextToSize(choiceText, maxWidth - 5);
          pdf.text(choiceLines, margin + 5, yPos);
          yPos += (choiceLines.length * fontSize * lineHeight);
        }
      }

      yPos += fontSize * 2; // Space between passages
    }
  }

  /**
   * Add manuscript content (printable text format)
   */
  private async addManuscriptContent(
    pdf: jsPDF,
    story: Story,
    margin: number,
    fontSize: number,
    lineHeight: number
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const maxWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Get passages sorted by name
    const passages = Array.from(story.passages.values()).sort((a: Passage, b: Passage) =>
      a.name.localeCompare(b.name)
    );

    // Add each passage
    passages.forEach((passage: Passage) => {
      // Check if we need a new page for the header
      if (yPos > pdf.internal.pageSize.getHeight() - margin * 3) {
        pdf.addPage();
        yPos = margin;
      }

      // Passage header
      pdf.setFontSize(fontSize + 2);
      pdf.setFont('helvetica', 'bold');
      const isStart = passage.id === story.startPassage;
      const header = isStart ? `${passage.name} (Start)` : passage.name;
      pdf.text(header, margin, yPos);
      yPos += fontSize * 1.8;

      // Passage content
      pdf.setFontSize(fontSize);
      pdf.setFont('helvetica', 'normal');

      if (passage.content.trim()) {
        const contentLines = pdf.splitTextToSize(passage.content, maxWidth);

        for (const line of contentLines) {
          if (yPos > pdf.internal.pageSize.getHeight() - margin) {
            pdf.addPage();
            yPos = margin;
          }
          pdf.text(line, margin, yPos);
          yPos += fontSize * lineHeight;
        }
      }

      yPos += fontSize * 2; // Space between passages
    });
  }

  /**
   * Add outline content (story structure view)
   */
  private async addOutlineContent(
    pdf: jsPDF,
    story: Story,
    margin: number,
    fontSize: number
  ): Promise<void> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const maxWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Section: Story Structure
    pdf.setFontSize(fontSize + 4);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Story Structure', margin, yPos);
    yPos += fontSize * 2;

    // Statistics
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', 'normal');

    const totalChoices = Array.from(story.passages.values())
      .reduce((sum: number, p: Passage) => sum + p.choices.length, 0);

    const stats = [
      `Total Passages: ${story.passages.size}`,
      `Total Choices: ${totalChoices}`,
      `Start Passage: ${story.startPassage ? story.passages.get(story.startPassage)?.name : 'Not set'}`,
    ];

    for (const stat of stats) {
      pdf.text(stat, margin, yPos);
      yPos += fontSize * 1.5;
    }

    yPos += fontSize * 2;

    // Section: Passage Details
    if (yPos > pdf.internal.pageSize.getHeight() - margin * 3) {
      pdf.addPage();
      yPos = margin;
    }

    pdf.setFontSize(fontSize + 4);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Passage Details', margin, yPos);
    yPos += fontSize * 2;

    // Get passages sorted by name
    const passages = Array.from(story.passages.values()).sort((a: Passage, b: Passage) =>
      a.name.localeCompare(b.name)
    );

    // Add each passage outline
    pdf.setFontSize(fontSize);
    passages.forEach((passage: Passage) => {
      if (yPos > pdf.internal.pageSize.getHeight() - margin * 2) {
        pdf.addPage();
        yPos = margin;
      }

      // Passage name
      pdf.setFont('helvetica', 'bold');
      const isStart = passage.id === story.startPassage;
      const header = isStart ? `${passage.name} (Start)` : passage.name;
      pdf.text(header, margin, yPos);
      yPos += fontSize * 1.5;

      // Word count
      pdf.setFont('helvetica', 'normal');
      const wordCount = passage.content.split(/\s+/).filter(w => w.length > 0).length;
      pdf.text(`  Words: ${wordCount}`, margin, yPos);
      yPos += fontSize * 1.3;

      // Choices count
      pdf.text(`  Choices: ${passage.choices.length}`, margin, yPos);
      yPos += fontSize * 1.3;

      // List choices
      if (passage.choices.length > 0) {
        pdf.setFont('helvetica', 'italic');
        for (const choice of passage.choices) {
          if (yPos > pdf.internal.pageSize.getHeight() - margin) {
            pdf.addPage();
            yPos = margin;
          }

          const target = choice.targetPassageId ? story.passages.get(choice.targetPassageId) : undefined;
          const targetName = target ? target.name : '[No target]';
          const choiceText = `    → ${choice.text} (to: ${targetName})`;

          const lines = pdf.splitTextToSize(choiceText, maxWidth - 10);
          pdf.text(lines, margin, yPos);
          yPos += (lines.length * fontSize * 1.2);
        }
      }

      yPos += fontSize * 1.5; // Space between passages
    });
  }

  /**
   * Validate export options
   */
  validateOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.format !== 'pdf') {
      errors.push('Invalid format for PDF exporter');
    }

    if (options.pdfFormat && !['a4', 'letter', 'legal'].includes(options.pdfFormat)) {
      errors.push('Invalid PDF format option');
    }

    if (options.pdfOrientation && !['portrait', 'landscape'].includes(options.pdfOrientation)) {
      errors.push('Invalid PDF orientation option');
    }

    if (options.pdfMode && !['playable', 'manuscript', 'outline'].includes(options.pdfMode)) {
      errors.push('Invalid PDF mode option');
    }

    if (options.pdfFontSize && (options.pdfFontSize < 8 || options.pdfFontSize > 24)) {
      errors.push('PDF font size must be between 8 and 24 points');
    }

    if (options.pdfLineHeight && (options.pdfLineHeight < 1 || options.pdfLineHeight > 3)) {
      errors.push('PDF line height must be between 1 and 3');
    }

    if (options.pdfMargin && (options.pdfMargin < 10 || options.pdfMargin > 50)) {
      errors.push('PDF margin must be between 10 and 50mm');
    }

    return errors;
  }

  /**
   * Estimate export size
   */
  estimateSize(story: Story): number {
    // Rough estimate: ~2KB per passage + base overhead
    const baseSize = 10000; // 10KB base
    const perPassageSize = 2000; // 2KB per passage
    return baseSize + (story.passages.size * perPassageSize);
  }
}
