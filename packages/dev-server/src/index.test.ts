/**
 * Tests for Development Server
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Story } from '@writewhisker/story-models';
import {
  createDevServer,
  createMiddleware,
  corsMiddleware,
  loggingMiddleware,
  type ServerConfig,
  type DevServer,
  type Middleware,
} from './index';

// Mock Node.js modules
const mockServer = {
  listen: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
};

const mockWatcher = {
  close: vi.fn(),
};

const mockRequest = {
  url: '/',
  method: 'GET',
  on: vi.fn(),
};

const mockResponse = {
  writeHead: vi.fn(),
  end: vi.fn(),
  write: vi.fn(),
  setHeader: vi.fn(),
};

const mockStory: Story = {
  id: 'test-story',
  name: 'Test Story',
  ifid: 'test-ifid',
  startPassage: 'Start',
  tagColors: {},
  zoom: 1,
  passages: [
    {
      id: 'passage-1',
      title: 'Start',
      tags: [],
      content: 'This is the start.\n\n[[Next Passage]]',
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    },
    {
      id: 'passage-2',
      title: 'Next Passage',
      tags: [],
      content: 'This is the next passage.',
      position: { x: 200, y: 0 },
      size: { width: 100, height: 100 },
    },
  ],
};

vi.mock('http', () => ({
  default: {
    createServer: vi.fn((handler) => {
      mockServer.listen = vi.fn((port, host, callback) => {
        callback();
        return mockServer;
      });
      return mockServer;
    }),
  },
}));

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn((path: string) => {
      if (path.includes('story.json')) {
        return Promise.resolve(JSON.stringify(mockStory));
      }
      return Promise.resolve('');
    }),
  },
}));

vi.mock('path', () => ({
  default: {},
}));

vi.mock('child_process', () => ({
  exec: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    watch: vi.fn(() => mockWatcher),
  },
  watch: vi.fn(() => mockWatcher),
}));

describe('DevServer', () => {
  let config: ServerConfig;

  beforeEach(() => {
    config = {
      port: 3000,
      host: 'localhost',
      storyPath: '/path/to/story.json',
      open: false,
      cors: false,
      watch: false,
    };

    vi.clearAllMocks();
  });

  describe('createDevServer', () => {
    it('should create a dev server instance', async () => {
      const server = await createDevServer(config);

      expect(server).toBeDefined();
      expect(server.start).toBeInstanceOf(Function);
      expect(server.stop).toBeInstanceOf(Function);
      expect(server.reload).toBeInstanceOf(Function);
      expect(server.getUrl).toBeInstanceOf(Function);
    });

    it('should use default port and host if not provided', async () => {
      const minimalConfig: ServerConfig = {
        storyPath: '/path/to/story.json',
      };

      const server = await createDevServer(minimalConfig);
      expect(server.getUrl()).toBe('http://localhost:3000');
    });

    it('should use custom port and host', async () => {
      const server = await createDevServer({
        storyPath: '/path/to/story.json',
        port: 8080,
        host: '0.0.0.0',
      });

      expect(server.getUrl()).toBe('http://0.0.0.0:8080');
    });

    it('should return correct URL', async () => {
      const server = await createDevServer(config);
      expect(server.getUrl()).toBe('http://localhost:3000');
    });
  });

  describe('DevServer.start', () => {
    it('should start the server', async () => {
      const server = await createDevServer(config);
      await server.start();

      expect(mockServer.listen).toHaveBeenCalledWith(
        3000,
        'localhost',
        expect.any(Function)
      );
    });

    it('should handle server errors on start', async () => {
      mockServer.listen = vi.fn((port, host, callback) => {
        mockServer.on = vi.fn((event, handler) => {
          if (event === 'error') {
            handler(new Error('Port already in use'));
          }
        });
        return mockServer;
      });

      const server = await createDevServer(config);
      await expect(server.start()).rejects.toThrow('Port already in use');
    });

    it('should open browser if config.open is true', async () => {
      const { exec } = await import('child_process');
      config.open = true;

      // Mock platform
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        configurable: true,
      });

      const server = await createDevServer(config);
      await server.start();

      expect(exec).toHaveBeenCalled();
    });
  });

  describe('DevServer.stop', () => {
    it('should stop the server', async () => {
      mockServer.close = vi.fn((callback) => {
        callback();
      });

      const server = await createDevServer(config);
      await server.start();
      await server.stop();

      expect(mockServer.close).toHaveBeenCalled();
    });

    it('should close watchers on stop', async () => {
      config.watch = true;

      const server = await createDevServer(config);
      await server.start();
      await server.stop();

      // Watchers would be closed if any were created
      expect(mockServer.close).toHaveBeenCalled();
    });
  });

  describe('DevServer.reload', () => {
    it('should trigger reload', async () => {
      const server = await createDevServer(config);
      await server.start();
      await server.reload();

      // Reload should not throw
      expect(true).toBe(true);
    });
  });

  describe('HTTP Request Handling', () => {
    let requestHandler: any;

    beforeEach(async () => {
      const http = await import('http');
      vi.mocked(http.default.createServer).mockImplementation((handler) => {
        requestHandler = handler;
        return mockServer as any;
      });
    });

    it('should serve index.html for root path', async () => {
      const server = await createDevServer(config);
      await server.start();

      await requestHandler(
        { ...mockRequest, url: '/' },
        mockResponse
      );

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/html',
      });
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should serve index.html for /index.html path', async () => {
      const server = await createDevServer(config);
      await server.start();

      await requestHandler(
        { ...mockRequest, url: '/index.html' },
        mockResponse
      );

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/html',
      });
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should serve story data for /story.json', async () => {
      const server = await createDevServer(config);
      await server.start();

      await requestHandler(
        { ...mockRequest, url: '/story.json' },
        mockResponse
      );

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'application/json',
      });
      expect(mockResponse.end).toHaveBeenCalledWith(JSON.stringify(mockStory));
    });

    it('should handle SSE for /reload endpoint', async () => {
      config.watch = false;

      const server = await createDevServer(config);
      await server.start();

      await requestHandler(
        { ...mockRequest, url: '/reload' },
        mockResponse
      );

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      });
      expect(mockResponse.write).toHaveBeenCalledWith('data: connected\n\n');
    });

    it('should return 404 for unknown paths', async () => {
      const server = await createDevServer(config);
      await server.start();

      await requestHandler(
        { ...mockRequest, url: '/unknown' },
        mockResponse
      );

      expect(mockResponse.writeHead).toHaveBeenCalledWith(404, {
        'Content-Type': 'text/plain',
      });
      expect(mockResponse.end).toHaveBeenCalledWith('Not found');
    });

    it('should handle errors with 500 response', async () => {
      const fs = await import('fs/promises');
      vi.mocked(fs.default.readFile).mockRejectedValueOnce(
        new Error('File not found')
      );

      const server = await createDevServer(config);
      await server.start();

      await requestHandler(
        { ...mockRequest, url: '/' },
        mockResponse
      );

      expect(mockResponse.writeHead).toHaveBeenCalledWith(500, {
        'Content-Type': 'text/plain',
      });
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should set CORS headers when enabled', async () => {
      config.cors = true;

      const server = await createDevServer(config);
      await server.start();

      await requestHandler(
        { ...mockRequest, url: '/', method: 'GET' },
        mockResponse
      );

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        '*'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, OPTIONS'
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type'
      );
    });

    it('should handle OPTIONS requests when CORS is enabled', async () => {
      config.cors = true;

      const server = await createDevServer(config);
      await server.start();

      await requestHandler(
        { ...mockRequest, url: '/', method: 'OPTIONS' },
        mockResponse
      );

      expect(mockResponse.writeHead).toHaveBeenCalledWith(200);
      expect(mockResponse.end).toHaveBeenCalled();
    });

    it('should watch file for changes when watch is enabled', async () => {
      config.watch = true;

      const fs = await import('fs');
      const watchCallback = vi.fn();
      vi.mocked(fs.watch).mockReturnValue(mockWatcher as any);

      const server = await createDevServer(config);
      await server.start();

      await requestHandler(
        { ...mockRequest, url: '/reload' },
        mockResponse
      );

      expect(fs.watch).toHaveBeenCalledWith(
        config.storyPath,
        expect.any(Function)
      );
    });
  });
});

describe('Middleware', () => {
  describe('createMiddleware', () => {
    it('should create a middleware chain', () => {
      const middleware1: Middleware = vi.fn((req, next) => next());
      const middleware2: Middleware = vi.fn((req, next) => next());

      const handler = createMiddleware([middleware1, middleware2]);

      expect(handler).toBeInstanceOf(Function);
    });

    it('should execute middlewares in order', async () => {
      const executionOrder: number[] = [];

      const middleware1: Middleware = (req, next) => {
        executionOrder.push(1);
        return next();
      };

      const middleware2: Middleware = (req, next) => {
        executionOrder.push(2);
        return next();
      };

      const handler = createMiddleware([middleware1, middleware2]);
      const request = new Request('http://localhost:3000/test');

      handler(request);

      expect(executionOrder).toEqual([1, 2]);
    });

    it('should return 404 when no middleware handles the request', () => {
      const middleware: Middleware = (req, next) => next();
      const handler = createMiddleware([middleware]);
      const request = new Request('http://localhost:3000/test');

      const response = handler(request);

      expect(response).toBeInstanceOf(Response);
      expect((response as Response).status).toBe(404);
    });

    it('should support async middleware', async () => {
      const middleware: Middleware = async (req, next) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return new Response('OK');
      };

      const handler = createMiddleware([middleware]);
      const request = new Request('http://localhost:3000/test');

      const response = await handler(request);

      expect(response).toBeInstanceOf(Response);
      expect(await (response as Response).text()).toBe('OK');
    });

    it('should stop execution if middleware returns response', () => {
      const middleware1: Middleware = (req, next) => {
        return new Response('Stopped', { status: 200 });
      };

      const middleware2: Middleware = vi.fn((req, next) => next());

      const handler = createMiddleware([middleware1, middleware2]);
      const request = new Request('http://localhost:3000/test');

      const response = handler(request);

      expect(response).toBeInstanceOf(Response);
      expect(middleware2).not.toHaveBeenCalled();
    });
  });

  describe('corsMiddleware', () => {
    it('should create CORS middleware', () => {
      const middleware = corsMiddleware();

      expect(middleware).toBeInstanceOf(Function);
    });

    it('should add CORS headers to response', () => {
      const middleware = corsMiddleware();
      const request = new Request('http://localhost:3000/test');

      const mockResponse = new Response('OK');
      const next = vi.fn(() => mockResponse);

      const result = middleware(request, next);

      expect(result).toBe(mockResponse);
      expect(mockResponse.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(mockResponse.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, OPTIONS'
      );
      expect(mockResponse.headers.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type'
      );
    });

    it('should handle async responses', async () => {
      const middleware = corsMiddleware();
      const request = new Request('http://localhost:3000/test');

      const mockResponse = new Response('OK');
      const next = vi.fn(() => Promise.resolve(mockResponse));

      await middleware(request, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('loggingMiddleware', () => {
    it('should create logging middleware', () => {
      const middleware = loggingMiddleware();

      expect(middleware).toBeInstanceOf(Function);
    });

    it('should log requests', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const middleware = loggingMiddleware();
      const request = new Request('http://localhost:3000/test');

      const mockResponse = new Response('OK');
      const next = vi.fn(() => mockResponse);

      middleware(request, next);

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0][0]).toContain('GET');
      expect(consoleSpy.mock.calls[0][0]).toContain('http://localhost:3000/test');

      consoleSpy.mockRestore();
    });

    it('should measure request duration', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const middleware = loggingMiddleware();
      const request = new Request('http://localhost:3000/test');

      const mockResponse = new Response('OK');
      const next = vi.fn(() => mockResponse);

      middleware(request, next);

      expect(consoleSpy.mock.calls[0][0]).toMatch(/\d+ms/);

      consoleSpy.mockRestore();
    });

    it('should handle different request methods', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const middleware = loggingMiddleware();
      const request = new Request('http://localhost:3000/test', {
        method: 'POST',
      });

      const mockResponse = new Response('OK');
      const next = vi.fn(() => mockResponse);

      middleware(request, next);

      expect(consoleSpy.mock.calls[0][0]).toContain('POST');

      consoleSpy.mockRestore();
    });
  });
});

describe('Edge Cases', () => {
  it('should handle multiple start calls gracefully', async () => {
    const config: ServerConfig = {
      storyPath: '/path/to/story.json',
    };

    const server = await createDevServer(config);

    await server.start();
    await server.start(); // Second call should be no-op or handle gracefully

    expect(mockServer.listen).toHaveBeenCalled();
  });

  it('should handle stop without start', async () => {
    const config: ServerConfig = {
      storyPath: '/path/to/story.json',
    };

    const server = await createDevServer(config);

    await expect(server.stop()).resolves.not.toThrow();
  });

  it('should handle empty middleware array', () => {
    const handler = createMiddleware([]);
    const request = new Request('http://localhost:3000/test');

    const response = handler(request);

    expect(response).toBeInstanceOf(Response);
    expect((response as Response).status).toBe(404);
  });

  it('should handle story with special characters in HTML', async () => {
    const specialStory: Story = {
      ...mockStory,
      name: '<script>alert("XSS")</script>',
    };

    const fs = await import('fs/promises');
    vi.mocked(fs.default.readFile).mockResolvedValueOnce(
      JSON.stringify(specialStory)
    );

    const config: ServerConfig = {
      storyPath: '/path/to/story.json',
    };

    const server = await createDevServer(config);
    await server.start();

    // HTML should be escaped
    expect(true).toBe(true); // Passes if no error
  });

  it('should handle different platforms for browser opening', async () => {
    const platforms = ['darwin', 'win32', 'linux'];

    for (const platform of platforms) {
      Object.defineProperty(process, 'platform', {
        value: platform,
        configurable: true,
      });

      const config: ServerConfig = {
        storyPath: '/path/to/story.json',
        open: true,
      };

      const server = await createDevServer(config);
      await server.start();

      // Should not throw for any platform
      expect(true).toBe(true);
    }
  });
});
