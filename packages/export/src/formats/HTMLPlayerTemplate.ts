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

    .meta-bar .controls {
      display: flex;
      gap: 0.5rem;
    }

    .meta-bar button {
      background: var(--bg-primary);
      border: 1px solid var(--border);
      padding: 0.5rem 1rem;
      border-radius: 0.375rem;
      cursor: pointer;
      color: var(--text-primary);
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .meta-bar button:hover:not(:disabled) {
      background: var(--border);
    }

    .meta-bar button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .game-over {
      text-align: center;
      padding: 3rem 0;
    }

    .game-over h2 {
      font-size: 2rem;
      margin-bottom: 1rem;
    }

    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 100;
      align-items: center;
      justify-content: center;
    }

    .modal.active {
      display: flex;
    }

    .modal-content {
      background: var(--bg-primary);
      padding: 2rem;
      border-radius: 0.5rem;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .modal-header h3 {
      font-size: 1.5rem;
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: var(--text-secondary);
      padding: 0;
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .modal-close:hover {
      color: var(--text-primary);
    }

    .save-slot {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      padding: 1rem;
      margin-bottom: 0.75rem;
      border-radius: 0.375rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .save-slot:hover {
      border-color: var(--accent);
    }

    .save-slot-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .save-slot-title {
      font-weight: bold;
    }

    .save-slot-date {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    .save-slot-info {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .save-slot.empty {
      opacity: 0.6;
    }

    .debug-panel {
      display: none;
      position: fixed;
      bottom: 1rem;
      right: 1rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 0.5rem;
      padding: 1rem;
      max-width: 400px;
      max-height: 400px;
      overflow-y: auto;
      z-index: 50;
      font-size: 0.875rem;
    }

    .debug-panel.active {
      display: block;
    }

    .debug-panel h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1rem;
    }

    .debug-section {
      margin-bottom: 1rem;
    }

    .debug-section:last-child {
      margin-bottom: 0;
    }

    .debug-label {
      font-weight: bold;
      color: var(--text-secondary);
      margin-bottom: 0.25rem;
    }

    .debug-value {
      font-family: monospace;
      color: var(--text-primary);
      white-space: pre-wrap;
      word-break: break-all;
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
    <div class="controls">
      <button id="undo-btn" onclick="player.undo()" disabled>Undo</button>
      <button id="redo-btn" onclick="player.redo()" disabled>Redo</button>
      <button onclick="player.showSaveModal()">Save</button>
      <button onclick="player.showLoadModal()">Load</button>
      <button onclick="player.restart()">Restart</button>
    </div>
  </div>
  <div id="app"></div>

  <!-- Save Modal -->
  <div id="save-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Save Game</h3>
        <button class="modal-close" onclick="player.closeModal('save-modal')">&times;</button>
      </div>
      <div id="save-slots-container"></div>
    </div>
  </div>

  <!-- Load Modal -->
  <div id="load-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h3>Load Game</h3>
        <button class="modal-close" onclick="player.closeModal('load-modal')">&times;</button>
      </div>
      <div id="load-slots-container"></div>
    </div>
  </div>

  <!-- Debug Panel -->
  <div id="debug-panel" class="debug-panel"></div>

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

        // Initialize undo/redo system
        this.historyStates = [];
        this.historyIndex = -1;
        this.undoLimit = (this.story.settings && this.story.settings.undoLimit) || 50;

        // Initialize save/load system
        this.storyId = this.generateStoryId();
        this.saveSlots = 3;

        // Initialize auto-save
        this.autoSave = (this.story.settings && this.story.settings.autoSave !== undefined)
          ? this.story.settings.autoSave
          : true;

        // Initialize debug mode
        this.debugMode = (this.story.settings && this.story.settings.debugMode) || false;

        // Initialize variables
        if (this.story.variables) {
          Object.entries(this.story.variables).forEach(([name, data]) => {
            this.variables.set(name, data.value);
          });
        }

        // Sync initial variables to Lua
        this.lua.syncVariablesToLua(this.variables);

        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Try to load auto-save if exists
        if (this.autoSave) {
          const autoSaveData = this.loadGame(0, true);
          if (autoSaveData) {
            console.log('Auto-save loaded');
          }
        }
      }

      generateStoryId() {
        const title = (this.story.metadata && this.story.metadata.title) || 'untitled';
        return 'whisker_' + title.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }

      setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
          // Ctrl+D or Cmd+D to toggle debug panel
          if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            this.toggleDebug();
          }
        });
      }

      start() {
        this.currentPassageId = this.story.startPassage;
        if (!this.currentPassageId) {
          const firstPassage = Object.keys(this.story.passages)[0];
          this.currentPassageId = firstPassage;
        }

        // Save initial state
        this.saveHistoryState();

        this.render();
        this.updateDebugPanel();
      }

      restart() {
        this.currentPassageId = null;
        this.variables.clear();
        this.history = [];
        this.historyStates = [];
        this.historyIndex = -1;

        // Re-initialize variables
        if (this.story.variables) {
          Object.entries(this.story.variables).forEach(([name, data]) => {
            this.variables.set(name, data.value);
          });
        }

        this.start();
      }

      // Undo/Redo System
      saveHistoryState() {
        // Remove any states after current index (when making new choice after undo)
        if (this.historyIndex < this.historyStates.length - 1) {
          this.historyStates = this.historyStates.slice(0, this.historyIndex + 1);
        }

        // Create state snapshot
        const state = {
          passageId: this.currentPassageId,
          variables: new Map(this.variables),
          timestamp: Date.now()
        };

        this.historyStates.push(state);

        // Enforce undo limit
        if (this.historyStates.length > this.undoLimit) {
          this.historyStates.shift();
        } else {
          this.historyIndex++;
        }

        this.updateUndoRedoButtons();
      }

      canUndo() {
        return this.historyIndex > 0;
      }

      canRedo() {
        return this.historyIndex < this.historyStates.length - 1;
      }

      undo() {
        if (!this.canUndo()) return;

        this.historyIndex--;
        this.restoreHistoryState(this.historyStates[this.historyIndex]);
        this.updateUndoRedoButtons();
      }

      redo() {
        if (!this.canRedo()) return;

        this.historyIndex++;
        this.restoreHistoryState(this.historyStates[this.historyIndex]);
        this.updateUndoRedoButtons();
      }

      restoreHistoryState(state) {
        this.currentPassageId = state.passageId;
        this.variables = new Map(state.variables);
        this.lua.syncVariablesToLua(this.variables);
        this.render();
        this.updateDebugPanel();
      }

      updateUndoRedoButtons() {
        const undoBtn = document.getElementById('undo-btn');
        const redoBtn = document.getElementById('redo-btn');

        if (undoBtn) undoBtn.disabled = !this.canUndo();
        if (redoBtn) redoBtn.disabled = !this.canRedo();
      }

      // Save/Load System
      saveGame(slot) {
        const saveData = {
          passageId: this.currentPassageId,
          variables: Array.from(this.variables.entries()),
          historyStates: this.historyStates.map(state => ({
            passageId: state.passageId,
            variables: Array.from(state.variables.entries()),
            timestamp: state.timestamp
          })),
          historyIndex: this.historyIndex,
          timestamp: Date.now()
        };

        const key = this.storyId + '_save_' + slot;
        try {
          localStorage.setItem(key, JSON.stringify(saveData));
          console.log('Game saved to slot ' + slot);
          return true;
        } catch (error) {
          console.error('Failed to save game:', error);
          return false;
        }
      }

      loadGame(slot, silent) {
        const key = this.storyId + '_save_' + slot;
        try {
          const data = localStorage.getItem(key);
          if (!data) {
            if (!silent) console.log('No save data found in slot ' + slot);
            return null;
          }

          const saveData = JSON.parse(data);

          this.currentPassageId = saveData.passageId;
          this.variables = new Map(saveData.variables);
          this.historyIndex = saveData.historyIndex;
          this.historyStates = saveData.historyStates.map(state => ({
            passageId: state.passageId,
            variables: new Map(state.variables),
            timestamp: state.timestamp
          }));

          this.lua.syncVariablesToLua(this.variables);
          this.render();
          this.updateUndoRedoButtons();
          this.updateDebugPanel();

          if (!silent) console.log('Game loaded from slot ' + slot);
          return saveData;
        } catch (error) {
          console.error('Failed to load game:', error);
          return null;
        }
      }

      getSaveSlots() {
        const slots = [];
        for (let i = 0; i < this.saveSlots; i++) {
          const key = this.storyId + '_save_' + i;
          try {
            const data = localStorage.getItem(key);
            if (data) {
              const saveData = JSON.parse(data);
              const passage = this.story.passages[saveData.passageId];
              slots.push({
                slot: i,
                exists: true,
                timestamp: saveData.timestamp,
                passageTitle: passage ? passage.title : 'Unknown',
                passageId: saveData.passageId
              });
            } else {
              slots.push({
                slot: i,
                exists: false
              });
            }
          } catch (error) {
            slots.push({
              slot: i,
              exists: false
            });
          }
        }
        return slots;
      }

      deleteSave(slot) {
        const key = this.storyId + '_save_' + slot;
        try {
          localStorage.removeItem(key);
          console.log('Save deleted from slot ' + slot);
          return true;
        } catch (error) {
          console.error('Failed to delete save:', error);
          return false;
        }
      }

      autoSaveGame() {
        if (this.autoSave) {
          this.saveGame(0);
        }
      }

      // Modal Management
      showSaveModal() {
        const modal = document.getElementById('save-modal');
        const container = document.getElementById('save-slots-container');
        const slots = this.getSaveSlots();

        let html = '';
        slots.forEach(slot => {
          if (slot.exists) {
            const date = new Date(slot.timestamp);
            html += '<div class="save-slot" onclick="player.handleSaveSlot(' + slot.slot + ')">';
            html += '  <div class="save-slot-header">';
            html += '    <div class="save-slot-title">Slot ' + (slot.slot + 1) + '</div>';
            html += '    <div class="save-slot-date">' + date.toLocaleString() + '</div>';
            html += '  </div>';
            html += '  <div class="save-slot-info">' + this.escapeHTML(slot.passageTitle) + '</div>';
            html += '</div>';
          } else {
            html += '<div class="save-slot empty" onclick="player.handleSaveSlot(' + slot.slot + ')">';
            html += '  <div class="save-slot-title">Slot ' + (slot.slot + 1) + ' - Empty</div>';
            html += '</div>';
          }
        });

        container.innerHTML = html;
        modal.classList.add('active');
      }

      showLoadModal() {
        const modal = document.getElementById('load-modal');
        const container = document.getElementById('load-slots-container');
        const slots = this.getSaveSlots();

        let html = '';
        slots.forEach(slot => {
          if (slot.exists) {
            const date = new Date(slot.timestamp);
            html += '<div class="save-slot" onclick="player.handleLoadSlot(' + slot.slot + ')">';
            html += '  <div class="save-slot-header">';
            html += '    <div class="save-slot-title">Slot ' + (slot.slot + 1) + '</div>';
            html += '    <div class="save-slot-date">' + date.toLocaleString() + '</div>';
            html += '  </div>';
            html += '  <div class="save-slot-info">' + this.escapeHTML(slot.passageTitle) + '</div>';
            html += '</div>';
          } else {
            html += '<div class="save-slot empty">';
            html += '  <div class="save-slot-title">Slot ' + (slot.slot + 1) + ' - Empty</div>';
            html += '</div>';
          }
        });

        container.innerHTML = html;
        modal.classList.add('active');
      }

      handleSaveSlot(slot) {
        this.saveGame(slot);
        this.closeModal('save-modal');
      }

      handleLoadSlot(slot) {
        this.loadGame(slot);
        this.closeModal('load-modal');
      }

      closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('active');
      }

      // Debug Mode
      toggleDebug() {
        const panel = document.getElementById('debug-panel');
        if (panel.classList.contains('active')) {
          panel.classList.remove('active');
        } else {
          panel.classList.add('active');
          this.updateDebugPanel();
        }
      }

      updateDebugPanel() {
        if (!this.debugMode && !document.getElementById('debug-panel').classList.contains('active')) {
          return;
        }

        const panel = document.getElementById('debug-panel');
        const passage = this.story.passages[this.currentPassageId];

        let html = '<h4>Debug Info</h4>';

        html += '<div class="debug-section">';
        html += '  <div class="debug-label">Current Passage:</div>';
        html += '  <div class="debug-value">' + (passage ? this.escapeHTML(passage.title) : 'None') + ' (' + this.currentPassageId + ')</div>';
        html += '</div>';

        html += '<div class="debug-section">';
        html += '  <div class="debug-label">Variables:</div>';
        html += '  <div class="debug-value">';
        if (this.variables.size > 0) {
          this.variables.forEach((value, name) => {
            html += name + ': ' + JSON.stringify(value) + '\\n';
          });
        } else {
          html += 'No variables';
        }
        html += '  </div>';
        html += '</div>';

        html += '<div class="debug-section">';
        html += '  <div class="debug-label">History:</div>';
        html += '  <div class="debug-value">States: ' + this.historyStates.length + ', Index: ' + this.historyIndex + '</div>';
        html += '</div>';

        panel.innerHTML = html;
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

        // Save state for undo/redo
        this.saveHistoryState();

        // Auto-save after choice
        this.autoSaveGame();

        this.render();
        this.updateDebugPanel();
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
