/**
 * Tests for Whisker CLI
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WhiskerCLI, createCLI, logInfo, logSuccess, logError, logWarn, spinner } from './index.js';
import type { Command } from './types.js';

describe('WhiskerCLI', () => {
  let cli: WhiskerCLI;

  beforeEach(() => {
    cli = new WhiskerCLI();
  });

  describe('registerCommand', () => {
    it('should register a command', () => {
      const command: Command = {
        name: 'test',
        description: 'Test command',
        execute: vi.fn(),
      };

      cli.registerCommand(command);
      expect(cli['commands'].has('test')).toBe(true);
    });

    it('should register multiple commands', () => {
      const command1: Command = {
        name: 'test1',
        description: 'Test command 1',
        execute: vi.fn(),
      };
      const command2: Command = {
        name: 'test2',
        description: 'Test command 2',
        execute: vi.fn(),
      };

      cli.registerCommand(command1);
      cli.registerCommand(command2);

      expect(cli['commands'].size).toBe(2);
      expect(cli['commands'].has('test1')).toBe(true);
      expect(cli['commands'].has('test2')).toBe(true);
    });
  });

  describe('parseArgs', () => {
    it('should parse command name', () => {
      const result = cli.parseArgs(['init']);
      expect(result.command).toBe('init');
      expect(result.args).toEqual([]);
      expect(result.options).toEqual({});
    });

    it('should parse positional arguments', () => {
      const result = cli.parseArgs(['init', 'my-project']);
      expect(result.command).toBe('init');
      expect(result.args).toEqual(['my-project']);
    });

    it('should parse boolean flags', () => {
      const result = cli.parseArgs(['init', '--git', '-t']);
      expect(result.options).toEqual({ git: true, t: true });
    });

    it('should parse options with values', () => {
      const result = cli.parseArgs(['init', '--template', 'basic', '--name', 'MyProject']);
      expect(result.options).toEqual({ template: 'basic', name: 'MyProject' });
    });

    it('should parse mixed arguments and options', () => {
      const result = cli.parseArgs(['init', 'my-project', '--template', 'basic', '-g']);
      expect(result.command).toBe('init');
      expect(result.args).toEqual(['my-project']);
      expect(result.options).toEqual({ template: 'basic', g: true });
    });

    it('should handle empty args', () => {
      const result = cli.parseArgs([]);
      expect(result.command).toBeUndefined();
      expect(result.args).toEqual([]);
      expect(result.options).toEqual({});
    });
  });

  describe('execute', () => {
    it('should execute registered command', async () => {
      const executeMock = vi.fn();
      const command: Command = {
        name: 'test',
        description: 'Test command',
        execute: executeMock,
      };

      cli.registerCommand(command);
      await cli.execute(['test']);

      expect(executeMock).toHaveBeenCalledWith({
        cwd: expect.any(String),
        args: [],
        options: {},
      });
    });

    it('should pass arguments to command', async () => {
      const executeMock = vi.fn();
      const command: Command = {
        name: 'test',
        description: 'Test command',
        execute: executeMock,
      };

      cli.registerCommand(command);
      await cli.execute(['test', 'arg1', '--option', 'value']);

      expect(executeMock).toHaveBeenCalledWith({
        cwd: expect.any(String),
        args: ['arg1'],
        options: { option: 'value' },
      });
    });

    it('should show help when command is "help"', async () => {
      const showHelpSpy = vi.spyOn(cli, 'showHelp');
      await cli.execute(['help']);
      expect(showHelpSpy).toHaveBeenCalled();
    });

    it('should show help when no command provided', async () => {
      const showHelpSpy = vi.spyOn(cli, 'showHelp');
      await cli.execute([]);
      expect(showHelpSpy).toHaveBeenCalled();
    });

    it('should exit with error for unknown command', async () => {
      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await cli.execute(['unknown']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Unknown command'));
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });

    it('should handle command execution errors', async () => {
      const error = new Error('Command failed');
      const command: Command = {
        name: 'failing',
        description: 'Failing command',
        execute: vi.fn().mockRejectedValue(error),
      };

      const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      cli.registerCommand(command);
      await cli.execute(['failing']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Error executing command'), error);
      expect(exitSpy).toHaveBeenCalledWith(1);

      exitSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('showHelp', () => {
    it('should display help message', () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      cli.showHelp();

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Whisker CLI'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Usage:'));

      consoleLogSpy.mockRestore();
    });

    it('should list registered commands', () => {
      const command: Command = {
        name: 'test',
        description: 'Test command',
        execute: vi.fn(),
      };

      cli.registerCommand(command);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      cli.showHelp();

      const allLogs = consoleLogSpy.mock.calls.map(call => call.join(' ')).join('\n');
      expect(allLogs).toContain('test');
      expect(allLogs).toContain('Test command');

      consoleLogSpy.mockRestore();
    });
  });
});

describe('createCLI', () => {
  it('should create a CLI instance', () => {
    const cli = createCLI();
    expect(cli).toBeInstanceOf(WhiskerCLI);
  });
});

describe('logging utilities', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('logInfo should log info message', () => {
    logInfo('Test message');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test message'));
  });

  it('logSuccess should log success message', () => {
    logSuccess('Test success');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test success'));
  });

  it('logError should log error message', () => {
    logError('Test error');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test error'));
  });

  it('logWarn should log warning message', () => {
    logWarn('Test warning');
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Test warning'));
  });
});

describe('spinner', () => {
  it('should return spinner object with start and stop methods', () => {
    const spin = spinner('Loading...');
    expect(spin).toHaveProperty('start');
    expect(spin).toHaveProperty('stop');
    expect(typeof spin.start).toBe('function');
    expect(typeof spin.stop).toBe('function');
  });

  it('should handle start and stop calls', () => {
    const spin = spinner('Loading...');
    expect(() => spin.start()).not.toThrow();
    expect(() => spin.stop()).not.toThrow();
  });
});
