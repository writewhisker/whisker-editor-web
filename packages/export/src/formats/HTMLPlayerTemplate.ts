/**
 * HTML Player Template
 *
 * Self-contained HTML template for playing Whisker stories in a browser.
 */

import { getTheme, generateThemeCSS, BUILTIN_THEMES, type HTMLTheme } from '../themes/themes';

/**
 * Generate HTML player template
 */
export function generateHTMLPlayer(
  storyData: string,
  title: string,
  options: {
    theme?: 'light' | 'dark' | 'auto';
    customTheme?: string;
    customCSS?: string;
    customJS?: string;
    language?: string;
  } = {}
): string {
  const { theme = 'auto', customTheme, customCSS = '', customJS = '', language = 'en' } = options;

  // Get custom theme if specified
  let themeStyles = '';
  if (customTheme && BUILTIN_THEMES[customTheme]) {
    const selectedTheme = getTheme(customTheme);
    themeStyles = generateThemeCSS(selectedTheme);
    if (selectedTheme.customStyles) {
      themeStyles += '\n' + selectedTheme.customStyles;
    }
  }

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHTML(title)}</title>
  <style>
    /* Base Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    ${themeStyles || `
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f3f4f6;
      --text-primary: #111827;
      --text-secondary: #6b7280;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --border: #e5e7eb;
    }

    @media (prefers-color-scheme: dark) {
      :root${theme === 'auto' ? '' : '.dark-theme'} {
        --bg-primary: #1f2937;
        --bg-secondary: #111827;
        --text-primary: #f9fafb;
        --text-secondary: #9ca3af;
        --accent: #60a5fa;
        --accent-hover: #3b82f6;
        --border: #374151;
      }
    }

    ${theme === 'dark' ? ':root { --bg-primary: #1f2937; --bg-secondary: #111827; --text-primary: #f9fafb; --text-secondary: #9ca3af; --accent: #60a5fa; --accent-hover: #3b82f6; --border: #374151; }' : ''}
    `}

    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--bg-primary);
      color: var(--text-primary);
      line-height: 1.6;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    #app {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      flex: 1;
    }

    .passage {
      margin-bottom: 2rem;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .passage-title {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 1rem;
      color: var(--text-primary);
    }

    .passage-content {
      font-size: 1.125rem;
      margin-bottom: 1.5rem;
      white-space: pre-wrap;
    }

    .choices {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .choice {
      background: var(--accent);
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s;
    }

    .choice:hover {
      background: var(--accent-hover);
      transform: translateX(4px);
    }

    .choice:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .meta-bar {
      position: sticky;
      top: 0;
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.875rem;
      color: var(--text-secondary);
      z-index: 10;
    }

    .meta-bar button {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      color: var(--text-primary);
      font-size: 0.875rem;
    }

    .meta-bar button:hover {
      background: var(--border);
    }

    .game-over {
      text-align: center;
      padding: 3rem 0;
    }

    .game-over h2 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    ${customCSS}
  </style>

  <!-- Story Stylesheets -->
  <script>
    // Parse story data to inject stylesheets
    try {
      const storyDataParsed = ${storyData};
      if (storyDataParsed.stylesheets && Array.isArray(storyDataParsed.stylesheets)) {
        storyDataParsed.stylesheets.forEach((css, index) => {
          const style = document.createElement('style');
          style.setAttribute('data-story-stylesheet', index.toString());
          style.textContent = css;
          document.head.appendChild(style);
        });
      }
    } catch (error) {
      console.error('Failed to inject story stylesheets:', error);
    }
  </script>
</head>
<body>
  <div class="meta-bar">
    <div id="story-title">${escapeHTML(title)}</div>
    <div>
      <button onclick="player.restart()">Restart</button>
    </div>
  </div>
  <div id="app"></div>

  <script>
    // Story Data (embedded)
    const STORY_DATA = ${storyData};

    // Lua Runtime
    class LuaRuntime {
  constructor() {
    this.enabled = true;
    this.globalScope = new Map();
    this.initializeStandardLibrary();
  }

  /**
   * Initialize standard Lua library functions
   */
  initializeStandardLibrary() {
    // Math library
    this.globalScope.set('math', {
      abs: Math.abs,
      ceil: Math.ceil,
      floor: Math.floor,
      max: Math.max,
      min: Math.min,
      random: Math.random,
      sqrt: Math.sqrt,
      pow: Math.pow,
      pi: Math.PI,
    });

    // String library basics
    this.globalScope.set('string', {
      len: (s) => s.length,
      upper: (s) => s.toUpperCase(),
      lower: (s) => s.toLowerCase(),
      sub: (s, i, j) => s.substring(i - 1, j),
    });

    // Print function
    this.globalScope.set('print', (...args) => {
      console.log(...args);
    });
  }

  /**
   * Sync JavaScript variables to Lua globals
   */
  syncVariablesToLua(variables) {
    if (!this.enabled) return;

    variables.forEach((value, name) => {
      this.globalScope.set(name, value);
    });
  }

  /**
   * Sync Lua globals back to JavaScript variables
   */
  syncVariablesFromLua(variables) {
    if (!this.enabled) return;

    variables.forEach((value, name) => {
      if (this.globalScope.has(name)) {
        const luaValue = this.globalScope.get(name);
        if (luaValue !== value) {
          variables.set(name, luaValue);
        }
      }
    });
  }

  /**
   * Execute Lua code
   */
  execute(code) {
    if (!this.enabled) {
      return { success: false, error: 'Lua runtime not available' };
    }

    try {
      // Parse and execute the Lua code
      const result = this.evaluateExpression(code);
      return { success: true, value: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Evaluate a Lua condition expression
   */
  evaluateCondition(condition) {
    if (!this.enabled || !condition || condition.trim() === '') {
      return true;
    }

    try {
      const result = this.evaluateExpression(condition);
      return Boolean(result);
    } catch (error) {
      console.error('Condition evaluation error:', error);
      return false;
    }
  }

  /**
   * Execute a passage script with context
   */
  executePassageScript(script, passageId, passageTitle) {
    if (!this.enabled || !script || script.trim() === '') {
      return { success: true };
    }

    try {
      // Set passage context
      this.globalScope.set('currentPassageId', passageId);
      this.globalScope.set('currentPassageTitle', passageTitle);

      return this.execute(script);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Evaluate a Lua expression
   */
  evaluateExpression(expr) {
    const trimmed = expr.trim();

    // Handle return statements
    if (trimmed.startsWith('return ')) {
      const returnExpr = trimmed.substring(7).trim();
      const unwrapped = returnExpr.startsWith('(') && returnExpr.endsWith(')')
        ? returnExpr.slice(1, -1)
        : returnExpr;
      return this.evaluateExpression(unwrapped);
    }

    // Handle assignment
    if (trimmed.includes('=') && !this.isComparison(trimmed)) {
      return this.handleAssignment(trimmed);
    }

    // Handle comparison operators
    if (this.hasComparisonOperator(trimmed)) {
      return this.evaluateComparison(trimmed);
    }

    // Handle logical operators
    if (trimmed.includes(' and ') || trimmed.includes(' or ') || trimmed.startsWith('not ')) {
      return this.evaluateLogical(trimmed);
    }

    // Handle arithmetic
    if (this.hasArithmeticOperator(trimmed)) {
      return this.evaluateArithmetic(trimmed);
    }

    // Handle string concatenation
    if (trimmed.includes('..')) {
      return this.evaluateStringConcat(trimmed);
    }

    // Handle literals and variables
    return this.evaluateLiteral(trimmed);
  }

  isComparison(expr) {
    return /[<>!=]=|[<>]/.test(expr);
  }

  hasComparisonOperator(expr) {
    return /==|~=|<=|>=|<|>/.test(expr);
  }

  hasArithmeticOperator(expr) {
    return /[+\-*/%]/.test(expr);
  }

  handleAssignment(expr) {
    const parts = expr.split('=').map(p => p.trim());
    if (parts.length !== 2) {
      throw new Error('Invalid assignment');
    }

    const [varName, valueExpr] = parts;
    const value = this.evaluateExpression(valueExpr);
    this.globalScope.set(varName, value);
    return value;
  }

  evaluateComparison(expr) {
    if (expr.includes('==')) {
      const [left, right] = expr.split('==').map(p => this.evaluateExpression(p.trim()));
      return left === right;
    }

    if (expr.includes('~=')) {
      const [left, right] = expr.split('~=').map(p => this.evaluateExpression(p.trim()));
      return left !== right;
    }

    if (expr.includes('<=')) {
      const [left, right] = expr.split('<=').map(p => this.evaluateExpression(p.trim()));
      return Number(left) <= Number(right);
    }

    if (expr.includes('>=')) {
      const [left, right] = expr.split('>=').map(p => this.evaluateExpression(p.trim()));
      return Number(left) >= Number(right);
    }

    if (expr.includes('<')) {
      const [left, right] = expr.split('<').map(p => this.evaluateExpression(p.trim()));
      return Number(left) < Number(right);
    }

    if (expr.includes('>')) {
      const [left, right] = expr.split('>').map(p => this.evaluateExpression(p.trim()));
      return Number(left) > Number(right);
    }

    throw new Error('Unknown comparison operator');
  }

  evaluateLogical(expr) {
    if (expr.startsWith('not ')) {
      const operand = expr.substring(4).trim();
      return !this.evaluateExpression(operand);
    }

    if (expr.includes(' and ')) {
      const parts = expr.split(' and ');
      return parts.every(p => Boolean(this.evaluateExpression(p.trim())));
    }

    if (expr.includes(' or ')) {
      const parts = expr.split(' or ');
      return parts.some(p => Boolean(this.evaluateExpression(p.trim())));
    }

    return Boolean(this.evaluateExpression(expr));
  }

  evaluateArithmetic(expr) {
    const jsExpr = expr.replace(/\\b(\\w+)\\b/g, (match) => {
      if (this.globalScope.has(match)) {
        const val = this.globalScope.get(match);
        return typeof val === 'string' ? '"' + val + '"' : String(val);
      }
      return match;
    });

    try {
      return Function('"use strict"; return (' + jsExpr + ')')();
    } catch (error) {
      throw new Error('Arithmetic evaluation failed: ' + error);
    }
  }

  evaluateStringConcat(expr) {
    const parts = expr.split('..').map(p => {
      const val = this.evaluateExpression(p.trim());
      return String(val);
    });
    return parts.join('');
  }

  evaluateLiteral(expr) {
    if (expr === 'nil') {
      return null;
    }

    if (expr === 'true') {
      return true;
    }
    if (expr === 'false') {
      return false;
    }

    if (/^-?\d+\.?\d*$/.test(expr)) {
      return parseFloat(expr);
    }

    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    if (expr.includes('.')) {
      const parts = expr.split('.');
      let current = this.globalScope.get(parts[0]);

      for (let i = 1; i < parts.length; i++) {
        if (current && typeof current === 'object') {
          current = current[parts[i]];
        } else {
          return undefined;
        }
      }

      return current;
    }

    if (expr.includes('(') && expr.includes(')')) {
      return this.evaluateFunctionCall(expr);
    }

    if (this.globalScope.has(expr)) {
      return this.globalScope.get(expr);
    }

    return undefined;
  }

  evaluateFunctionCall(expr) {
    const openParen = expr.indexOf('(');
    const closeParen = expr.lastIndexOf(')');

    if (openParen === -1 || closeParen === -1) {
      throw new Error('Invalid function call syntax');
    }

    const funcName = expr.substring(0, openParen).trim();
    const argsStr = expr.substring(openParen + 1, closeParen).trim();

    let func;
    if (funcName.includes('.')) {
      func = this.evaluateLiteral(funcName);
    } else {
      func = this.globalScope.get(funcName);
    }

    if (typeof func !== 'function') {
      throw new Error(funcName + ' is not a function');
    }

    const args = argsStr ? argsStr.split(',').map(arg => this.evaluateExpression(arg.trim())) : [];

    return func(...args);
  }

  getVariable(name) {
    return this.globalScope.get(name);
  }

  setVariable(name, value) {
    this.globalScope.set(name, value);
  }

  isEnabled() {
    return this.enabled;
  }
}


    // Execute story-wide scripts
    if (STORY_DATA.scripts && Array.isArray(STORY_DATA.scripts)) {
      const storyLua = new LuaRuntime();
      STORY_DATA.scripts.forEach((script, index) => {
        const result = storyLua.execute(script);
        if (!result.success) {
          console.error('Story script ' + index + ' failed:', result.error);
        }
      });
    }

    // Simple Story Player
    class StoryPlayer {
      constructor(storyData) {
        this.story = storyData;
        this.currentPassageId = null;
        this.variables = new Map();
        this.history = [];
        this.appEl = document.getElementById('app');
        this.lua = new LuaRuntime();

        // Initialize variables
        if (this.story.variables) {
          Object.entries(this.story.variables).forEach(([name, data]) => {
            this.variables.set(name, data.value);
          });
        }

        // Sync initial variables to Lua
        this.lua.syncVariablesToLua(this.variables);
      }

      start() {
        this.currentPassageId = this.story.startPassage;
        if (!this.currentPassageId) {
          const firstPassage = Object.keys(this.story.passages)[0];
          this.currentPassageId = firstPassage;
        }
        this.render();
      }

      restart() {
        this.currentPassageId = null;
        this.variables.clear();
        this.history = [];

        // Re-initialize variables
        if (this.story.variables) {
          Object.entries(this.story.variables).forEach(([name, data]) => {
            this.variables.set(name, data.value);
          });
        }

        this.start();
      }

      makeChoice(choiceId) {
        const passage = this.story.passages[this.currentPassageId];
        const choice = passage.choices.find(c => c.id === choiceId);

        if (!choice) return;

        // Execute passage onExit script before leaving
        if (passage.onExitScript) {
          this.lua.syncVariablesToLua(this.variables);
          const result = this.lua.executePassageScript(
            passage.onExitScript,
            passage.id,
            passage.title
          );
          if (!result.success) {
            console.error('onExit script failed:', result.error);
          }
          this.lua.syncVariablesFromLua(this.variables);
        }

        // Save to history
        this.history.push({
          passageId: this.currentPassageId,
          choiceId: choiceId,
        });

        // Navigate to target
        this.currentPassageId = choice.target;
        this.render();
      }

      render() {
        if (!this.currentPassageId || !this.story.passages[this.currentPassageId]) {
          this.appEl.innerHTML = \`
            <div class="game-over">
              <h2>The End</h2>
              <button onclick="player.restart()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: var(--accent); color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-size: 1rem;">
                Play Again
              </button>
            </div>
          \`;
          return;
        }

        const passage = this.story.passages[this.currentPassageId];

        // Sync variables to Lua before executing scripts
        this.lua.syncVariablesToLua(this.variables);

        // Execute passage onEnter script
        if (passage.onEnterScript) {
          const result = this.lua.executePassageScript(
            passage.onEnterScript,
            passage.id,
            passage.title
          );
          if (!result.success) {
            console.error('onEnter script failed:', result.error);
          }
        }

        // Sync variables back from Lua after script execution
        this.lua.syncVariablesFromLua(this.variables);

        // Substitute variables in content
        let content = passage.content || '';
        this.variables.forEach((value, name) => {
          content = content.replace(new RegExp(\`{{\\\\s*\${name}\\\\s*}}\`, 'g'), value);
        });

        // Evaluate choice conditions and filter visible choices
        const visibleChoices = passage.choices.filter(choice => {
          if (!choice.condition) return true;

          // Sync variables before evaluating condition
          this.lua.syncVariablesToLua(this.variables);
          const isVisible = this.lua.evaluateCondition(choice.condition);
          return isVisible;
        });

        // Render passage
        const html = \`
          <div class="passage">
            <div class="passage-title">\${this.escapeHTML(passage.title)}</div>
            <div class="passage-content">\${this.escapeHTML(content)}</div>
            <div class="choices">
              \${visibleChoices.map(choice => \`
                <button class="choice" onclick="player.makeChoice('\${choice.id}')">
                  \${this.escapeHTML(choice.text)}
                </button>
              \`).join('')}
            </div>
          </div>
        \`;

        this.appEl.innerHTML = html;
      }

      escapeHTML(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
      }
    }

    // Initialize and start the player
    const player = new StoryPlayer(STORY_DATA);
    player.start();

    ${customJS}
  </script>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
