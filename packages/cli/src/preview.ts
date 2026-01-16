#!/usr/bin/env node
/**
 * whisker-preview - Interactive Terminal Story Preview
 *
 * Runs WLS stories in the terminal per WLS Chapter 14.4.3.
 * Provides an interactive experience for testing stories.
 */

import * as fs from 'fs';
import * as readline from 'readline';
import { Parser, type StoryNode, type PassageNode, type ChoiceNode, type ContentNode } from '@writewhisker/parser';

/**
 * CLI argument parsing
 */
interface PreviewArgs {
  file: string;
  debug: boolean;
  showVars: boolean;
  help: boolean;
  version: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): PreviewArgs {
  const result: PreviewArgs = {
    file: '',
    debug: false,
    showVars: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      result.help = true;
    } else if (arg === '--version' || arg === '-v') {
      result.version = true;
    } else if (arg === '--debug' || arg === '-d') {
      result.debug = true;
    } else if (arg === '--show-vars' || arg === '-s') {
      result.showVars = true;
    } else if (!arg.startsWith('-')) {
      result.file = arg;
    }
  }

  return result;
}

/**
 * Story state for preview
 */
interface StoryState {
  ast: StoryNode;
  currentPassage: string;
  variables: Map<string, any>;
  history: string[];
  visitCounts: Map<string, number>;
}

/**
 * Preview engine
 */
class PreviewEngine {
  private state: StoryState;
  private debug: boolean;
  private showVars: boolean;

  constructor(ast: StoryNode, debug: boolean = false, showVars: boolean = false) {
    this.debug = debug;
    this.showVars = showVars;

    // Find start passage
    const startMeta = ast.metadata.find(m => m.key === 'start');
    const startPassage = startMeta?.value || ast.passages[0]?.name || 'Start';

    this.state = {
      ast,
      currentPassage: startPassage,
      variables: new Map(),
      history: [],
      visitCounts: new Map(),
    };

    // Initialize variables from declarations
    for (const meta of ast.metadata) {
      if (meta.type === 'variable_declaration') {
        const varDecl = meta as any;
        this.state.variables.set(varDecl.name, varDecl.value?.value ?? null);
      }
    }
  }

  /**
   * Get the current passage
   */
  getCurrentPassage(): PassageNode | undefined {
    return this.state.ast.passages.find(p => p.name === this.state.currentPassage);
  }

  /**
   * Get choices from current passage
   */
  getChoices(): ChoiceNode[] {
    const passage = this.getCurrentPassage();
    if (!passage) return [];

    return passage.content.filter((n): n is ChoiceNode => n.type === 'choice');
  }

  /**
   * Render passage content as text
   */
  renderContent(): string {
    const passage = this.getCurrentPassage();
    if (!passage) {
      return `[Error: Passage "${this.state.currentPassage}" not found]`;
    }

    // Track visit
    const visitCount = this.state.visitCounts.get(passage.name) || 0;
    this.state.visitCounts.set(passage.name, visitCount + 1);
    this.state.history.push(passage.name);

    const lines: string[] = [];

    // Debug header
    if (this.debug) {
      lines.push(`\x1b[90m[Debug: ${passage.name}, visit #${visitCount + 1}]\x1b[0m`);
      lines.push('');
    }

    // Render content nodes
    for (const node of passage.content) {
      const text = this.renderNode(node);
      if (text) {
        lines.push(text);
      }
    }

    return lines.join('\n');
  }

  /**
   * Render a single content node
   */
  private renderNode(node: ContentNode): string {
    switch (node.type) {
      case 'text':
        return this.interpolateVariables((node as any).value || '');

      case 'choice':
        return ''; // Choices rendered separately

      case 'conditional':
        // Simple conditional evaluation
        const cond = node as any;
        // For now, just show the content
        if (cond.branches && cond.branches.length > 0) {
          const branch = cond.branches[0];
          if (branch.content) {
            return branch.content.map((n: ContentNode) => this.renderNode(n)).join('');
          }
        }
        return '';

      case 'formatted_text':
        const fmt = node as any;
        const content = fmt.content?.map((n: ContentNode) => this.renderNode(n)).join('') || '';
        switch (fmt.format) {
          case 'bold':
            return `\x1b[1m${content}\x1b[0m`;
          case 'italic':
            return `\x1b[3m${content}\x1b[0m`;
          case 'code':
            return `\x1b[7m${content}\x1b[0m`;
          default:
            return content;
        }

      case 'interpolation':
        const interp = node as any;
        const varName = interp.expression?.name || '';
        return String(this.state.variables.get(varName) ?? `$${varName}`);

      default:
        return '';
    }
  }

  /**
   * Interpolate $variables in text
   */
  private interpolateVariables(text: string): string {
    return text.replace(/\$(\w+)/g, (_, name) => {
      return String(this.state.variables.get(name) ?? `$${name}`);
    });
  }

  /**
   * Make a choice
   */
  makeChoice(index: number): boolean {
    const choices = this.getChoices();
    if (index < 0 || index >= choices.length) {
      return false;
    }

    const choice = choices[index];
    const target = choice.target;

    if (!target) {
      return false;
    }

    // Handle special targets
    if (target === 'END') {
      this.state.currentPassage = '';
      return true;
    }

    if (target === 'BACK') {
      if (this.state.history.length > 1) {
        this.state.history.pop();
        this.state.currentPassage = this.state.history[this.state.history.length - 1] || '';
      }
      return true;
    }

    if (target === 'RESTART') {
      const startMeta = this.state.ast.metadata.find(m => m.key === 'start');
      this.state.currentPassage = startMeta?.value || this.state.ast.passages[0]?.name || 'Start';
      this.state.history = [];
      return true;
    }

    // Normal passage transition
    this.state.currentPassage = target;
    return true;
  }

