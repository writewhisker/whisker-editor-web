<script lang="ts">
  import { getLuaEngine, type LuaExecutionResult } from '@writewhisker/scripting';

  // State
  let input = $state('');
  let history = $state<Array<{ input: string; result: LuaExecutionResult }>>([]);
  let historyIndex = $state(-1);
  let commandHistory = $state<string[]>([]);

  const engine = getLuaEngine();

  function executeCode() {
    if (!input.trim()) return;

    // Execute the code
    const result = engine.execute(input);

    // Add to history
    history.push({ input, result });
    commandHistory.push(input);
    historyIndex = commandHistory.length;

    // Clear input
    input = '';

    // Scroll to bottom
    setTimeout(() => {
      const consoleOutput = document.querySelector('.console-output');
      if (consoleOutput) {
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
      }
    }, 0);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      executeCode();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input = commandHistory[historyIndex];
      }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        input = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        input = '';
      }
    }
  }

  function clearConsole() {
    history = [];
    engine.reset();
  }

  function clearHistory() {
    history = [];
  }

  function resetEngine() {
    engine.reset();
    history.push({
      input: '-- Engine reset --',
      result: {
        success: true,
        output: ['All variables and functions cleared'],
        errors: [],
        context: {
          variables: new Map(),
          localScopes: [],
          functions: new Map(),
          output: [],
          errors: [],
        },
      },
    });
  }

  function getVariables(): Record<string, any> {
    return engine.getAllVariables();
  }

  function loadExample(example: string) {
    input = example;
  }

  const examples = [
    {
      name: 'Variables',
      code: `health = 100
score = 0
name = "Player"
print(name, health, score)`,
    },
    {
      name: 'Arithmetic',
      code: `x = 10
y = 20
result = x + y * 2
print("Result:", result)`,
    },
    {
      name: 'String Functions',
      code: `text = "hello world"
upper = string.upper(text)
print(upper)`,
    },
    {
      name: 'Math Functions',
      code: `roll = math.random(1, 6)
print("Dice roll:", roll)`,
    },
    {
      name: 'Comparisons',
      code: `a = 10
b = 20
result = a < b
print("10 < 20:", result)`,
    },
  ];
</script>

