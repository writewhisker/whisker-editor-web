/**
 * Whisker CLI Types
 *
 * Shared type definitions for CLI commands and context.
 */

export interface CommandContext {
  cwd: string;
  args: string[];
  options: Record<string, any>;
}

export interface Command {
  name: string;
  description: string;
  options?: CommandOption[];
  execute: (context: CommandContext) => Promise<void>;
}

export interface CommandOption {
  name: string;
  alias?: string;
  description: string;
  type: 'string' | 'boolean' | 'number';
  required?: boolean;
  default?: any;
}
