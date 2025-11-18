<script lang="ts">
  /**
   * VisualConditionBuilder - Build conditional logic visually
   *
   * Creates visual conditions for passage choices and script logic.
   * Generates Whisker {{if}} syntax or Lua code.
   */
  import { nanoid } from 'nanoid';
  import { currentStory } from '../../stores/storyStateStore';
  import { Variable } from '@writewhisker/core-ts';

  // Props
  let {
    onConditionChange,
    initialCondition = '',
    outputFormat = 'whisker'
  }: {
    onConditionChange?: (condition: string) => void;
    initialCondition?: string;
    outputFormat?: 'whisker' | 'lua';
  } = $props();

  type ComparisonOperator = '==' | '!=' | '>' | '<' | '>=' | '<=';
  type LogicalOperator = 'AND' | 'OR';

  interface ConditionRule {
    id: string;
    variable: string;
    operator: ComparisonOperator;
    value: string;
    valueType: 'string' | 'number' | 'boolean' | 'variable';
  }

  interface ConditionGroup {
    id: string;
    rules: ConditionRule[];
    combinator: LogicalOperator;
  }

  // State
  let groups = $state<ConditionGroup[]>([
    {
      id: nanoid(),
      rules: [{
        id: nanoid(),
        variable: '',
        operator: '==',
        value: '',
        valueType: 'string'
      }],
      combinator: 'AND'
    }
  ]);
  let groupCombinator = $state<LogicalOperator>('AND');
  let showAdvanced = $state(false);

  // Available variables from story
  let availableVariables = $derived<Variable[]>(
    $currentStory ? Array.from($currentStory.variables.values()) : []
  );

  // Generate condition string
  let generatedCondition = $derived(generateConditionString());

  // Notify parent of changes
  $effect(() => {
    if (onConditionChange) {
      onConditionChange(generatedCondition);
    }
  });

  function generateConditionString(): string {
    if (groups.length === 0 || groups.every(g => g.rules.length === 0)) {
      return '';
    }

    const groupExpressions = groups.map(group => {
      const ruleExpressions = group.rules
        .filter(rule => rule.variable && rule.value !== '')
        .map(rule => {
          const varName = rule.variable;
          let value = rule.value;

          // Format value based on type
          if (rule.valueType === 'string') {
            value = `"${value}"`;
          } else if (rule.valueType === 'variable') {
            // Reference another variable
            value = outputFormat === 'whisker' ? `{{${value}}}` : value;
          }

          const varRef = outputFormat === 'whisker' ? `{{${varName}}}` : varName;

          return `${varRef} ${rule.operator} ${value}`;
        });

      if (ruleExpressions.length === 0) return '';
      if (ruleExpressions.length === 1) return ruleExpressions[0];

      const combinator = group.combinator === 'AND' ? ' and ' : ' or ';
      return `(${ruleExpressions.join(combinator)})`;
    }).filter(expr => expr !== '');

    if (groupExpressions.length === 0) return '';
    if (groupExpressions.length === 1) return groupExpressions[0];

    const combinator = groupCombinator === 'AND' ? ' and ' : ' or ';
    return groupExpressions.join(combinator);
  }

  function addGroup() {
    groups.push({
      id: nanoid(),
      rules: [{
        id: nanoid(),
        variable: '',
        operator: '==',
        value: '',
        valueType: 'string'
      }],
      combinator: 'AND'
    });
    groups = [...groups];
  }

  function removeGroup(groupId: string) {
    groups = groups.filter(g => g.id !== groupId);
  }

  function addRule(groupId: string) {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.rules.push({
        id: nanoid(),
        variable: '',
        operator: '==',
        value: '',
        valueType: 'string'
      });
      groups = [...groups];
    }
  }

  function removeRule(groupId: string, ruleId: string) {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      group.rules = group.rules.filter(r => r.id !== ruleId);
      groups = [...groups];
    }
  }

  function updateRule(groupId: string, ruleId: string, updates: Partial<ConditionRule>) {
    const group = groups.find(g => g.id === groupId);
    if (group) {
      const rule = group.rules.find(r => r.id === ruleId);
      if (rule) {
        Object.assign(rule, updates);

        // Auto-detect value type when variable changes
        if (updates.variable && $currentStory) {
          const variable = $currentStory.variables.get(updates.variable);
          if (variable) {
            if (variable.type === 'number') {
              rule.valueType = 'number';
            } else if (variable.type === 'boolean') {
              rule.valueType = 'boolean';
              rule.value = 'true';
            } else {
              rule.valueType = 'string';
            }
          }
        }

        groups = [...groups];
      }
    }
  }

  function clear() {
    groups = [{
      id: nanoid(),
      rules: [{
        id: nanoid(),
        variable: '',
        operator: '==',
        value: '',
        valueType: 'string'
      }],
      combinator: 'AND'
    }];
  }

  function loadFromString(conditionStr: string) {
    // Basic parsing - could be enhanced
    // For now, just clear and let user rebuild
    console.log('Load from string:', conditionStr);
    // TODO: Implement parser for existing conditions
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(generatedCondition);
  }
