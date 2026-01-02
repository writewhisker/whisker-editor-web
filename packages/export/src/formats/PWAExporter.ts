/**
 * PWA Exporter
 *
 * Exports stories as Progressive Web Apps with:
 * - Installable web app manifest
 * - Service worker for offline support
 * - Icon generation placeholders
 * - Cache-first strategy for assets
 */

import type { Story } from '@writewhisker/core-ts';
import type {
  ExportContext,
  ExportResult,
  IExporter,
} from '../types';
import { generateHTMLPlayer } from './HTMLPlayerTemplate';

/**
 * PWA export options
 */
export interface PWAExportOptions {
  /** App name (defaults to story title) */
  appName?: string;
  /** Short app name for icons */
  shortName?: string;
  /** App description */
  description?: string;
  /** Theme color for browser chrome */
  themeColor?: string;
  /** Background color for splash screen */
  backgroundColor?: string;
  /** Display mode: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser' */
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  /** Orientation: 'any' | 'portrait' | 'landscape' */
  orientation?: 'any' | 'portrait' | 'landscape';
  /** Icon paths (will use defaults if not provided) */
  icons?: Array<{ src: string; sizes: string; type: string }>;
  /** Cache version for service worker */
  cacheVersion?: string;
  /** Additional URLs to pre-cache */
  additionalCacheUrls?: string[];
}

/**
 * PWA export result with multiple files
 */
export interface PWAExportResult extends ExportResult {
  /** Generated files map */
  files?: Map<string, string>;
}

/**
 * PWA Exporter
 *
 * Creates a complete PWA package with HTML, manifest, and service worker.
 */
export class PWAExporter implements IExporter {
  readonly name = 'PWA Exporter';
  readonly format = 'pwa' as const;
  readonly extension = '.zip';
  readonly mimeType = 'application/zip';

  /**
   * Export a story as a PWA
   */
  async export(context: ExportContext): Promise<PWAExportResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    const files = new Map<string, string>();

    try {
      const story = context.story;
      const pwaOptions = (context.options as PWAExportOptions) || {};

      // Validate story
      if (!story.startPassage) {
        warnings.push('Story has no start passage set');
      }

      // Generate app metadata
      const appName = pwaOptions.appName || story.metadata.title || 'Interactive Story';
      const shortName = pwaOptions.shortName || appName.substring(0, 12);
      const description = pwaOptions.description || story.metadata.description || 'An interactive story';
      const themeColor = pwaOptions.themeColor || '#3498db';
      const backgroundColor = pwaOptions.backgroundColor || '#ffffff';
      const display = pwaOptions.display || 'standalone';
      const orientation = pwaOptions.orientation || 'any';
      const cacheVersion = pwaOptions.cacheVersion || `v${Date.now()}`;

      // Generate index.html
      const storyJSON = JSON.stringify(story.serialize()).replace(/<\/script>/gi, '<\\/script>');
      const indexHTML = this.generateIndexHTML(storyJSON, appName, {
        themeColor,
        description,
      });
      files.set('index.html', indexHTML);

      // Generate manifest.json
      const manifest = this.generateManifest({
        name: appName,
        shortName,
        description,
        themeColor,
        backgroundColor,
        display,
        orientation,
        icons: pwaOptions.icons,
      });
      files.set('manifest.json', manifest);

      // Generate service worker
      const serviceWorker = this.generateServiceWorker(cacheVersion, pwaOptions.additionalCacheUrls);
      files.set('sw.js', serviceWorker);

      // Generate offline page
      const offlineHTML = this.generateOfflinePage(appName);
      files.set('offline.html', offlineHTML);

      // Generate placeholder icons (in real implementation, these would be actual images)
      files.set('icons/icon-192.png', '/* 192x192 PNG icon placeholder */');
      files.set('icons/icon-512.png', '/* 512x512 PNG icon placeholder */');

      // For the main content, use the index.html
      const content = indexHTML;

      // Generate filename
      const safeTitle = appName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const filename = `${safeTitle}_pwa.zip`;

      const duration = Date.now() - startTime;

      return {
        success: true,
        content,
        filename,
        format: this.format,
        size: new Blob([content]).size,
        duration,
        warnings: warnings.length > 0 ? warnings : undefined,
        files,
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
   * Generate the main index.html with PWA meta tags
   */
  private generateIndexHTML(storyJSON: string, title: string, options: {
    themeColor: string;
    description: string;
  }): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${this.escapeHTML(options.description)}">
    <meta name="theme-color" content="${options.themeColor}">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="${this.escapeHTML(title)}">

    <title>${this.escapeHTML(title)}</title>

    <link rel="manifest" href="manifest.json">
    <link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
    <link rel="apple-touch-icon" href="icons/icon-192.png">

    <style>
        ${this.getPlayerStyles()}
    </style>
</head>
<body>
    <div id="whisker-player">
        <div id="story-container">
            <div id="passage-content"></div>
            <div id="choices-container"></div>
        </div>
    </div>

    <script>
        const STORY_DATA = ${storyJSON};
    </script>
    <script>
        ${this.getPlayerScript()}
    </script>
    <script>
        // Register service worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js')
                    .then(reg => console.log('SW registered:', reg.scope))
                    .catch(err => console.error('SW registration failed:', err));
            });
        }
    </script>