  /**
   * Check if story has ended
   */
  isEnded(): boolean {
    return this.state.currentPassage === '' || !this.getCurrentPassage();
  }

  /**
   * Restart the story
   */
  restart(): void {
    const startMeta = this.state.ast.metadata.find(m => m.key === 'start');
    this.state.currentPassage = startMeta?.value || this.state.ast.passages[0]?.name || 'Start';
    this.state.history = [];
    this.state.visitCounts.clear();
  }

  /**
   * Get variables for display
   */
  getVariables(): Map<string, any> {
    return this.state.variables;
  }

  /**
   * Get history for display
   */
  getHistory(): string[] {
    return this.state.history;
  }
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(`
whisker-preview - Interactive Story Preview (WLS Chapter 14.4)

Usage:
  whisker-preview [options] <file>

Options:
  -h, --help        Show this help message
  -v, --version     Show version number
  -d, --debug       Enable debug mode
  -s, --show-vars   Show variables after each passage

Interactive Commands:
  1-9               Select a choice
  r                 Restart the story
  v                 Show variables
  h                 Show history
  q                 Quit

Examples:
  whisker-preview story.ws
  whisker-preview --debug story.ws
  whisker-preview --show-vars story.ws
`);
}

/**
 * Show version
 */
function showVersion(): void {
  console.log('whisker-preview v1.0.0');
}

/**
 * Clear the screen
 */
function clearScreen(): void {
  console.clear();
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (args.version) {
    showVersion();
    process.exit(0);
  }

  if (!args.file) {
    console.error('Error: No file specified');
    showHelp();
    process.exit(2);
  }

  if (!fs.existsSync(args.file)) {
    console.error(`Error: File not found: ${args.file}`);
    process.exit(2);
  }

  // Parse the story
  const source = fs.readFileSync(args.file, 'utf-8');
  const parser = new Parser();
  const result = parser.parse(source);

  if (!result.ast) {
    console.error('Error: Failed to parse story');
    for (const error of result.errors) {
      console.error(`  ${error.message} at line ${error.location.start.line}`);
    }
    process.exit(1);
  }

  // Create preview engine
  const engine = new PreviewEngine(result.ast, args.debug, args.showVars);

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Display function
  function display(): void {
    clearScreen();
    console.log('\x1b[36m═══════════════════════════════════════════════════════════════\x1b[0m');
    console.log('\x1b[1mWhisker Preview\x1b[0m - Interactive Story Mode');
    console.log('\x1b[36m═══════════════════════════════════════════════════════════════\x1b[0m');
    console.log('');

    if (engine.isEnded()) {
      console.log('\x1b[33m*** THE END ***\x1b[0m');
      console.log('');
      console.log('Commands: (r)estart, (q)uit');
    } else {
      // Render passage content
      console.log(engine.renderContent());
      console.log('');

      // Show variables if enabled
      if (args.showVars) {
        console.log('\x1b[90mVariables:\x1b[0m');
        const vars = engine.getVariables();
        if (vars.size === 0) {
          console.log('  (none)');
        } else {
          for (const [name, value] of vars) {
            console.log(`  $${name} = ${JSON.stringify(value)}`);
          }
        }
        console.log('');
      }

      // Show choices
      const choices = engine.getChoices();
      if (choices.length > 0) {
        console.log('\x1b[36m───────────────────────────────────────────────────────────────\x1b[0m');
        console.log('Choices:');
        choices.forEach((choice, i) => {
          const text = choice.text || `Go to ${choice.target}`;
          console.log(`  \x1b[1m${i + 1}.\x1b[0m ${text}`);
        });
        console.log('');
      }

      console.log('\x1b[90mCommands: 1-9 (choice), (r)estart, (v)ariables, (h)istory, (q)uit\x1b[0m');
    }

    console.log('');
  }

  // Input handler
  function handleInput(input: string): void {
    const cmd = input.trim().toLowerCase();

    if (cmd === 'q' || cmd === 'quit') {
      console.log('Goodbye!');
      rl.close();
      process.exit(0);
    }

    if (cmd === 'r' || cmd === 'restart') {
      engine.restart();
      display();
      return;
    }

    if (cmd === 'v' || cmd === 'vars' || cmd === 'variables') {
      console.log('\nVariables:');
      const vars = engine.getVariables();
      if (vars.size === 0) {
        console.log('  (none)');
      } else {
        for (const [name, value] of vars) {
          console.log(`  $${name} = ${JSON.stringify(value)}`);
        }
      }
      console.log('');
      rl.prompt();
      return;
    }

    if (cmd === 'h' || cmd === 'history') {
      console.log('\nHistory:');
      const history = engine.getHistory();
      if (history.length === 0) {
        console.log('  (none)');
      } else {
        history.forEach((p, i) => {
          console.log(`  ${i + 1}. ${p}`);
        });
      }
      console.log('');
      rl.prompt();
      return;
    }

    // Check for choice selection
    const choiceNum = parseInt(cmd, 10);
    if (!isNaN(choiceNum) && choiceNum >= 1 && choiceNum <= 9) {
      const choices = engine.getChoices();
      if (choiceNum <= choices.length) {
        engine.makeChoice(choiceNum - 1);
        display();
        return;
      } else {
        console.log(`\x1b[31mInvalid choice: ${choiceNum}\x1b[0m`);
        rl.prompt();
        return;
      }
    }

    console.log(`\x1b[31mUnknown command: ${cmd}\x1b[0m`);
    rl.prompt();
  }

  // Start preview
  display();
  rl.setPrompt('> ');
  rl.prompt();

  rl.on('line', handleInput);
  rl.on('close', () => {
    process.exit(0);
  });
}

// Run main
main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(2);
});

// Export for programmatic use
export { PreviewEngine };
