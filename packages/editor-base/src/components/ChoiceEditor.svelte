<script lang="ts">
  /**
   * ChoiceEditor - Visual editor for WLS 1.0 choices
   *
   * Allows editing choice properties with WLS 1.0 syntax:
   * - Choice type: once-only (+) or sticky (*)
   * - Choice text with variable interpolation
   * - Target passage (-> Target)
   * - Optional condition ({if cond})
   * - Optional action ({$ action})
   */
  import { nanoid } from 'nanoid';
  import { currentStory } from '../stores/storyStateStore';
  import type { ChoiceType, Passage } from '@writewhisker/core-ts';

  interface ChoiceData {
    id: string;
    text: string;
    target: string;
    choiceType: ChoiceType;
    condition?: string;
    action?: string;
  }

  // Props
  let {
    choices = [],
    onChoicesChange,
    availablePassages = []
  }: {
    choices?: ChoiceData[];
    onChoicesChange?: (choices: ChoiceData[]) => void;
    availablePassages?: string[];
  } = $props();

  let localChoices = $state<ChoiceData[]>([...choices]);
  let expandedChoice = $state<string | null>(null);

  // Get passages from story if not provided
  let passages = $derived(
    availablePassages.length > 0
      ? availablePassages
      : $currentStory
        ? Array.from($currentStory.passages.values() as Iterable<Passage>).map(p => p.title)
        : []
  );

  // Notify parent of changes
  $effect(() => {
    if (onChoicesChange) {
      onChoicesChange(localChoices);
    }
  });

  function addChoice() {
    const newChoice: ChoiceData = {
      id: nanoid(),
      text: '',
      target: '',
      choiceType: 'once'
    };
    localChoices = [...localChoices, newChoice];
    expandedChoice = newChoice.id;
  }

  function removeChoice(id: string) {
    localChoices = localChoices.filter(c => c.id !== id);
  }

  function updateChoice(id: string, updates: Partial<ChoiceData>) {
    localChoices = localChoices.map(c =>
      c.id === id ? { ...c, ...updates } : c
    );
  }

  function moveChoice(id: string, direction: 'up' | 'down') {
    const index = localChoices.findIndex(c => c.id === id);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localChoices.length) return;

    const newChoices = [...localChoices];
    [newChoices[index], newChoices[newIndex]] = [newChoices[newIndex], newChoices[index]];
    localChoices = newChoices;
  }

  function toggleExpanded(id: string) {
    expandedChoice = expandedChoice === id ? null : id;
  }

  function generateWlsSyntax(choice: ChoiceData): string {
    const marker = choice.choiceType === 'sticky' ? '*' : '+';
    let syntax = marker;

    // Add condition if present
    if (choice.condition) {
      syntax += ` {if ${choice.condition}}`;
    }

    // Add text in brackets
    syntax += ` [${choice.text}]`;

    // Add action if present
    if (choice.action) {
      syntax += ` {$ ${choice.action}}`;
    }

    // Add target
    if (choice.target) {
      syntax += ` -> ${choice.target}`;
    }

    return syntax;
  }

  function duplicateChoice(id: string) {
    const choice = localChoices.find(c => c.id === id);
    if (!choice) return;

    const newChoice: ChoiceData = {
      ...choice,
      id: nanoid(),
      text: choice.text + ' (copy)'
    };
    const index = localChoices.findIndex(c => c.id === id);
    localChoices = [
      ...localChoices.slice(0, index + 1),
      newChoice,
      ...localChoices.slice(index + 1)
    ];
  }
</script>

