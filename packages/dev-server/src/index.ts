/**
 * Development Server
 *
 * Local development server for Whisker stories with live reload.
 */

import type { Story } from '@writewhisker/story-models';

/**
 * Server configuration
 */
export interface ServerConfig {
  port?: number;
  host?: string;
  storyPath: string;
  open?: boolean;
  cors?: boolean;
  watch?: boolean;
}

/**
 * Server instance
 */
export interface DevServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  reload(): Promise<void>;
  getUrl(): string;
}

/**
 * Request handler
 */
export type RequestHandler = (request: Request) => Response | Promise<Response>;

/**
 * Middleware function
 */
export type Middleware = (request: Request, next: () => Response | Promise<Response>) => Response | Promise<Response>;

/**
 * Create a development server
 */
export async function createDevServer(config: ServerConfig): Promise<DevServer> {
  const port = config.port || 3000;
  const host = config.host || 'localhost';
  const url = `http://${host}:${port}`;

  let server: any = null;
  let watchers: any[] = [];

  const start = async () => {
    const http = await import('http');
    const fs = await import('fs/promises');
    const path = await import('path');

    // Create HTTP server
    server = http.createServer(async (req, res) => {
      // Set CORS headers if enabled
      if (config.cors) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
      }

      // Route requests
      const url = req.url || '/';

      try {
        if (url === '/' || url === '/index.html') {
          // Serve main HTML
          const html = await generateHTML(config.storyPath);
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(html);
        } else if (url === '/story.json') {
          // Serve story data
          const story = await fs.readFile(config.storyPath, 'utf-8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(story);
        } else if (url === '/reload') {
          // SSE endpoint for live reload
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          });

          // Send initial connection message
          res.write('data: connected\n\n');

          // Watch for file changes
          if (config.watch) {
            const watcher = watchFile(config.storyPath, () => {
              res.write('data: reload\n\n');
            });
            watchers.push(watcher);

            req.on('close', () => {
              watcher.close();
              watchers = watchers.filter(w => w !== watcher);
            });
          }
        } else {
          // 404
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not found');
        }
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`Server error: ${error}`);
      }
    });

    // Start server
    await new Promise<void>((resolve, reject) => {
      server.listen(port, host, () => {
        console.log(`\nDev server running at ${url}`);
        console.log(`Story: ${config.storyPath}\n`);
        resolve();
      });

      server.on('error', reject);
    });

    // Open browser if requested
    if (config.open) {
      await openBrowser(url);
    }
  };

  const stop = async () => {
    // Close watchers
    for (const watcher of watchers) {
      watcher.close();
    }
    watchers = [];

    // Close server
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('Dev server stopped');
          resolve();
        });
      });
      server = null;
    }
  };

  const reload = async () => {
    console.log('Reloading...');
    // Reload will be triggered by file watcher
  };

  const getUrl = () => url;

  return {
    start,
    stop,
    reload,
    getUrl,
  };
}

/**
 * Generate HTML for development
 */
async function generateHTML(storyPath: string): Promise<string> {
  const fs = await import('fs/promises');
  const storyContent = await fs.readFile(storyPath, 'utf-8');
  const story: Story = JSON.parse(storyContent);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(story.name)} - Development</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 2rem;
    }

    .dev-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #ff9800;
      color: white;
      padding: 0.5rem 1rem;
      text-align: center;
      font-weight: 600;
      z-index: 1000;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    .container {
      max-width: 800px;
      margin: 3rem auto 0;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 1rem;
      color: #2c3e50;
    }

    .passage {
      margin: 2rem 0;
    }

    .passage-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: #34495e;
    }

    .passage-content {
      white-space: pre-wrap;
      margin-bottom: 1rem;
    }

    .link {
      display: inline-block;
      margin: 0.5rem 0.5rem 0.5rem 0;
      padding: 0.5rem 1rem;
      background: #3498db;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      transition: background 0.2s;
    }

    .link:hover {
      background: #2980b9;
    }

    .debug-info {
      margin-top: 2rem;
      padding: 1rem;
      background: #ecf0f1;
      border-radius: 4px;
      font-family: monospace;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="dev-banner">
    🔧 Development Mode - Auto-reload enabled
  </div>

  <div class="container">
    <h1 id="story-title">${escapeHTML(story.name)}</h1>
    <div id="story"></div>
    <div class="debug-info">
      <strong>Debug Info:</strong><br>
      Current Passage: <span id="current-passage"></span><br>
      Total Passages: ${story.passages.length}
    </div>
  </div>

  <script>
    const storyData = ${JSON.stringify(story)};
    let currentPassage = storyData.startPassage;

    function renderPassage(passageTitle) {
      const passage = storyData.passages.find(p => p.title === passageTitle);
      if (!passage) {
        return '<p>Passage not found: ' + passageTitle + '</p>';
      }

      let html = '<div class="passage">';
      html += '<h2 class="passage-title">' + escapeHTML(passage.title) + '</h2>';
      html += '<div class="passage-content">' + processContent(passage.content) + '</div>';
      html += '</div>';

      return html;
    }

    function processContent(content) {
      return content.replace(/\\[\\[([^\\]|]+)(?:\\|([^\\]]+))?\\]\\]/g, (match, p1, p2) => {
        const text = p2 ? p1 : p1;
        const target = p2 || p1;
        return '<a href="#" class="link" onclick="navigateTo(\\'' + target + '\\'); return false;">' + escapeHTML(text) + '</a>';
      });
    }

    function navigateTo(passageTitle) {
      currentPassage = passageTitle;
      render();
    }

    function render() {
      document.getElementById('story').innerHTML = renderPassage(currentPassage);
      document.getElementById('current-passage').textContent = currentPassage;
    }

    function escapeHTML(str) {
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // Live reload
    const eventSource = new EventSource('/reload');
    eventSource.onmessage = (event) => {
      if (event.data === 'reload') {
        console.log('Story updated, reloading...');
        location.reload();
      }
    };

    eventSource.onerror = () => {
      console.log('Lost connection to dev server');
    };

    // Initial render
    render();
  </script>
</body>
</html>`;
}

/**
 * Watch a file for changes
 */
function watchFile(filePath: string, onChange: () => void): any {
  const fs = require('fs');
  const watcher = fs.watch(filePath, (eventType: string) => {
    if (eventType === 'change') {
      onChange();
    }
  });
  return watcher;
}

/**
 * Open browser
 */
async function openBrowser(url: string): Promise<void> {
  const { exec } = await import('child_process');
  const platform = process.platform;

  let command: string;
  if (platform === 'darwin') {
    command = `open ${url}`;
  } else if (platform === 'win32') {
    command = `start ${url}`;
  } else {
    command = `xdg-open ${url}`;
  }

  exec(command);
}

/**
 * Escape HTML
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create middleware chain
 */
export function createMiddleware(middlewares: Middleware[]): RequestHandler {
  return (request: Request) => {
    let index = 0;

    const next = (): Response | Promise<Response> => {
      if (index >= middlewares.length) {
        return new Response('Not found', { status: 404 });
      }

      const middleware = middlewares[index++];
      return middleware(request, next);
    };

    return next();
  };
}

/**
 * CORS middleware
 */
export function corsMiddleware(): Middleware {
  return (request, next) => {
    const response = next();

    if (response instanceof Response) {
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
    }

    return response;
  };
}

/**
 * Logging middleware
 */
export function loggingMiddleware(): Middleware {
  return (request, next) => {
    const start = Date.now();
    const response = next();
    const duration = Date.now() - start;

    console.log(`${request.method} ${request.url} - ${duration}ms`);

    return response;
  };
}
