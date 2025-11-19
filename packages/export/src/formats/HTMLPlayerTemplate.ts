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

  <!-- Fengari Lua Runtime -->
  <script src="https://cdn.jsdelivr.net/npm/fengari-web@0.1.4/dist/fengari-web.js" crossorigin="anonymous"></script>

  <script>
    // Story Data (embedded)
    const STORY_DATA = ${storyData};

    // Execute story-wide scripts on load
    if (STORY_DATA.scripts && Array.isArray(STORY_DATA.scripts)) {
      // Wait for Fengari to be available, then execute scripts
      if (typeof fengari !== 'undefined') {
        const lua = fengari.lua;
        const lauxlib = fengari.lauxlib;
        const lualib = fengari.lualib;
        const L = lauxlib.luaL_newstate();
        lualib.luaL_openlibs(L);

        STORY_DATA.scripts.forEach((script, index) => {
          try {
            const result = lauxlib.luaL_dostring(L, fengari.to_luastring(script));
            if (result !== lua.LUA_OK) {
              const errorMsg = fengari.to_jsstring(lua.lua_tostring(L, -1));
              lua.lua_pop(L, 1);
              console.error(\`Story script \${index} failed:\`, errorMsg);
            }
          } catch (error) {
            console.error(\`Failed to execute story script \${index}:\`, error);
          }
        });
      } else {
        console.warn('Fengari not available - story scripts not executed');
      }
    }

    // Lua Runtime Manager
    class LuaRuntime {
      constructor() {
        this.enabled = typeof fengari !== 'undefined';
        if (this.enabled) {
          this.lua = fengari.lua;
          this.lauxlib = fengari.lauxlib;
          this.lualib = fengari.lualib;
          this.L = this.lauxlib.luaL_newstate();
          this.lualib.luaL_openlibs(this.L);
        } else {
          console.warn('Fengari Lua runtime not available - Lua features disabled');
        }
      }

      syncVariablesToLua(variables) {
        if (!this.enabled) return;
        variables.forEach((value, name) => {
          try {
            if (typeof value === 'number') {
              this.lua.lua_pushnumber(this.L, value);
            } else if (typeof value === 'boolean') {
              this.lua.lua_pushboolean(this.L, value);
            } else {
              this.lua.lua_pushstring(this.L, fengari.to_luastring(String(value)));
            }
            this.lua.lua_setglobal(this.L, fengari.to_luastring(name));
          } catch (error) {
            console.error(\`Failed to sync variable '\${name}' to Lua:\`, error);
          }
        });
      }

      syncVariablesFromLua(variables) {
        if (!this.enabled) return;
        variables.forEach((value, name) => {
          try {
            this.lua.lua_getglobal(this.L, fengari.to_luastring(name));
            const type = this.lua.lua_type(this.L, -1);
            let newValue = value;
            if (type === this.lua.LUA_TNUMBER) {
              newValue = this.lua.lua_tonumber(this.L, -1);
            } else if (type === this.lua.LUA_TBOOLEAN) {
              newValue = this.lua.lua_toboolean(this.L, -1);
            } else if (type === this.lua.LUA_TSTRING) {
              newValue = fengari.to_jsstring(this.lua.lua_tostring(this.L, -1));
            }
            this.lua.lua_pop(this.L, 1);
            if (newValue !== value) {
              variables.set(name, newValue);
            }
          } catch (error) {
            console.error(\`Failed to sync variable '\${name}' from Lua:\`, error);
          }
        });
      }

      execute(code) {
        if (!this.enabled) return { success: false, error: 'Lua runtime not available' };
        try {
          const result = this.lauxlib.luaL_dostring(this.L, fengari.to_luastring(code));
          if (result !== this.lua.LUA_OK) {
            const errorMsg = fengari.to_jsstring(this.lua.lua_tostring(this.L, -1));
            this.lua.lua_pop(this.L, 1);
            throw new Error(errorMsg);
          }
          let returnValue = undefined;
          if (this.lua.lua_gettop(this.L) > 0) {
            const type = this.lua.lua_type(this.L, -1);
            if (type === this.lua.LUA_TNUMBER) {
              returnValue = this.lua.lua_tonumber(this.L, -1);
            } else if (type === this.lua.LUA_TBOOLEAN) {
              returnValue = this.lua.lua_toboolean(this.L, -1);
            } else if (type === this.lua.LUA_TSTRING) {
              returnValue = fengari.to_jsstring(this.lua.lua_tostring(this.L, -1));
            }
            this.lua.lua_pop(this.L, 1);
          }
          return { success: true, value: returnValue };
        } catch (error) {
          console.error('Lua execution error:', error);
          return { success: false, error: error.message };
        }
      }

      evaluateCondition(condition) {
        if (!this.enabled || !condition || condition.trim() === '') return true;
        try {
          const code = \`return (\${condition})\`;
          const result = this.execute(code);
          if (!result.success) {
            console.error(\`Condition evaluation failed: \${condition}\`, result.error);
            return true;
          }
          return Boolean(result.value);
        } catch (error) {
          console.error(\`Failed to evaluate condition: \${condition}\`, error);
          return true;
        }
      }

      executePassageScript(script, passageId, passageTitle) {
        if (!this.enabled || !script || script.trim() === '') return { success: true };
        try {
          this.lua.lua_pushstring(this.L, fengari.to_luastring(passageId));
          this.lua.lua_setglobal(this.L, fengari.to_luastring('currentPassageId'));
          this.lua.lua_pushstring(this.L, fengari.to_luastring(passageTitle));
          this.lua.lua_setglobal(this.L, fengari.to_luastring('currentPassageTitle'));
          return this.execute(script);
        } catch (error) {
          console.error('Passage script execution error:', error);
          return { success: false, error: error.message };
        }
      }
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