</body>
</html>`;
  }

  /**
   * Generate web app manifest
   */
  private generateManifest(options: {
    name: string;
    shortName: string;
    description: string;
    themeColor: string;
    backgroundColor: string;
    display: string;
    orientation: string;
    icons?: Array<{ src: string; sizes: string; type: string }>;
  }): string {
    const manifest = {
      name: options.name,
      short_name: options.shortName,
      description: options.description,
      start_url: '/',
      display: options.display,
      orientation: options.orientation,
      theme_color: options.themeColor,
      background_color: options.backgroundColor,
      icons: options.icons || [
        {
          src: 'icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: 'icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
      ],
      categories: ['games', 'entertainment'],
    };

    return JSON.stringify(manifest, null, 2);
  }

  /**
   * Generate service worker for offline support
   */
  private generateServiceWorker(version: string, additionalUrls: string[] = []): string {
    const cacheUrls = [
      '/',
      '/index.html',
      '/manifest.json',
      '/offline.html',
      '/icons/icon-192.png',
      '/icons/icon-512.png',
      ...additionalUrls,
    ];

    return `// Whisker PWA Service Worker
const CACHE_NAME = 'whisker-story-${version}';
const URLS_TO_CACHE = ${JSON.stringify(cacheUrls, null, 2)};

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('whisker-story-') && name !== CACHE_NAME)
                    .map((name) => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch event - cache-first strategy
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached response if found
                if (response) {
                    return response;
                }

                // Clone the request
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone the response
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(() => {
                    // Return offline page for navigation requests
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }
                    return new Response('Offline', { status: 503 });
                });
            })
    );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
`;
  }

  /**
   * Generate offline fallback page
   */
  private generateOfflinePage(title: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.escapeHTML(title)} - Offline</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: #f5f5f5;
            color: #333;
        }
        .offline-container {
            text-align: center;
            padding: 2rem;
        }
        .offline-icon {
            font-size: 4rem;
            margin-bottom: 1rem;
        }
        h1 {
            margin: 0 0 0.5rem 0;
            font-size: 1.5rem;
        }
        p {
            margin: 0;
            color: #666;
        }
        button {
            margin-top: 1rem;
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: #2980b9;
        }
    </style>
</head>
<body>
    <div class="offline-container">
        <div class="offline-icon">📴</div>
        <h1>You're Offline</h1>
        <p>Please check your internet connection and try again.</p>
        <button onclick="window.location.reload()">Retry</button>
    </div>
</body>
</html>`;
  }

  /**
   * Get player styles
   */
  private getPlayerStyles(): string {
    return `
        * {
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background: #f5f5f5;
            color: #333;
        }
        #whisker-player {
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem;
            min-height: 100vh;
        }
        #story-container {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        #passage-content {
            margin-bottom: 1.5rem;
        }
        #choices-container {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
        }
        .choice-button {
            padding: 1rem 1.5rem;
            font-size: 1rem;
            background: #3498db;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            text-align: left;
            transition: background 0.2s;
        }
        .choice-button:hover {
            background: #2980b9;
        }
        .choice-button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        @media (prefers-color-scheme: dark) {
            body {
                background: #1a1a1a;
                color: #e0e0e0;
            }
            #story-container {
                background: #2a2a2a;
            }
        }
    `;
  }

  /**
   * Get minimal player script
   */
  private getPlayerScript(): string {
    return `
        // Minimal Whisker Player
        class WhiskerPlayer {
            constructor(storyData) {
                this.story = storyData;
                this.currentPassage = storyData.startPassage;
                this.variables = {};

                // Initialize variables
                if (storyData.variables) {
                    Object.entries(storyData.variables).forEach(([name, data]) => {
                        this.variables[name] = data.initial;
                    });
                }

                this.render();
            }

            render() {
                const passage = this.story.passages[this.currentPassage];
                if (!passage) {
                    console.error('Passage not found:', this.currentPassage);
                    return;
                }

                // Render content
                const contentEl = document.getElementById('passage-content');
                contentEl.innerHTML = this.processContent(passage.content || '');

                // Render choices
                const choicesEl = document.getElementById('choices-container');
                choicesEl.innerHTML = '';

                const choices = passage.choices || [];
                choices.forEach((choice, index) => {
                    const button = document.createElement('button');
                    button.className = 'choice-button';
                    button.textContent = choice.text;
                    button.onclick = () => this.selectChoice(choice);
                    choicesEl.appendChild(button);
                });
            }

            processContent(content) {
                // Simple variable interpolation
                return content.replace(/\\$([a-zA-Z_][a-zA-Z0-9_]*)/g, (match, name) => {
                    return this.variables[name] !== undefined ? this.variables[name] : match;
                });
            }

            selectChoice(choice) {
                if (choice.target) {
                    this.currentPassage = choice.target;
                    this.render();
                }
            }
        }

        // Initialize player
        window.addEventListener('DOMContentLoaded', () => {
            window.player = new WhiskerPlayer(STORY_DATA);
        });
    `;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHTML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
