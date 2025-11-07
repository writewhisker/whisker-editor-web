/**
 * EPUB Exporter
 *
 * Exports stories as EPUB format for e-readers and reading apps.
 *
 * Features:
 * - EPUB 3.0 compliant
 * - Markdown rendering
 * - Image embedding
 * - Cover page generation
 * - Choice conditions display
 * - Professional styling
 */

import type { Story } from '@whisker/core-ts';
import type {
  ExportContext,
  ExportResult,
  ExportOptions,
  IExporter,
} from '../types';
import JSZip from 'jszip';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';

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
      if (!context.story.passages || context.story.passages.size === 0) {
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

      // Track embedded images
      const embeddedImages = new Map<string, { filename: string; data: string }>();

      // Generate content
      const { contentOPF, navXHTML, chapters, coverXHTML } = await this.generateEPUBContent(
        context.story,
        context.options,
        embeddedImages,
        warnings
      );

      // Add content.opf
      zip.file('EPUB/content.opf', contentOPF);

      // Add nav.xhtml
      zip.file('EPUB/nav.xhtml', navXHTML);

      // Add cover.xhtml
      zip.file('EPUB/cover.xhtml', coverXHTML);

      // Add CSS stylesheet
      zip.file('EPUB/styles.css', this.generateCSS(context.options));

      // Add chapter files
      for (const chapter of chapters) {
        zip.file(`EPUB/${chapter.filename}`, chapter.content);
      }

      // Add embedded images
      for (const [url, image] of embeddedImages) {
        zip.file(`EPUB/${image.filename}`, image.data, { base64: true });
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
/* Base Styles */
body {
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.8;
  margin: 1em 2em;
  color: #1a1a1a;
  font-size: 1em;
}

/* Cover Page */
.cover {
  text-align: center;
  padding: 20% 0;
  page-break-after: always;
}

.cover h1 {
  font-size: 3em;
  margin: 0.5em 0;
  font-weight: bold;
  color: #000;
}

.cover .author {
  font-size: 1.5em;
  color: #555;
  font-style: italic;
  margin: 1em 0;
}

.cover .description {
  font-size: 1em;
  color: #666;
  margin: 2em 20%;
  line-height: 1.6;
}

/* Headings */
h1 {
  font-size: 2.2em;
  margin: 1.5em 0 0.8em;
  text-align: center;
  color: #000;
  font-weight: bold;
  page-break-before: always;
}

h2 {
  font-size: 1.8em;
  margin: 1.2em 0 0.6em;
  color: #1a1a1a;
  font-weight: bold;
}

h3 {
  font-size: 1.4em;
  margin: 1em 0 0.5em;
  color: #333;
}

/* Paragraphs */
p {
  margin: 0 0 1em;
  text-align: justify;
  text-indent: 1.5em;
  orphans: 2;
  widows: 2;
}

p:first-of-type {
  text-indent: 0;
}

/* Markdown Elements */
strong, b {
  font-weight: bold;
  color: #000;
}

em, i {
  font-style: italic;
}

code {
  font-family: "Courier New", Courier, monospace;
  background: #f5f5f5;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

pre {
  background: #f5f5f5;
  padding: 1em;
  border-radius: 4px;
  overflow-x: auto;
  margin: 1em 0;
}

pre code {
  background: none;
  padding: 0;
}

blockquote {
  margin: 1em 2em;
  padding-left: 1em;
  border-left: 3px solid #ddd;
  font-style: italic;
  color: #555;
}

/* Lists */
ul, ol {
  margin: 1em 0;
  padding-left: 2em;
}

li {
  margin: 0.5em 0;
}

/* Images */
img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 1em auto;
}

/* Choices */
.choices {
  margin: 2em 0;
  page-break-inside: avoid;
}

.choices h2 {
  font-size: 1.3em;
  margin-bottom: 1em;
  text-align: left;
  page-break-before: avoid;
}

.choice {
  margin: 0.8em 0;
  padding: 0.8em 1.2em;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  background: #fafafa;
  page-break-inside: avoid;
}

.choice a {
  color: #0066cc;
  text-decoration: none;
  font-weight: 500;
  font-size: 1.1em;
  display: block;
}

.choice a:hover {
  text-decoration: underline;
}

.choice .condition {
  display: block;
  font-size: 0.9em;
  color: #666;
  margin-top: 0.5em;
  font-style: italic;
}

/* Passage Container */
.passage {
  margin-bottom: 2em;
  page-break-after: always;
}

.passage-title {
  margin-bottom: 1.5em;
}

.passage-content {
  margin: 2em 0;
}

/* Metadata */
.metadata {
  font-size: 0.85em;
  color: #777;
  margin-top: 3em;
  padding-top: 1em;
  border-top: 1px solid #ddd;
  text-align: center;
  font-style: italic;
}

/* Horizontal Rules */
hr {
  border: none;
  border-top: 1px solid #ddd;
  margin: 2em 0;
}

/* Links */
a {
  color: #0066cc;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

/* Page Breaks */
.page-break {
  page-break-after: always;
}
`;
  }

  /**
   * Generate EPUB content files
   */
  private async generateEPUBContent(
    story: Story,
    options: ExportOptions,
    embeddedImages: Map<string, { filename: string; data: string }>,
    warnings: string[]
  ): Promise<{
    contentOPF: string;
    navXHTML: string;
    chapters: Array<{ filename: string; content: string }>;
    coverXHTML: string;
  }> {
    const passages = Array.from(story.passages.values());
    const chapters: Array<{ filename: string; content: string }> = [];

    // Generate chapters for each passage
    for (let index = 0; index < passages.length; index++) {
      const passage = passages[index];
      const filename = `chapter_${String(index + 1).padStart(4, '0')}.xhtml`;
      const content = await this.generateChapterXHTML(passage, index + 1, story, embeddedImages, warnings);
      chapters.push({ filename, content });
    }

    // Generate content.opf (with images)
    const contentOPF = this.generateContentOPF(story, chapters, embeddedImages, options);

    // Generate nav.xhtml
    const navXHTML = this.generateNavXHTML(story, passages);

    // Generate cover.xhtml
    const coverXHTML = this.generateCoverXHTML(story);

    return { contentOPF, navXHTML, chapters, coverXHTML };
  }

  /**
   * Generate content.opf package document
   */
  private generateContentOPF(
    story: Story,
    chapters: Array<{ filename: string }>,
    embeddedImages: Map<string, { filename: string; data: string }>,
    options: ExportOptions
  ): string {
    const metadata = story.metadata;
    const language = options.language || 'en';
    const timestamp = new Date().toISOString();

    // Generate image manifest items
    const imageItems = Array.from(embeddedImages.values()).map((img, idx) => {
      const ext = img.filename.split('.').pop()?.toLowerCase() || 'png';
      const mimeTypes: Record<string, string> = {
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'webp': 'image/webp'
      };
      const mimeType = mimeTypes[ext] || 'image/png';
      return `<item id="image_${idx + 1}" href="${img.filename}" media-type="${mimeType}"/>`;
    }).join('\n    ');

    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="uid">${story.metadata.ifid || story.metadata.id || 'unknown'}</dc:identifier>
    <dc:title>${this.escapeXML(metadata.title || 'Untitled Story')}</dc:title>
    <dc:creator>${this.escapeXML(metadata.author || 'Unknown Author')}</dc:creator>
    <dc:language>${language}</dc:language>
    <dc:date>${timestamp}</dc:date>
    <dc:publisher>Whisker Editor</dc:publisher>
    ${metadata.description ? `<dc:description>${this.escapeXML(metadata.description)}</dc:description>` : ''}
    <meta property="dcterms:modified">${timestamp}</meta>
  </metadata>
  <manifest>
    <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="styles.css" media-type="text/css"/>
    ${chapters.map((ch, i) =>
      `<item id="chapter_${i + 1}" href="${ch.filename}" media-type="application/xhtml+xml"/>`
    ).join('\n    ')}
    ${imageItems}
  </manifest>
  <spine>
    <itemref idref="cover"/>
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
  private async generateChapterXHTML(
    passage: any,
    chapterNum: number,
    story: Story,
    embeddedImages: Map<string, { filename: string; data: string }>,
    warnings: string[]
  ): Promise<string> {
    const content = passage.content || 'No content';
    const choices = passage.choices || [];

    // Process markdown and extract/embed images
    const processedContent = await this.formatContent(content, embeddedImages, warnings);

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
    <div class="passage-title">
      <h1>${this.escapeXML(passage.title)}</h1>
    </div>
    <div class="passage-content">
      ${processedContent}
    </div>
    ${choices.length > 0 ? `
    <div class="choices">
      <h2>Choices</h2>
      ${choices.map((choice: any) => {
        const targetPassage = story.passages.get(choice.target);
        const targetIndex = Array.from(story.passages.keys()).indexOf(choice.target) + 1;
        const targetFilename = `chapter_${String(targetIndex).padStart(4, '0')}.xhtml`;

        // Format choice conditions if they exist
        let conditionText = '';
        if (choice.condition) {
          conditionText = `<span class="condition">Requires: ${this.escapeXML(choice.condition)}</span>`;
        }

        return `<div class="choice">
          <a href="${targetFilename}">${this.escapeXML(choice.text || 'Continue')}</a>
          ${conditionText}
        </div>`;
      }).join('\n      ')}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
  }

  /**
   * Format passage content for EPUB with markdown rendering and image embedding
   */
  private async formatContent(
    content: string,
    embeddedImages: Map<string, { filename: string; data: string }>,
    warnings: string[]
  ): Promise<string> {
    try {
      // Parse markdown to HTML
      let html = await marked.parse(content);

      // Sanitize HTML for EPUB XHTML compliance
      html = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'img',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li',
          'blockquote', 'pre', 'code',
          'hr', 'span', 'div'
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class']
      });

      // Extract and embed images from markdown
      html = await this.processImages(html, embeddedImages, warnings);

      return html;
    } catch (error) {
      warnings.push(`Failed to parse markdown: ${error instanceof Error ? error.message : String(error)}`);
      // Fallback to plain text with paragraph wrapping
      return content
        .split(/\n\n+/)
        .filter(p => p.trim())
        .map(p => `<p>${this.escapeXML(p.trim())}</p>`)
        .join('\n');
    }
  }

  /**
   * Process images in HTML content - extract and embed them
   */
  private async processImages(
    html: string,
    embeddedImages: Map<string, { filename: string; data: string }>,
    warnings: string[]
  ): Promise<string> {
    // Find all image tags
    const imageRegex = /<img\s+([^>]*?src=["']([^"']+)["'][^>]*)>/gi;
    let processedHtml = html;
    const matches = html.matchAll(imageRegex);

    for (const match of matches) {
      const fullTag = match[0];
      const src = match[2];

      // Skip if already embedded or is a data URL
      if (embeddedImages.has(src) || src.startsWith('data:')) {
        continue;
      }

      try {
        // Try to fetch the image (for remote URLs or data URIs)
        if (src.startsWith('http://') || src.startsWith('https://')) {
          // Fetch remote image
          const response = await fetch(src);
          if (!response.ok) {
            warnings.push(`Failed to fetch image: ${src}`);
            continue;
          }

          const blob = await response.blob();
          const base64 = await this.blobToBase64(blob);

          // Generate filename
          const ext = this.getImageExtension(blob.type) || 'png';
          const filename = `images/image_${embeddedImages.size + 1}.${ext}`;

          // Store the image
          embeddedImages.set(src, {
            filename,
            data: base64
          });

          // Update HTML to use embedded image
          processedHtml = processedHtml.replace(
            new RegExp(this.escapeRegex(src), 'g'),
            filename
          );
        } else if (src.startsWith('data:')) {
          // Handle data URIs
          const matches = src.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const [, mimeType, base64Data] = matches;
            const ext = this.getImageExtension(mimeType) || 'png';
            const filename = `images/image_${embeddedImages.size + 1}.${ext}`;

            embeddedImages.set(src, {
              filename,
              data: base64Data
            });

            processedHtml = processedHtml.replace(
              new RegExp(this.escapeRegex(src), 'g'),
              filename
            );
          }
        } else {
          // Local path - add warning
          warnings.push(`Cannot embed local image: ${src}. Images must be URLs or data URIs.`);
        }
      } catch (error) {
        warnings.push(`Error processing image ${src}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return processedHtml;
  }

  /**
   * Convert Blob to base64 string
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Get image file extension from MIME type
   */
  private getImageExtension(mimeType: string): string | null {
    const mimeMap: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/svg+xml': 'svg',
      'image/webp': 'webp'
    };
    return mimeMap[mimeType] || null;
  }

  /**
   * Escape string for use in regex
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Generate cover page XHTML
   */
  private generateCoverXHTML(story: Story): string {
    const metadata = story.metadata;
    const title = metadata.title || 'Untitled Story';
    const author = metadata.author || 'Unknown Author';
    const description = metadata.description || '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>Cover</title>
  <meta charset="UTF-8"/>
  <link rel="stylesheet" type="text/css" href="styles.css"/>
</head>
<body>
  <div class="cover">
    <h1>${this.escapeXML(title)}</h1>
    <p class="author">by ${this.escapeXML(author)}</p>
    ${description ? `<p class="description">${this.escapeXML(description)}</p>` : ''}
    <div class="metadata">
      <p>Created with Whisker Editor</p>
      <p>${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
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
    const passageCount = story.passages.size;
    return 10000 + (passageCount * 2000);
  }
}