</script>

<div class="visual-condition-builder">
  <div class="builder-header">
    <h4>Visual Condition Builder</h4>
    <div class="header-actions">
      <button
        class="btn-toggle"
        onclick={() => showAdvanced = !showAdvanced}
        title="Toggle advanced options"
      >
        {showAdvanced ? '▲' : '▼'} Advanced
      </button>
      <button class="btn-action" onclick={clear} title="Clear all conditions">
        🗑️ Clear
      </button>
    </div>
  </div>

  {#if showAdvanced}
    <div class="advanced-options">
      <div class="option-group">
        <label for="output-format">Output Format:</label>
        <select id="output-format" bind:value={outputFormat}>
          <option value="whisker">Whisker ({'{{var}}'})</option>
          <option value="lua">Lua</option>
        </select>
      </div>

      {#if groups.length > 1}
        <div class="option-group">
          <label for="group-combinator">Combine Groups With:</label>
          <select id="group-combinator" bind:value={groupCombinator}>
            <option value="AND">AND (all must match)</option>
            <option value="OR">OR (any can match)</option>
          </select>
        </div>
      {/if}
    </div>
  {/if}

  <div class="condition-groups">
    {#each groups as group, groupIndex (group.id)}
      <div class="condition-group">
        <div class="group-header">
          <span class="group-label">Group {groupIndex + 1}</span>
          {#if group.rules.length > 1}
            <select
              class="combinator-select"
              bind:value={group.combinator}
              title="How to combine rules in this group"
            >
              <option value="AND">AND</option>
              <option value="OR">OR</option>
            </select>
          {/if}
          {#if groups.length > 1}
            <button
              class="btn-remove-group"
              onclick={() => removeGroup(group.id)}
              title="Remove group"
            >
              ×
            </button>
          {/if}
        </div>

        <div class="rules">
          {#each group.rules as rule, ruleIndex (rule.id)}
            <div class="rule">
              <span class="rule-number">{ruleIndex + 1}.</span>

              <!-- Variable selector -->
              <select
                class="rule-select variable-select"
                value={rule.variable}
                onchange={(e) => {
                  const target = e.target as HTMLSelectElement;
                  updateRule(group.id, rule.id, { variable: target.value });
                }}
              >
                <option value="">Choose variable...</option>
                {#each availableVariables as variable}
                  <option value={variable.name}>{variable.name} ({variable.type})</option>
                {/each}
              </select>

              <!-- Operator selector -->
              <select
                class="rule-select operator-select"
                value={rule.operator}
                onchange={(e) => {
                  const target = e.target as HTMLSelectElement;
                  updateRule(group.id, rule.id, { operator: target.value as ComparisonOperator });
                }}
              >
                <option value="==">equals (==)</option>
                <option value="!=">not equals (!=)</option>
                <option value=">">greater than (&gt;)</option>
                <option value="<">less than (&lt;)</option>
                <option value=">=">greater or equal (&gt;=)</option>
                <option value="<=">less or equal (&lt;=)</option>
              </select>

              <!-- Value input -->
              {#if rule.valueType === 'boolean'}
                <select
                  class="rule-select value-select"
                  value={rule.value}
                  onchange={(e) => {
                    const target = e.target as HTMLSelectElement;
                    updateRule(group.id, rule.id, { value: target.value });
                  }}
                >
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              {:else}
                <input
                  type={rule.valueType === 'number' ? 'number' : 'text'}
                  class="rule-input"
                  value={rule.value}
                  oninput={(e) => {
                    const target = e.target as HTMLInputElement;
                    updateRule(group.id, rule.id, { value: target.value });
                  }}
                  placeholder={rule.valueType === 'variable' ? 'Variable name' : 'Value'}
                />
              {/if}

              <!-- Value type selector -->
              <select
                class="rule-select type-select"
                value={rule.valueType}
                onchange={(e) => {
                  const target = e.target as HTMLSelectElement;
                  updateRule(group.id, rule.id, { valueType: target.value as any });
                }}
                title="Value type"
              >
                <option value="string">Text</option>
                <option value="number">#</option>
                <option value="boolean">Bool</option>
                <option value="variable">Var</option>
              </select>

              <!-- Remove rule button -->
              {#if group.rules.length > 1}
                <button
                  class="btn-remove-rule"
                  onclick={() => removeRule(group.id, rule.id)}
                  title="Remove rule"
                >
                  ×
                </button>
              {/if}
            </div>

            {#if ruleIndex < group.rules.length - 1}
              <div class="rule-combinator">{group.combinator}</div>
            {/if}
          {/each}
        </div>

        <button class="btn-add-rule" onclick={() => addRule(group.id)}>
          + Add Rule
        </button>
      </div>

      {#if groupIndex < groups.length - 1}
        <div class="group-combinator">{groupCombinator}</div>
      {/if}
    {/each}
  </div>

  <button class="btn-add-group" onclick={addGroup}>
    + Add Group
  </button>

  <div class="output-section">
    <div class="output-header">
      <span class="output-label">Generated Condition:</span>
      <button
        class="btn-copy"
        onclick={copyToClipboard}
        disabled={!generatedCondition}
        title="Copy to clipboard"
      >
        📋 Copy
      </button>
    </div>
    <div class="output-display">
      <code>{generatedCondition || '(empty)'}</code>
    </div>
  </div>
</div>

<style>
  .visual-condition-builder {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-background, #f5f5f5);
    border-radius: 8px;
  }

  .builder-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid var(--color-border, #ddd);
  }

  .builder-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text, #333);
  }

  .header-actions {
    display: flex;
    gap: 0.5rem;
  }

  .btn-toggle,
  .btn-action {
    padding: 0.375rem 0.75rem;
    background: var(--color-surface, white);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-toggle:hover,
  .btn-action:hover {
    background: var(--color-primary-light, #e3f2fd);
    border-color: var(--color-primary, #1976d2);
  }

  .advanced-options {
    display: flex;
    gap: 1rem;
    padding: 0.75rem;
    background: var(--color-surface, white);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-size: 0.875rem;
  }

  .option-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .option-group label {
    font-weight: 500;
    color: var(--color-text-secondary, #666);
  }

  .option-group select {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-size: 0.8125rem;
  }

  .condition-groups {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .condition-group {
    padding: 1rem;
    background: var(--color-surface, white);
    border: 2px solid var(--color-border, #ddd);
    border-radius: 8px;
  }

  .group-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border, #ddd);
  }

  .group-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--color-primary, #1976d2);
  }

  .combinator-select {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-size: 0.8125rem;
    font-weight: 600;
  }

  .btn-remove-group {
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--color-error, #d32f2f);
    font-size: 1.25rem;
    cursor: pointer;
    transition: color 0.2s;
  }

  .btn-remove-group:hover {
    color: var(--color-error-dark, #b71c1c);
  }

  .rules {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .rule {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: var(--color-background, #f5f5f5);
    border-radius: 4px;
  }

  .rule-number {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary, #666);
    min-width: 20px;
  }

  .rule-select,
  .rule-input {
    padding: 0.375rem 0.5rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-size: 0.875rem;
    background: white;
  }

  .variable-select {
    flex: 2;
    min-width: 120px;
  }

  .operator-select {
    flex: 1;
    min-width: 100px;
  }

  .value-select,
  .rule-input {
    flex: 1.5;
    min-width: 80px;
  }

  .type-select {
    flex: 0.5;
    min-width: 60px;
    font-size: 0.75rem;
  }

  .btn-remove-rule {
    width: 24px;
    height: 24px;
    padding: 0;
    background: transparent;
    border: none;
    color: var(--color-error, #d32f2f);
    font-size: 1.125rem;
    cursor: pointer;
    transition: color 0.2s;
  }

  .btn-remove-rule:hover {
    color: var(--color-error-dark, #b71c1c);
  }

  .rule-combinator {
    text-align: center;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-primary, #1976d2);
    padding: 0.25rem 0;
  }

  .btn-add-rule {
    margin-top: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-background, #f5f5f5);
    border: 1px dashed var(--color-border, #ddd);
    border-radius: 4px;
    color: var(--color-primary, #1976d2);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add-rule:hover {
    background: var(--color-primary-light, #e3f2fd);
    border-color: var(--color-primary, #1976d2);
  }

  .group-combinator {
    text-align: center;
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--color-primary, #1976d2);
    padding: 0.5rem 0;
    text-transform: uppercase;
  }

  .btn-add-group {
    padding: 0.75rem 1.5rem;
    background: var(--color-surface, white);
    border: 2px dashed var(--color-primary, #1976d2);
    border-radius: 8px;
    color: var(--color-primary, #1976d2);
    font-size: 0.9375rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add-group:hover {
    background: var(--color-primary-light, #e3f2fd);
  }

  .output-section {
    margin-top: 0.5rem;
    padding: 1rem;
    background: var(--color-surface, white);
    border: 2px solid var(--color-success, #4caf50);
    border-radius: 8px;
  }

  .output-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .output-label {
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--color-text, #333);
  }

  .btn-copy {
    padding: 0.375rem 0.75rem;
    background: var(--color-success, #4caf50);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-copy:hover:not(:disabled) {
    background: var(--color-success-dark, #388e3c);
  }

  .btn-copy:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .output-display {
    padding: 0.75rem;
    background: var(--color-background, #f5f5f5);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.875rem;
    line-height: 1.5;
    overflow-x: auto;
    min-height: 40px;
  }

  .output-display code {
    color: var(--color-success-dark, #2e7d32);
  }
</style>
