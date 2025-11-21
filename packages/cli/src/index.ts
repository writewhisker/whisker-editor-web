/**
 * Whisker CLI
 *
 * Main command-line interface for Whisker Editor.
 * Provides commands for initialization, building, deployment, and migration.
 */

export type { Command, CommandContext, CommandOption } from './types.js';

import type { Command, CommandContext } from './types.js';

/**
 * CLI application
 */
export class WhiskerCLI {
  private commands: Map<string, Command> = new Map();

  /**
   * Register a command
   */
  public registerCommand(command: Command): void {
    this.commands.set(command.name, command);
  }

  /**
   * Parse command-line arguments
   */
  public parseArgs(args: string[]): { command: string; args: string[]; options: Record<string, any> } {
    const [command, ...rest] = args;
    const options: Record<string, any> = {};
    const positionalArgs: string[] = [];

    for (let i = 0; i < rest.length; i++) {
      const arg = rest[i];

      if (arg.startsWith('--')) {
        const key = arg.slice(2);
        const nextArg = rest[i + 1];

        if (nextArg && !nextArg.startsWith('-')) {
          options[key] = nextArg;
          i++;
        } else {
          options[key] = true;
        }
      } else if (arg.startsWith('-')) {
        const key = arg.slice(1);
        options[key] = true;
      } else {
        positionalArgs.push(arg);
      }
    }

    return { command, args: positionalArgs, options };
  }

  /**
   * Execute a command
   */
  public async execute(args: string[]): Promise<void> {
    const { command: commandName, args: commandArgs, options } = this.parseArgs(args);

    if (!commandName || commandName === 'help') {
      this.showHelp();
      return;
    }

    const command = this.commands.get(commandName);

    if (!command) {
      console.error(`Unknown command: ${commandName}`);
      console.error('Run "whisker help" to see available commands');
      process.exit(1);
    }

    const context: CommandContext = {
      cwd: process.cwd(),
      args: commandArgs,
      options,
    };

    try {
      await command.execute(context);
    } catch (error) {
      console.error(`Error executing command "${commandName}":`, error);
      process.exit(1);
    }
  }

  /**
   * Show help message
   */
  public showHelp(): void {
    console.log('Whisker CLI - Interactive Fiction Story Editor');
    console.log('');
    console.log('Usage: whisker <command> [options]');
    console.log('');
    console.log('Commands:');

    const commands = Array.from(this.commands.values());
    const maxNameLength = Math.max(...commands.map(c => c.name.length));

    for (const command of commands) {
      const padding = ' '.repeat(maxNameLength - command.name.length + 2);
      console.log(`  ${command.name}${padding}${command.description}`);
    }

    console.log('');
    console.log('Run "whisker <command> --help" for more information on a command');
  }

  /**
   * Get registered commands
   */
  public getCommands(): Command[] {
    return Array.from(this.commands.values());
  }
}

/**
 * Create a new CLI instance
 */
export function createCLI(): WhiskerCLI {
  return new WhiskerCLI();
}

/**
 * Utility functions
 */

/**
 * Log an info message
 */
export function logInfo(message: string): void {
  console.log(`ℹ ${message}`);
}

/**
 * Log a success message
 */
export function logSuccess(message: string): void {
  console.log(`✓ ${message}`);
}

/**
 * Log an error message
 */
export function logError(message: string): void {
  console.error(`✗ ${message}`);
}

/**
 * Log a warning message
 */
export function logWarning(message: string): void {
  console.warn(`⚠ ${message}`);
}

/**
 * Prompt for user input
 */
export async function prompt(question: string, defaultValue?: string): Promise<string> {
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    const promptText = defaultValue ? `${question} (${defaultValue}): ` : `${question}: `;

    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer || defaultValue || '');
    });
  });
}

/**
 * Confirm a yes/no question
 */
export async function confirm(question: string, defaultValue: boolean = false): Promise<boolean> {
  const defaultText = defaultValue ? 'Y/n' : 'y/N';
  const answer = await prompt(`${question} (${defaultText})`);

  if (!answer) {
    return defaultValue;
  }

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Check if a file exists
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read a JSON file
 */
export async function readJSON<T = any>(path: string): Promise<T> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(path, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write a JSON file
 */
export async function writeJSON(path: string, data: any, pretty: boolean = true): Promise<void> {
  const fs = await import('fs/promises');
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await fs.writeFile(path, content, 'utf-8');
}

/**
 * Execute a shell command
 */
export async function execCommand(command: string, cwd?: string): Promise<{ stdout: string; stderr: string }> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  return execAsync(command, { cwd });
}

/**
 * Spinner utility
 */
export class Spinner {
  private frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  private current = 0;
  private interval: NodeJS.Timeout | null = null;
  private message: string;

  constructor(message: string) {
    this.message = message;
  }

  public start(): void {
    process.stdout.write('\x1b[?25l'); // Hide cursor

    this.interval = setInterval(() => {
      const frame = this.frames[this.current];
      process.stdout.write(`\r${frame} ${this.message}`);
      this.current = (this.current + 1) % this.frames.length;
    }, 80);
  }

  public stop(finalMessage?: string): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    process.stdout.write('\r\x1b[K'); // Clear line

    if (finalMessage) {
      console.log(finalMessage);
    }

    process.stdout.write('\x1b[?25h'); // Show cursor
  }

  public succeed(message: string): void {
    this.stop(`✓ ${message}`);
  }

  public fail(message: string): void {
    this.stop(`✗ ${message}`);
  }

  public update(message: string): void {
    this.message = message;
  }
}

/**
 * Create a spinner
 */
export function createSpinner(message: string): Spinner {
  return new Spinner(message);
}