<div class="lua-console">
  <div class="console-header">
    <h3>Lua Console</h3>
    <div class="header-actions">
      <button class="btn btn-sm btn-secondary" onclick={clearHistory}>
        Clear History
      </button>
      <button class="btn btn-sm btn-warning" onclick={resetEngine}>
        Reset Engine
      </button>
    </div>
  </div>

  <div class="console-body">
    <div class="console-sidebar">
      <div class="sidebar-section">
        <h4>Examples</h4>
        <div class="example-list">
          {#each examples as example}
            <button
              class="example-btn"
              onclick={() => loadExample(example.code)}
              title="Click to load example"
            >
              {example.name}
            </button>
          {/each}
        </div>
      </div>

      <div class="sidebar-section">
        <h4>Variables</h4>
        <div class="variables-list">
          {#each Object.entries(getVariables()) as [name, value]}
            <div class="variable-item">
              <span class="var-name">{name}</span>
              <span class="var-value">{JSON.stringify(value)}</span>
            </div>
          {:else}
            <div class="empty-message">No variables set</div>
          {/each}
        </div>
      </div>

      <div class="sidebar-section">
        <h4>Standard Library</h4>
        <div class="stdlib-list">
          <div class="stdlib-category">
            <div class="category-name">Print</div>
            <code>print(...)</code>
          </div>
          <div class="stdlib-category">
            <div class="category-name">Math</div>
            <code>math.random(min, max)</code>
            <code>math.floor(x)</code>
            <code>math.ceil(x)</code>
            <code>math.abs(x)</code>
          </div>
          <div class="stdlib-category">
            <div class="category-name">String</div>
            <code>string.upper(s)</code>
            <code>string.lower(s)</code>
            <code>string.len(s)</code>
          </div>
        </div>
      </div>
    </div>

    <div class="console-main">
      <div class="console-output">
        {#if history.length === 0}
          <div class="welcome-message">
            <h4>Welcome to Lua Console</h4>
            <p>Enter Lua code below to execute it.</p>
            <p>Press Enter to execute, ↑/↓ for command history.</p>
            <p>Try the examples on the left to get started!</p>
          </div>
        {/if}

        {#each history as entry, index}
          <div class="history-entry">
            <div class="input-line">
              <span class="prompt">&gt;</span>
              <pre class="code-input">{entry.input}</pre>
            </div>

            {#if entry.result.output.length > 0}
              <div class="output-section">
                {#each entry.result.output as line}
                  <div class="output-line">{line}</div>
                {/each}
              </div>
            {/if}

            {#if entry.result.errors.length > 0}
              <div class="error-section">
                {#each entry.result.errors as error}
                  <div class="error-line">❌ {error}</div>
                {/each}
              </div>
            {/if}

            {#if entry.result.success && entry.result.output.length === 0 && entry.result.errors.length === 0}
              <div class="success-line">✓ Executed successfully</div>
            {/if}
          </div>
        {/each}
      </div>

      <div class="console-input">
        <span class="prompt">&gt;</span>
        <textarea
          bind:value={input}
          onkeydown={handleKeyDown}
          placeholder="Enter Lua code... (Press Enter to execute, Shift+Enter for new line)"
          rows="3"
        ></textarea>
        <button class="execute-btn" onclick={executeCode} disabled={!input.trim()}>
          Execute
        </button>
      </div>
    </div>
  </div>
</div>

<style>
  .lua-console {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-primary, white);
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 8px;
    overflow: hidden;
  }

  .console-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.5rem;
    background: var(--bg-secondary, #f8f8f8);
    border-bottom: 1px solid var(--border-color, #e0e0e0);
  }

  .console-header h3 {
    margin: 0;
    font-size: 1.125rem;
    color: var(--text-primary, #333);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .console-body {
    display: flex;
    flex: 1;
    overflow: hidden;
  }

  .console-sidebar {
    width: 250px;
    background: var(--bg-tertiary, #f0f0f0);
    border-right: 1px solid var(--border-color, #e0e0e0);
    overflow-y: auto;
    padding: 1rem;
  }

  .sidebar-section {
    margin-bottom: 1.5rem;
  }

  .sidebar-section h4 {
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
    color: var(--text-secondary, #666);
    text-transform: uppercase;
    font-weight: 600;
  }

  .example-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .example-btn {
    padding: 0.5rem 0.75rem;
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    text-align: left;
    cursor: pointer;
    font-size: 0.875rem;
    color: var(--text-primary, #333);
    transition: all 0.2s;
  }

  .example-btn:hover {
    background: var(--primary-color-light, #e3f2fd);
    border-color: var(--primary-color, #007bff);
  }

  .variables-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .variable-item {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem;
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    font-size: 0.8125rem;
  }

  .var-name {
    font-weight: 600;
    color: var(--primary-color, #007bff);
  }

  .var-value {
    color: var(--text-secondary, #666);
    font-family: 'Monaco', 'Menlo', monospace;
  }

  .empty-message {
    padding: 0.75rem;
    text-align: center;
    font-size: 0.875rem;
    color: var(--text-tertiary, #999);
    font-style: italic;
  }

  .stdlib-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .stdlib-category {
    background: white;
    border: 1px solid var(--border-color, #e0e0e0);
    border-radius: 4px;
    padding: 0.5rem;
  }

  .category-name {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-secondary, #666);
    margin-bottom: 0.375rem;
  }

  .stdlib-category code {
    display: block;
    padding: 0.25rem 0.375rem;
    background: var(--bg-code, #f5f5f5);
    border-radius: 2px;
    font-size: 0.75rem;
    margin-top: 0.25rem;
    color: var(--text-primary, #333);
  }

  .console-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .console-output {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
    background: var(--bg-console, #1e1e1e);
    color: var(--text-console, #d4d4d4);
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .welcome-message {
    padding: 2rem;
    text-align: center;
    color: var(--text-console-muted, #858585);
  }

  .welcome-message h4 {
    margin: 0 0 1rem;
    color: var(--text-console, #d4d4d4);
  }

  .welcome-message p {
    margin: 0.5rem 0;
  }

  .history-entry {
    margin-bottom: 1rem;
  }

  .input-line {
    display: flex;
    gap: 0.5rem;
  }

  .prompt {
    color: var(--accent-color, #4ec9b0);
    user-select: none;
  }

  .code-input {
    flex: 1;
    margin: 0;
    color: var(--text-console, #d4d4d4);
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .output-section {
    margin-left: 1.5rem;
    margin-top: 0.25rem;
  }

  .output-line {
    color: var(--success-color, #4ec9b0);
  }

  .error-section {
    margin-left: 1.5rem;
    margin-top: 0.25rem;
  }

  .error-line {
    color: var(--danger-color, #f48771);
  }

  .success-line {
    margin-left: 1.5rem;
    margin-top: 0.25rem;
    color: var(--text-console-muted, #858585);
    font-style: italic;
  }

  .console-input {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--bg-console, #1e1e1e);
    border-top: 1px solid var(--border-color-dark, #333);
  }

  .console-input .prompt {
    padding-top: 0.5rem;
  }

  .console-input textarea {
    flex: 1;
    padding: 0.5rem;
    background: var(--bg-console-input, #2d2d2d);
    border: 1px solid var(--border-color-dark, #3e3e3e);
    border-radius: 4px;
    color: var(--text-console, #d4d4d4);
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    font-size: 0.875rem;
    resize: vertical;
    min-height: 60px;
  }

  .console-input textarea:focus {
    outline: none;
    border-color: var(--primary-color, #007bff);
  }

  .console-input textarea::placeholder {
    color: var(--text-console-muted, #858585);
  }

  .execute-btn {
    padding: 0.5rem 1rem;
    background: var(--primary-color, #007bff);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
    transition: all 0.2s;
  }

  .execute-btn:hover:not(:disabled) {
    background: var(--primary-color-dark, #0056b3);
  }

  .execute-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn {
    padding: 0.375rem 0.75rem;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-sm {
    padding: 0.25rem 0.625rem;
    font-size: 0.8125rem;
  }

  .btn-secondary {
    background: var(--bg-tertiary, #f0f0f0);
    color: var(--text-primary, #333);
    border-color: var(--border-color, #e0e0e0);
  }

  .btn-secondary:hover {
    background: var(--bg-hover, #e8e8e8);
  }

  .btn-warning {
    background: var(--warning-color, #ffc107);
    color: var(--text-dark, #000);
  }

  .btn-warning:hover {
    background: var(--warning-color-dark, #e0a800);
  }
</style>
