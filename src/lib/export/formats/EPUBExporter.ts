/**
 * EPUB Exporter
 *
 * Exports stories as EPUB format for e-readers and reading apps.
 */

import type { Story } from '../../models/Story';
import type {
  ExportContext,
  ExportResult,
  ExportOptions,
  IExporter,
} from '../types';
import JSZip from 'jszip';

/**
 * EPUB Exporter
 *
 * Creates EPUB 3.0 files that can be read on e-readers, tablets, and reading apps.
 * The EPUB contains the full story with proper navigation and metadata.
 */
export class EPUBExporter implements IExporter {
  readonly name = 'EPUB Exporter';
  readonly format = 'epub' as const;
  readonly extension = '.epub';
  readonly mimeType = 'application/epub+zip';

  /**
   * Export a story to EPUB
   */
  async export(context: ExportContext): Promise<ExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      // Validate story has passages
      if (!context.story.passages || Object.keys(context.story.passages).length === 0) {
        return {
          success: false,
          error: 'Story has no passages to export',
          duration: Date.now() - startTime,
        };
      }

      // Create EPUB structure
      const zip = new JSZip();

      // Add mimetype file (must be first, uncompressed)
      zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

      // Add META-INF/container.xml
      zip.file('META-INF/container.xml', this.generateContainerXML());

      // Generate content
      const { contentOPF, navXHTML, chapters } = this.generateEPUBContent(context.story, context.options);

      // Add content.opf
      zip.file('EPUB/content.opf', contentOPF);

      // Add nav.xhtml
      zip.file('EPUB/nav.xhtml', navXHTML);

      // Add CSS stylesheet
      zip.file('EPUB/styles.css', this.generateCSS(context.options));

      // Add chapter files
      for (const chapter of chapters) {
        zip.file(`EPUB/${chapter.filename}`, chapter.content);
      }

      // Generate EPUB blob
      const blob = await zip.generateAsync({
        type: 'blob',
        mimeType: this.mimeType,
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
      });

      // Calculate file size
      const size = blob.size;

      // Generate filename
      const timestamp = new Date().toISOString().split('T')[0];
      const storyName = context.story.metadata.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${storyName}_${timestamp}.epub`;

      const duration = Date.now() - startTime;

      return {
        success: true,
        content: blob,
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
   * Generate container.xml for EPUB
   */
  private generateContainerXML(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="EPUB/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  }

  /**
   * Generate CSS for EPUB
   */
  private generateCSS(options: ExportOptions): string {
    return `
body {
  font-family: Georgia, serif;
  line-height: 1.6;
  margin: 1em 2em;
  color: #333;
}

h1 {
  font-size: 2em;
  margin: 1em 0 0.5em;
  text-align: center;
  color: #000;
}

h2 {
  font-size: 1.5em;
  margin: 1em 0 0.5em;
  color: #000;
}

p {
  margin: 0 0 1em;
  text-align: justify;
}

.choice {
  margin: 0.5em 0;
  padding: 0.5em 1em;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f9f9f9;
}

.choice a {
  color: #0066cc;
  text-decoration: none;
}

.choice a:hover {
  text-decoration: underline;
}

.passage {
  margin-bottom: 2em;
  page-break-after: always;
}

.metadata {
  font-size: 0.9em;
  color: #666;
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid #ddd;
}
`;
  }

  /**
   * Generate EPUB content files
   */
  private generateEPUBContent(story: Story, options: ExportOptions): {
    contentOPF: string;
    navXHTML: string;
    chapters: Array<{ filename: string; content: string }>;
  } {
    const passages = Object.values(story.passages);
    const chapters: Array<{ filename: string; content: string }> = [];

    // Generate chapters for each passage
    passages.forEach((passage, index) => {
      const filename = `chapter_${String(index + 1).padStart(4, '0')}.xhtml`;
      const content = this.generateChapterXHTML(passage, index + 1, story);
      chapters.push({ filename, content });
    });

    // Generate content.opf
    const contentOPF = this.generateContentOPF(story, chapters, options);

    // Generate nav.xhtml
    const navXHTML = this.generateNavXHTML(story, passages);

    return { contentOPF, navXHTML, chapters };
  }

  /**
   * Generate content.opf package document
   */
  private generateContentOPF(story: Story, chapters: Array<{ filename: string }>, options: ExportOptions): string {
    const metadata = story.metadata;
    const language = options.language || 'en';
    const timestamp = new Date().toISOString();

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${story.id}</dc:identifier>
    <dc:title>${this.escapeXML(metadata.title || 'Untitled Story')}</dc:title>
    <dc:creator>${this.escapeXML(metadata.author || 'Unknown Author')}</dc:creator>
    <dc:language>${language}</dc:language>
    <dc:date>${timestamp}</dc:date>
    <dc:publisher>Whisker Editor</dc:publisher>
    <meta property="dcterms:modified">${timestamp}</meta>
  </metadata>
  <manifest>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    ${chapters.map((ch, i) =>
      `<item id="chapter_${i + 1}" href="${ch.filename}" media-type="application/xhtml+xml"/>`
    ).join('\n    ')}
  </manifest>
  <spine>
    ${chapters.map((_, i) =>
      `<itemref idref="chapter_${i + 1}"/>`
    ).join('\n    ')}
  </spine>
</package>`;
  }

  /**
   * Generate nav.xhtml navigation document
   */
  private generateNavXHTML(story: Story, passages: any[]): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>Navigation</title>
  <meta charset="UTF-8"/>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <nav epub:type="toc">
    <h1>Table of Contents</h1>
    <ol>
      ${passages.map((passage, i) =>
        `<li><a href="chapter_${String(i + 1).padStart(4, '0')}.xhtml">${this.escapeXML(passage.title)}</a></li>`
      ).join('\n      ')}
    </ol>
  </nav>
</body>
</html>`;
  }

  /**
   * Generate chapter XHTML file
   */
  private generateChapterXHTML(passage: any, chapterNum: number, story: Story): string {
    const content = passage.content || 'No content';
    const choices = passage.choices || [];

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${this.escapeXML(passage.title)}</title>
  <meta charset="UTF-8"/>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="passage">
    <h1>${this.escapeXML(passage.title)}</h1>
    <div class="content">
      ${this.formatContent(content)}
    </div>
    ${choices.length > 0 ? `
    <div class="choices">
      <h2>Choices</h2>
      ${choices.map((choice: any) => {
        const targetPassage = story.passages[choice.target];
        const targetIndex = Object.keys(story.passages).indexOf(choice.target) + 1;
        const targetFilename = `chapter_${String(targetIndex).padStart(4, '0')}.xhtml`;
        return `<div class="choice">
          <a href="${targetFilename}">${this.escapeXML(choice.text || 'Continue')}</a>
        </div>`;
      }).join('\n      ')}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
  }

  /**
   * Format passage content for EPUB
   */
  private formatContent(content: string): string {
    // Split into paragraphs and wrap in <p> tags
    const paragraphs = content.split(/\n\n+/);
    return paragraphs
      .filter(p => p.trim())
      .map(p => `<p>${this.escapeXML(p.trim())}</p>`)
      .join('\n      ');
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Validate export options
   */
  validateOptions(options: ExportOptions): string[] {
    const errors: string[] = [];

    if (options.format !== 'epub') {
      errors.push('Invalid format for EPUB exporter');
    }

    return errors;
  }

  /**
   * Estimate export size
   */
  estimateSize(story: Story): number {
    // Rough estimate: 10KB base + 2KB per passage
    const passageCount = Object.keys(story.passages).length;
    return 10000 + (passageCount * 2000);
  }
}