<div class="choice-editor">
  <div class="editor-header">
    <h4>Choices</h4>
    <button class="btn-add" onclick={addChoice}>
      + Add Choice
    </button>
  </div>

  {#if localChoices.length === 0}
    <div class="empty-state">
      <div class="empty-icon">🔀</div>
      <div>No choices yet</div>
      <div class="empty-hint">Add choices to let readers navigate your story</div>
    </div>
  {:else}
    <div class="choices-list">
      {#each localChoices as choice, index (choice.id)}
        <div class="choice-item" class:expanded={expandedChoice === choice.id}>
          <!-- Collapsed view -->
          <div class="choice-header" onclick={() => toggleExpanded(choice.id)}>
            <div class="choice-marker" class:sticky={choice.choiceType === 'sticky'}>
              {choice.choiceType === 'sticky' ? '*' : '+'}
            </div>
            <div class="choice-summary">
              <span class="choice-text">{choice.text || '(empty)'}</span>
              {#if choice.target}
                <span class="choice-arrow">→</span>
                <span class="choice-target">{choice.target}</span>
              {/if}
            </div>
            <div class="choice-actions">
              <button
                class="btn-icon"
                onclick={(e) => { e.stopPropagation(); moveChoice(choice.id, 'up'); }}
                disabled={index === 0}
                title="Move up"
              >↑</button>
              <button
                class="btn-icon"
                onclick={(e) => { e.stopPropagation(); moveChoice(choice.id, 'down'); }}
                disabled={index === localChoices.length - 1}
                title="Move down"
              >↓</button>
              <button
                class="btn-icon"
                onclick={(e) => { e.stopPropagation(); duplicateChoice(choice.id); }}
                title="Duplicate"
              >📋</button>
              <button
                class="btn-icon btn-delete"
                onclick={(e) => { e.stopPropagation(); removeChoice(choice.id); }}
                title="Delete"
              >🗑</button>
            </div>
          </div>

          <!-- Expanded view -->
          {#if expandedChoice === choice.id}
            <div class="choice-details">
              <!-- Choice Type -->
              <div class="field-row">
                <label for="type-{choice.id}">Type</label>
                <div class="type-buttons">
                  <button
                    class="type-btn"
                    class:active={choice.choiceType === 'once'}
                    onclick={() => updateChoice(choice.id, { choiceType: 'once' })}
                    title="Once-only: disappears after selection"
                  >
                    <span class="type-marker">+</span> Once-only
                  </button>
                  <button
                    class="type-btn"
                    class:active={choice.choiceType === 'sticky'}
                    onclick={() => updateChoice(choice.id, { choiceType: 'sticky' })}
                    title="Sticky: remains available after selection"
                  >
                    <span class="type-marker">*</span> Sticky
                  </button>
                </div>
              </div>

              <!-- Choice Text -->
              <div class="field-row">
                <label for="text-{choice.id}">Text</label>
                <input
                  id="text-{choice.id}"
                  type="text"
                  value={choice.text}
                  oninput={(e) => updateChoice(choice.id, { text: (e.target as HTMLInputElement).value })}
                  placeholder="What does the reader see?"
                />
              </div>

              <!-- Target Passage -->
              <div class="field-row">
                <label for="target-{choice.id}">Target</label>
                <div class="target-row">
                  <span class="arrow-icon">→</span>
                  <select
                    id="target-{choice.id}"
                    value={choice.target}
                    onchange={(e) => updateChoice(choice.id, { target: (e.target as HTMLSelectElement).value })}
                  >
                    <option value="">Select passage...</option>
                    <option value="END">END (end story)</option>
                    <option value="BACK">BACK (go back)</option>
                    <option value="RESTART">RESTART (restart story)</option>
                    <optgroup label="Passages">
                      {#each passages as passage}
                        <option value={passage}>{passage}</option>
                      {/each}
                    </optgroup>
                  </select>
                </div>
              </div>

              <!-- Condition (optional) -->
              <div class="field-row">
                <label for="condition-{choice.id}">
                  Condition
                  <span class="optional">(optional)</span>
                </label>
                <div class="code-input-wrapper">
                  <span class="code-prefix">{'{if'}</span>
                  <input
                    id="condition-{choice.id}"
                    type="text"
                    value={choice.condition || ''}
                    oninput={(e) => updateChoice(choice.id, { condition: (e.target as HTMLInputElement).value || undefined })}
                    placeholder="$gold > 10"
                    class="code-input"
                  />
                  <span class="code-suffix">{'}'}</span>
                </div>
              </div>

              <!-- Action (optional) -->
              <div class="field-row">
                <label for="action-{choice.id}">
                  Action
                  <span class="optional">(optional)</span>
                </label>
                <div class="code-input-wrapper">
                  <span class="code-prefix">{'{$'}</span>
                  <input
                    id="action-{choice.id}"
                    type="text"
                    value={choice.action || ''}
                    oninput={(e) => updateChoice(choice.id, { action: (e.target as HTMLInputElement).value || undefined })}
                    placeholder="$gold = $gold - 10"
                    class="code-input"
                  />
                  <span class="code-suffix">{'}'}</span>
                </div>
              </div>

              <!-- Generated WLS Syntax -->
              <div class="field-row syntax-preview">
                <label>WLS 1.0 Syntax</label>
                <code class="wls-syntax">{generateWlsSyntax(choice)}</code>
              </div>
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .choice-editor {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-background, #f5f5f5);
    border-radius: 8px;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 0.75rem;
    border-bottom: 2px solid var(--color-border, #ddd);
  }

  .editor-header h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text, #333);
  }

  .btn-add {
    padding: 0.5rem 1rem;
    background: var(--color-primary, #1976d2);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .btn-add:hover {
    background: var(--color-primary-dark, #1565c0);
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--color-text-secondary, #666);
  }

  .empty-icon {
    font-size: 2rem;
    margin-bottom: 0.5rem;
  }

  .empty-hint {
    font-size: 0.75rem;
    margin-top: 0.25rem;
    opacity: 0.7;
  }

  .choices-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .choice-item {
    background: var(--color-surface, white);
    border: 2px solid var(--color-border, #ddd);
    border-radius: 8px;
    overflow: hidden;
    transition: border-color 0.2s;
  }

  .choice-item.expanded {
    border-color: var(--color-primary, #1976d2);
  }

  .choice-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .choice-header:hover {
    background: var(--color-background, #f5f5f5);
  }

  .choice-marker {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: monospace;
    font-size: 1rem;
    font-weight: bold;
    background: var(--color-primary-light, #e3f2fd);
    color: var(--color-primary, #1976d2);
    border-radius: 4px;
  }

  .choice-marker.sticky {
    background: var(--color-warning-light, #fff3e0);
    color: var(--color-warning, #f57c00);
  }

  .choice-summary {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  .choice-text {
    font-size: 0.875rem;
    color: var(--color-text, #333);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .choice-arrow {
    color: var(--color-text-secondary, #666);
    flex-shrink: 0;
  }

  .choice-target {
    font-size: 0.75rem;
    color: var(--color-primary, #1976d2);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .choice-actions {
    display: flex;
    gap: 0.25rem;
  }

  .btn-icon {
    width: 28px;
    height: 28px;
    padding: 0;
    background: transparent;
    border: 1px solid transparent;
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-icon:hover:not(:disabled) {
    background: var(--color-background, #f5f5f5);
    border-color: var(--color-border, #ddd);
  }

  .btn-icon:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .btn-delete:hover:not(:disabled) {
    background: var(--color-error-light, #ffebee);
    border-color: var(--color-error, #d32f2f);
  }

  .choice-details {
    padding: 1rem;
    border-top: 1px solid var(--color-border, #ddd);
    background: var(--color-background, #f5f5f5);
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .field-row {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .field-row label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-secondary, #666);
    text-transform: uppercase;
  }

  .optional {
    font-weight: normal;
    text-transform: none;
    opacity: 0.7;
  }

  .field-row input,
  .field-row select {
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-size: 0.875rem;
    background: white;
  }

  .field-row input:focus,
  .field-row select:focus {
    outline: none;
    border-color: var(--color-primary, #1976d2);
    box-shadow: 0 0 0 2px var(--color-primary-light, #e3f2fd);
  }

  .type-buttons {
    display: flex;
    gap: 0.5rem;
  }

  .type-btn {
    flex: 1;
    padding: 0.5rem 1rem;
    background: white;
    border: 2px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .type-btn:hover {
    border-color: var(--color-primary, #1976d2);
  }

  .type-btn.active {
    background: var(--color-primary-light, #e3f2fd);
    border-color: var(--color-primary, #1976d2);
    color: var(--color-primary, #1976d2);
  }

  .type-marker {
    font-family: monospace;
    font-weight: bold;
    margin-right: 0.25rem;
  }

  .target-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .arrow-icon {
    font-size: 1rem;
    color: var(--color-text-secondary, #666);
  }

  .target-row select {
    flex: 1;
  }

  .code-input-wrapper {
    display: flex;
    align-items: center;
    background: white;
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    overflow: hidden;
  }

  .code-prefix,
  .code-suffix {
    padding: 0.5rem 0.5rem;
    background: var(--color-background, #f5f5f5);
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--color-primary, #1976d2);
    white-space: nowrap;
  }

  .code-input {
    flex: 1;
    border: none !important;
    border-radius: 0 !important;
    font-family: monospace;
  }

  .code-input:focus {
    box-shadow: none !important;
  }

  .syntax-preview {
    margin-top: 0.5rem;
    padding-top: 1rem;
    border-top: 1px dashed var(--color-border, #ddd);
  }

  .wls-syntax {
    display: block;
    padding: 0.75rem;
    background: var(--color-surface, white);
    border: 1px solid var(--color-border, #ddd);
    border-radius: 4px;
    font-family: monospace;
    font-size: 0.875rem;
    color: var(--color-success-dark, #2e7d32);
    word-break: break-all;
  }
</style>
